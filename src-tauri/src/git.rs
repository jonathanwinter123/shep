use std::process::Command;

#[derive(serde::Serialize, Clone)]
pub struct GitStatus {
    pub is_git_repo: bool,
    pub branch: String,
    pub dirty: bool,
    pub staged: u32,
    pub unstaged: u32,
    pub untracked: u32,
    pub ahead: u32,
    pub behind: u32,
}

impl Default for GitStatus {
    fn default() -> Self {
        Self {
            is_git_repo: false,
            branch: String::new(),
            dirty: false,
            staged: 0,
            unstaged: 0,
            untracked: 0,
            ahead: 0,
            behind: 0,
        }
    }
}

pub fn status(path: &str) -> GitStatus {
    let output = match Command::new("git")
        .args(["-C", path, "status", "--porcelain=v2", "--branch"])
        .output()
    {
        Ok(o) if o.status.success() => o,
        _ => return GitStatus::default(),
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut branch = String::new();
    let mut ahead: u32 = 0;
    let mut behind: u32 = 0;
    let mut staged: u32 = 0;
    let mut unstaged: u32 = 0;
    let mut untracked: u32 = 0;

    for line in stdout.lines() {
        if let Some(rest) = line.strip_prefix("# branch.head ") {
            branch = rest.to_string();
        } else if let Some(rest) = line.strip_prefix("# branch.ab ") {
            // Format: +N -M
            for token in rest.split_whitespace() {
                if let Some(n) = token.strip_prefix('+') {
                    ahead = n.parse().unwrap_or(0);
                } else if let Some(n) = token.strip_prefix('-') {
                    behind = n.parse().unwrap_or(0);
                }
            }
        } else if line.starts_with("1 ") || line.starts_with("2 ") {
            // Changed entry: XY columns at index 2..4
            let xy: Vec<u8> = line.as_bytes().get(2..4).unwrap_or(&[b'.', b'.']).to_vec();
            if xy[0] != b'.' {
                staged += 1;
            }
            if xy[1] != b'.' {
                unstaged += 1;
            }
        } else if line.starts_with("u ") {
            // Unmerged entry — count as both
            staged += 1;
            unstaged += 1;
        } else if line.starts_with("? ") {
            untracked += 1;
        }
    }

    let dirty = staged > 0 || unstaged > 0 || untracked > 0;

    GitStatus {
        is_git_repo: true,
        branch,
        dirty,
        staged,
        unstaged,
        untracked,
        ahead,
        behind,
    }
}

pub fn is_git_repo(path: &str) -> bool {
    Command::new("git")
        .args(["-C", path, "rev-parse", "--git-dir"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn current_branch(path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(["-C", path, "branch", "--show-current"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

pub fn list_branches(path: &str) -> Result<Vec<String>, String> {
    let output = Command::new("git")
        .args(["-C", path, "branch", "--format=%(refname:short)"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let branches = String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter(|l| !l.is_empty())
        .map(|l| l.to_string())
        .collect();

    Ok(branches)
}

pub fn create_worktree(
    repo_path: &str,
    worktree_path: &str,
    branch_name: &str,
) -> Result<(), String> {
    let output = Command::new("git")
        .args([
            "-C",
            repo_path,
            "worktree",
            "add",
            "-b",
            branch_name,
            worktree_path,
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

pub fn remove_worktree(repo_path: &str, worktree_path: &str) -> Result<(), String> {
    let output = Command::new("git")
        .args(["-C", repo_path, "worktree", "remove", worktree_path])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

// ── Changed files (porcelain v2 parsing) ────────────────────────────

#[derive(serde::Serialize, Clone)]
pub struct ChangedFile {
    pub path: String,
    pub status: String,
    pub area: String,
    pub old_path: Option<String>,
}

pub fn changed_files(path: &str) -> Result<Vec<ChangedFile>, String> {
    let output = Command::new("git")
        .args(["-C", path, "status", "--porcelain=v2", "-z"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut files = Vec::new();

    // -z uses NUL as delimiter; split on NUL
    let entries: Vec<&str> = stdout.split('\0').collect();
    let mut i = 0;

    while i < entries.len() {
        let entry = entries[i];
        if entry.is_empty() {
            i += 1;
            continue;
        }

        if entry.starts_with("1 ") {
            // Ordinary changed entry: 1 XY sub mH mI mW hH hI path
            let parts: Vec<&str> = entry.splitn(9, ' ').collect();
            if parts.len() >= 9 {
                let xy = parts[1].as_bytes();
                let file_path = parts[8].to_string();

                if xy[0] != b'.' {
                    files.push(ChangedFile {
                        path: file_path.clone(),
                        status: status_letter(xy[0]),
                        area: "staged".to_string(),
                        old_path: None,
                    });
                }
                if xy[1] != b'.' {
                    files.push(ChangedFile {
                        path: file_path,
                        status: status_letter(xy[1]),
                        area: "unstaged".to_string(),
                        old_path: None,
                    });
                }
            }
            i += 1;
        } else if entry.starts_with("2 ") {
            // Rename/copy entry: 2 XY sub mH mI mW hH hI Xscore path\0origPath
            let parts: Vec<&str> = entry.splitn(10, ' ').collect();
            if parts.len() >= 10 {
                let xy = parts[1].as_bytes();
                let file_path = parts[9].to_string();
                // The original path follows as the next NUL-delimited field
                let old_path = entries.get(i + 1).map(|s| s.to_string());

                if xy[0] != b'.' {
                    files.push(ChangedFile {
                        path: file_path.clone(),
                        status: "R".to_string(),
                        area: "staged".to_string(),
                        old_path: old_path.clone(),
                    });
                }
                if xy[1] != b'.' {
                    files.push(ChangedFile {
                        path: file_path,
                        status: "R".to_string(),
                        area: "unstaged".to_string(),
                        old_path,
                    });
                }
                i += 2; // skip the old_path entry
            } else {
                i += 1;
            }
        } else if entry.starts_with("u ") {
            // Unmerged entry: u XY sub m1 m2 m3 mW h1 h2 h3 path
            let parts: Vec<&str> = entry.splitn(11, ' ').collect();
            if parts.len() >= 11 {
                let file_path = parts[10].to_string();
                files.push(ChangedFile {
                    path: file_path.clone(),
                    status: "U".to_string(),
                    area: "unstaged".to_string(),
                    old_path: None,
                });
            }
            i += 1;
        } else if entry.starts_with("? ") {
            let file_path = entry[2..].to_string();
            files.push(ChangedFile {
                path: file_path,
                status: "?".to_string(),
                area: "untracked".to_string(),
                old_path: None,
            });
            i += 1;
        } else {
            i += 1;
        }
    }

    Ok(files)
}

fn status_letter(byte: u8) -> String {
    match byte {
        b'M' => "M",
        b'A' => "A",
        b'D' => "D",
        b'R' => "R",
        b'C' => "C",
        b'T' => "T",
        _ => "M",
    }
    .to_string()
}

pub fn file_diff(path: &str, file_path: &str, staged: bool) -> Result<String, String> {
    let output = if staged {
        Command::new("git")
            .args(["-C", path, "diff", "--cached", "--", file_path])
            .output()
            .map_err(|e| e.to_string())?
    } else {
        // Try normal diff first
        let result = Command::new("git")
            .args(["-C", path, "diff", "--", file_path])
            .output()
            .map_err(|e| e.to_string())?;

        if result.status.success() && result.stdout.is_empty() {
            // Might be untracked — use diff against /dev/null
            Command::new("git")
                .args([
                    "-C",
                    path,
                    "diff",
                    "--no-index",
                    "/dev/null",
                    file_path,
                ])
                .output()
                .map_err(|e| e.to_string())?
        } else {
            result
        }
    };

    // --no-index returns exit code 1 for differences, which is normal
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn stage_file(path: &str, file_path: &str) -> Result<(), String> {
    let output = Command::new("git")
        .args(["-C", path, "add", "--", file_path])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

pub fn unstage_file(path: &str, file_path: &str) -> Result<(), String> {
    let output = Command::new("git")
        .args(["-C", path, "restore", "--staged", "--", file_path])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

pub fn switch_branch(path: &str, branch_name: &str) -> Result<(), String> {
    let output = Command::new("git")
        .args(["-C", path, "switch", branch_name])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(())
}

pub fn create_branch(path: &str, branch_name: &str) -> Result<(), String> {
    let output = Command::new("git")
        .args(["-C", path, "switch", "-c", branch_name])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(())
}
