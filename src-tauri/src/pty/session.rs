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
        cmd.arg(command);
        cmd.cwd(cwd);

        for (key, val) in &env {
            cmd.env(key, val);
        }
        cmd.env("TERM", "xterm-256color");

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
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let text = String::from_utf8_lossy(&buf[..n]).to_string();
                        if channel.send(PtyOutput::Data(text)).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
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
