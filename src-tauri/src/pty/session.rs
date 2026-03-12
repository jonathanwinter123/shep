use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
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
    child: Box<dyn portable_pty::Child + Send + Sync>,
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

        let mut cmd = CommandBuilder::new("/bin/zsh");
        cmd.arg("-l");
        cmd.arg("-c");
        cmd.arg(format!("source ~/.zshrc 2>/dev/null; {command}"));
        cmd.cwd(cwd);

        for (key, val) in &env {
            cmd.env(key, val);
        }
        cmd.env("TERM", "xterm-256color");
        cmd.env("TERM_PROGRAM", "iTerm.app"); // Fix for CLI tools (like gemini-cli) assuming solid backgrounds
        cmd.env("COLORTERM", "truecolor"); // Enable 24-bit color support

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn command: {e}"))?;

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
            let _ = channel.send(PtyOutput::Exit { code: 0 });
        });

        Ok(PtySession {
            master: pair.master,
            writer,
            alive,
            child,
        })
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
        self.child
            .kill()
            .map_err(|e| format!("Failed to kill PTY: {e}"))
    }

    pub fn is_alive(&self) -> bool {
        self.alive.load(Ordering::SeqCst)
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
