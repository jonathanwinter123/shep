import { useState, useEffect } from "react";
import type { CodingAssistant, SessionMode } from "../../lib/types";
import { CODING_ASSISTANTS } from "../sidebar/constants";
import {
  isGitRepo,
  gitCurrentBranch,
  gitListBranches,
  gitCreateBranch,
  gitCreateWorktree,
  checkCommandExists,
  copyPath,
  createSymlink,
  runShellCommand,
} from "../../lib/tauri";
import { useRepoStore } from "../../stores/useRepoStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { GitBranch, GitFork, HandMetal } from "lucide-react";
import { assistantLogoSrc } from "../../lib/assistantLogos";
import { ASSISTANT_INSTALL_URLS } from "../sidebar/constants";
import { getErrorMessage } from "../../lib/errors";
import { useNoticeStore } from "../../stores/useNoticeStore";

interface SessionLauncherProps {
  onStartSession: (
    assistantId: string,
    mode: SessionMode,
    worktreePath: string | null,
  ) => Promise<boolean>;
}

/** Generate a unique branch name by appending -2, -3, etc. if needed */
function uniqueBranchName(base: string, existing: string[]): string {
  const set = new Set(existing);
  if (!set.has(base)) return base;
  let i = 2;
  while (set.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

/** Format today as YYYYMMDD-{base36 seconds since midnight} for short unique stamps */
function dateTimeStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const secs = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  return `${y}${m}${day}-${secs.toString(36)}`;
}

/** Mode labels for display */
const MODE_LABELS: Record<SessionMode, string> = {
  standard: "Standard",
  worktree: "Worktree",
  yolo: "YOLO",
};

/** Mode icons */
const MODE_ICONS: Record<SessionMode, React.ReactNode> = {
  standard: <GitBranch size={14} style={{ opacity: 0.5 }} />,
  worktree: <GitFork size={14} style={{ opacity: 0.5 }} />,
  yolo: <HandMetal size={14} style={{ opacity: 0.5 }} />,
};

export default function SessionLauncher({ onStartSession }: SessionLauncherProps) {
  const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
  const activeConfig = useRepoStore((s) => s.activeConfig);
  const pushNotice = useNoticeStore((s) => s.pushNotice);

  // Detect if we're inside a worktree workspace
  const activeWorkspaceId = useTerminalStore(
    (s) => s.activeProjectPath ? s.projectState[s.activeProjectPath]?.activeWorkspaceId : "main",
  ) ?? "main";
  const inWorktree = activeWorkspaceId !== "main";

  const [selectedAssistant, setSelectedAssistant] = useState<CodingAssistant | null>(null);
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [installPopover, setInstallPopover] = useState<string | null>(null);
  const [mode, setMode] = useState<SessionMode>("standard");
  const [isGit, setIsGit] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [branches, setBranches] = useState<string[]>([]);
  const [branchName, setBranchName] = useState("");
  const [createBranch, setCreateBranch] = useState(false);
  const [launching, setLaunching] = useState(false);

  const usesWorktree = mode === "worktree" || mode === "yolo";

  // Check which assistants are installed
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results: Record<string, boolean> = {};
      await Promise.all(
        CODING_ASSISTANTS.map(async (a) => {
          results[a.id] = await checkCommandExists(a.command).catch(() => false);
        }),
      );
      if (!cancelled) setAvailable(results);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!activeRepoPath) return;
    let cancelled = false;
    (async () => {
      const git = await isGitRepo(activeRepoPath);
      if (cancelled) return;
      setIsGit(git);
      if (git) {
        const [branch, branchList] = await Promise.all([
          gitCurrentBranch(activeRepoPath),
          gitListBranches(activeRepoPath),
        ]);
        if (cancelled) return;
        setCurrentBranch(branch);
        setBranches(branchList);
      }
    })();
    return () => { cancelled = true; };
  }, [activeRepoPath]);

  // Close install popover on outside click
  useEffect(() => {
    if (!installPopover) return;
    const handleClick = () => setInstallPopover(null);
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [installPopover]);

  // Auto-generate branch name for worktree/yolo modes
  useEffect(() => {
    if (!selectedAssistant || !isGit) {
      setBranchName("");
      return;
    }
    if (usesWorktree) {
      const prefix = mode === "yolo" ? "yolo/" : "wt/";
      setBranchName(uniqueBranchName(`${prefix}${dateTimeStamp()}`, branches));
    } else {
      setBranchName("");
    }
  }, [mode, selectedAssistant, isGit, branches]);

  const handleModeChange = (m: SessionMode) => {
    setMode(m);
    if (m !== "standard") setCreateBranch(false);
  };

  const handleStart = async () => {
    if (!selectedAssistant || !activeRepoPath || launching) return;
    setLaunching(true);

    try {
      let worktreePath: string | null = null;

      if (usesWorktree && isGit) {
        const prefix = mode === "yolo" ? "yolo/" : "wt/";
        const finalBranch = branchName.trim() || `${prefix}${dateTimeStamp()}`;
        const parentDir = activeRepoPath.substring(0, activeRepoPath.lastIndexOf("/"));
        const repoName = activeRepoPath.substring(activeRepoPath.lastIndexOf("/") + 1);
        const folderName = finalBranch.replace(/\//g, "-");
        worktreePath = `${parentDir}/.shep-worktrees/${repoName}/${folderName}`;
        await gitCreateWorktree(activeRepoPath, worktreePath, finalBranch);

        // Execute environment blueprint
        const blueprint = activeConfig?.worktree;
        if (blueprint && worktreePath) {
          for (const entry of blueprint.copy) {
            await copyPath(`${activeRepoPath}/${entry}`, `${worktreePath}/${entry}`).catch((err) => {
              if (import.meta.env.DEV) console.warn(`Blueprint copy failed for ${entry}:`, err);
            });
          }
          for (const entry of blueprint.symlink) {
            await createSymlink(`${activeRepoPath}/${entry}`, `${worktreePath}/${entry}`).catch((err) => {
              if (import.meta.env.DEV) console.warn(`Blueprint symlink failed for ${entry}:`, err);
            });
          }
          for (const cmd of blueprint.post_create) {
            const exitCode = await runShellCommand(cmd, worktreePath).catch(() => -1);
            if (exitCode !== 0) {
              pushNotice({
                tone: "error",
                title: "Worktree setup warning",
                message: `"${cmd}" exited with code ${exitCode}`,
              });
            }
          }
        }

        const store = useTerminalStore.getState();
        store.addWorkspace(activeRepoPath, finalBranch, finalBranch, worktreePath);
        store.switchWorkspace(activeRepoPath, finalBranch);
      }
      if (!usesWorktree && createBranch && isGit) {
        const finalBranch = branchName.trim() || `feature/${dateTimeStamp()}`;
        await gitCreateBranch(activeRepoPath, finalBranch);
      }

      // If we're in a worktree workspace and didn't create a new one,
      // use the current workspace's path
      if (!worktreePath && inWorktree) {
        worktreePath = useTerminalStore.getState().getActiveWorkspacePath();
      }

      const started = await onStartSession(selectedAssistant.id, mode, worktreePath);
      if (!started) {
        setLaunching(false);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error("Failed to start session:", e);
      pushNotice({
        tone: "error",
        title: "Couldn't start session",
        message: getErrorMessage(e),
      });
      setLaunching(false);
    }
  };

  const yoloUnavailable = mode === "yolo" && selectedAssistant && !selectedAssistant.yoloFlag;

  return (
    <div className="absolute inset-0 overflow-y-auto px-1 py-4">
      <h2 className="section-label !p-0 mb-6">New AI Assistant Session</h2>

      {/* Assistant Picker */}
      <div className="mb-6">
        <label className="section-label !p-0 mb-3 block text-xs opacity-50">Assistant</label>
        <div className="flex flex-wrap gap-2">
          {CODING_ASSISTANTS.map((assistant) => {
            const logoUrl = assistantLogoSrc[assistant.id];
            const isSelected = selectedAssistant?.id === assistant.id;
            const isAvailable = available[assistant.id] !== false;
            const installUrl = ASSISTANT_INSTALL_URLS[assistant.id];
            const showPopover = installPopover === assistant.id;
            return (
              <div key={assistant.id} className="relative">
                <button
                  className={`option-card ${isSelected ? "selected" : ""} ${!isAvailable ? "opacity-40" : ""}`}
                  onClick={() => {
                    if (isAvailable) {
                      setSelectedAssistant(assistant);
                      setInstallPopover(null);
                    } else {
                      setInstallPopover(showPopover ? null : assistant.id);
                    }
                  }}
                >
                  {logoUrl && <img src={logoUrl} alt="" width={18} height={18} style={!isAvailable ? { filter: "grayscale(1)" } : undefined} />}
                  <span>{assistant.name}</span>
                </button>
                {showPopover && installUrl && (
                  <div
                    className="absolute left-0 top-full mt-2 z-50 rounded-lg p-3"
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      background: "var(--glass-panel-strong)",
                      border: "1px solid var(--glass-border-strong)",
                      backdropFilter: "blur(24px) saturate(155%)",
                      WebkitBackdropFilter: "blur(24px) saturate(155%)",
                      boxShadow: "0 14px 36px rgba(0, 0, 0, 0.28)",
                      minWidth: 200,
                    }}
                  >
                    <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                      <strong>{assistant.name}</strong> is not installed on this system.
                    </p>
                    <code
                      className="block text-xs mt-1 px-2 py-1 rounded select-all cursor-text"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgb(122, 162, 247)" }}
                    >
                      {installUrl}
                    </code>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mode Toggle */}
      {selectedAssistant && isGit && !inWorktree && (
        <div className="mb-6">
          <label className="section-label !p-0 mb-3 block text-xs opacity-50">Mode</label>
          <div className="flex gap-2">
            {(["standard", "worktree", "yolo"] as SessionMode[]).map((m) => (
              <button
                key={m}
                className={`option-card ${mode === m ? "selected" : ""}`}
                onClick={() => handleModeChange(m)}
              >
                {MODE_ICONS[m]}
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
          {yoloUnavailable && (
            <p className="text-xs opacity-40 mt-2">
              {selectedAssistant.name} does not support a YOLO/auto mode flag.
            </p>
          )}
        </div>
      )}

      {/* Worktree/YOLO: branch info + new branch name */}
      {selectedAssistant && isGit && usesWorktree && !inWorktree && (
        <div className="mb-6">
          <p className="text-xs opacity-50 mb-3">
            On branch{" "}
            <code
              style={{
                background: "rgba(255,255,255,0.06)",
                padding: "1px 6px",
                borderRadius: 4,
                fontSize: 11,
              }}
            >
              {currentBranch}
            </code>
          </p>

          <label className="section-label !p-0 mb-2 block text-xs opacity-50">New Branch Name</label>
          <input
            className="branch-dropdown__input w-full max-w-md"
            type="text"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder={`${mode === "yolo" ? "yolo" : "wt"}/my-feature`}
          />
        </div>
      )}

      {/* Standard mode: branch info + optional new branch */}
      {selectedAssistant && isGit && mode === "standard" && !inWorktree && (
        <div className="mb-6">
          <p className="text-xs opacity-50 mb-3">
            On branch{" "}
            <code
              style={{
                background: "rgba(255,255,255,0.06)",
                padding: "1px 6px",
                borderRadius: 4,
                fontSize: 11,
              }}
            >
              {currentBranch}
            </code>
          </p>

          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={createBranch}
              onChange={(e) => setCreateBranch(e.target.checked)}
              style={{ accentColor: "var(--text-muted)" }}
            />
            <span style={{ color: "var(--text-muted)" }}>Create new branch</span>
          </label>

          {createBranch && (
            <input
              className="branch-dropdown__input w-full max-w-md mt-3"
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="feature/my-feature"
              autoFocus
            />
          )}
        </div>
      )}

      {/* Worktree context hint */}
      {selectedAssistant && inWorktree && (
        <p className="text-xs opacity-40 mb-4">
          Launching in worktree <span className="font-mono">{activeWorkspaceId}</span>
        </p>
      )}

      {/* Start Button */}
      {selectedAssistant && (
        <button
          className="btn-primary"
          disabled={launching || !!yoloUnavailable}
          aria-busy={launching}
          onClick={handleStart}
        >
          {launching ? "Preparing Session..." : "Start Session"}
        </button>
      )}
    </div>
  );
}
