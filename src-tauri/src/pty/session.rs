use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::ipc::Channel;

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data")]
pub enum PtyOutput {
    #[serde(rename = "data")]
    Data(String),
    #[serde(rename = "exit")]
    Exit { code: i32 },
}

pub struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    alive: Arc<AtomicBool>,
    killer: Box<dyn ChildKiller + Send + Sync>,
    child_pid: Option<u32>,
}

fn decode_utf8_chunks(pending: &mut Vec<u8>, incoming: &[u8]) -> Vec<String> {
    pending.extend_from_slice(incoming);

    let mut output = Vec::new();
    let mut cursor = 0;

    while cursor < pending.len() {
        match std::str::from_utf8(&pending[cursor..]) {
            Ok(text) => {
                if !text.is_empty() {
                    output.push(text.to_string());
                }
                pending.clear();
                return output;
            }
            Err(err) => {
                let valid_up_to = err.valid_up_to();
                if valid_up_to > 0 {
                    let valid = &pending[cursor..cursor + valid_up_to];
                    output.push(String::from_utf8_lossy(valid).to_string());
                    cursor += valid_up_to;
                }

                match err.error_len() {
                    Some(error_len) => {
                        let invalid_end = cursor + error_len;
                        let invalid = &pending[cursor..invalid_end];
                        output.push(String::from_utf8_lossy(invalid).to_string());
                        cursor = invalid_end;
                    }
                    None => {
                        if cursor > 0 {
                            pending.drain(..cursor);
                        }
                        return output;
                    }
                }
            }
        }
    }

    pending.clear();
    output
}

/// Find all descendant PIDs of the given root PID by walking the process tree.
/// Uses `pgrep -P <pid>` to find direct children, then recurses.
fn get_all_descendants(root_pid: i32) -> Vec<i32> {
    let mut descendants = Vec::new();
    let mut queue = vec![root_pid];

    while let Some(parent) = queue.pop() {
        if let Ok(output) = Command::new("pgrep").arg("-P").arg(parent.to_string()).output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if let Ok(pid) = line.trim().parse::<i32>() {
                    if !descendants.contains(&pid) {
                        descendants.push(pid);
                        queue.push(pid);
                    }
                }
            }
        }
    }

    descendants
}

impl PtySession {
    pub fn spawn(
        command: &str,
        cwd: &str,
        env: HashMap<String, String>,
        cols: u16,
        rows: u16,
        channel: Channel<PtyOutput>,
    ) -> Result<Self, String> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {e}"))?;

        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        let mut cmd = CommandBuilder::new(&shell);
        cmd.arg("-l");
        cmd.arg("-i");
        cmd.arg("-c");
        cmd.arg(command);
        cmd.cwd(cwd);

        for (key, val) in &env {
            cmd.env(key, val);
        }
        cmd.env("TERM", "xterm-256color");
        cmd.env("TERM_PROGRAM", "iTerm.app"); // Fix for CLI tools (like gemini-cli) assuming solid backgrounds
        cmd.env("COLORTERM", "truecolor"); // Enable 24-bit color support

        let mut child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn command: {e}"))?;
        let child_pid = child.process_id();
        let killer = child.clone_killer();

        // Drop slave — we only need the master side
        drop(pair.slave);

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get PTY writer: {e}"))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to get PTY reader: {e}"))?;

        let alive = Arc::new(AtomicBool::new(true));
        let alive_clone = alive.clone();

        // Spawn reader thread
        thread::spawn(move || {
            let mut buf = [0u8; 4096];
            let mut pending = Vec::new();
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        for text in decode_utf8_chunks(&mut pending, &buf[..n]) {
                            if channel.send(PtyOutput::Data(text)).is_err() {
                                return;
                            }
                        }
                    }
                    Err(_) => break,
                }
            }

            if !pending.is_empty() {
                let text = String::from_utf8_lossy(&pending).to_string();
                let _ = channel.send(PtyOutput::Data(text));
            }

            alive_clone.store(false, Ordering::SeqCst);
            let exit_code = child
                .wait()
                .map(|status| status.exit_code() as i32)
                .unwrap_or(1);
            let _ = channel.send(PtyOutput::Exit { code: exit_code });
        });

        Ok(PtySession {
            master: pair.master,
            writer,
            alive,
            killer,
            child_pid,
        })
    }

    pub fn pid(&self) -> Option<u32> {
        self.child_pid
    }

    pub fn write(&mut self, data: &[u8]) -> Result<(), String> {
        self.writer
            .write_all(data)
            .map_err(|e| format!("Failed to write to PTY: {e}"))
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        self.master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize PTY: {e}"))
    }

    pub fn kill(&mut self) -> Result<(), String> {
        self.alive.store(false, Ordering::SeqCst);

        if let Some(pid) = self.child_pid {
            let pid = pid as i32;

            // Collect all descendant PIDs before killing anything, since
            // dying parents cause reparenting which scrambles the tree.
            let descendants = get_all_descendants(pid);

            unsafe {
                // Signal the process group (covers children that stayed in group)
                if libc::kill(pid, 0) == 0 {
                    libc::killpg(pid, libc::SIGHUP);
                    libc::killpg(pid, libc::SIGTERM);
                }

                // Also signal descendants that escaped to their own process
                // group or session (e.g. opencode, which calls setsid).
                for &child in &descendants {
                    if libc::kill(child, 0) == 0 {
                        libc::kill(child, libc::SIGTERM);
                    }
                }
            }

            // Give processes a moment to exit gracefully, then SIGKILL survivors.
            thread::sleep(Duration::from_millis(100));

            unsafe {
                for &child in &descendants {
                    if libc::kill(child, 0) == 0 {
                        libc::kill(child, libc::SIGKILL);
                    }
                }
                if libc::kill(pid, 0) == 0 {
                    libc::kill(pid, libc::SIGKILL);
                }
            }
        }

        self.killer
            .kill()
            .map_err(|e| format!("Failed to kill PTY: {e}"))
    }

}

#[cfg(test)]
mod tests {
    use super::decode_utf8_chunks;

    #[test]
    fn preserves_split_utf8_sequences() {
        let mut pending = Vec::new();

        let part_one = decode_utf8_chunks(&mut pending, &[0xE2, 0x9C]);
        assert!(part_one.is_empty());
        assert_eq!(pending, vec![0xE2, 0x9C]);

        let part_two = decode_utf8_chunks(&mut pending, &[0xA8]);
        assert_eq!(part_two, vec!["\u{2728}".to_string()]);
        assert!(pending.is_empty());
    }

    #[test]
    fn emits_valid_prefix_and_keeps_incomplete_suffix() {
        let mut pending = Vec::new();

        let output = decode_utf8_chunks(&mut pending, &[b'a', b'b', 0xE2, 0x9C]);
        assert_eq!(output, vec!["ab".to_string()]);
        assert_eq!(pending, vec![0xE2, 0x9C]);
    }

    #[test]
    fn replaces_invalid_utf8_without_dropping_following_text() {
        let mut pending = Vec::new();

        let output = decode_utf8_chunks(&mut pending, &[b'a', 0xFF, b'b']);
        assert_eq!(output, vec!["a".to_string(), "\u{FFFD}".to_string(), "b".to_string()]);
        assert!(pending.is_empty());
    }
}
