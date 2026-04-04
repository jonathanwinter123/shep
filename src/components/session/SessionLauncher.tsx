import { useState, useEffect, useRef } from "react";
import type { CodingAssistant, SessionMode } from "../../lib/types";
import { CODING_ASSISTANTS } from "../sidebar/constants";
import {
  isGitRepo,
  gitCurrentBranch,
  gitInit,
  gitListBranches,
  gitSwitchBranch,
  gitCreateBranch,
  gitCreateWorktree,
  checkCommandExists,
  copyPath,
  createSymlink,
  runShellCommand,
} from "../../lib/tauri";
import { useRepoStore } from "../../stores/useRepoStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { ChevronDown, GitBranch, GitFork, HandMetal, Play } from "lucide-react";
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

/** Format today's date as YYYYMMDD */
function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** Mode labels for display */
const MODE_LABELS: Record<SessionMode, string> = {
  standard: "Standard",
  worktree: "Worktree",
  yolo: "YOLO",
};

/** Mode icons */
const MODE_ICONS: Record<SessionMode, React.ReactNode> = {
  standard: <Play size={14} style={{ opacity: 0.5 }} />,
  worktree: <GitFork size={14} style={{ opacity: 0.5 }} />,
  yolo: <HandMetal size={14} style={{ opacity: 0.5 }} />,
};

/** Short mode slug for branch naming */
function modeBranchSlug(mode: SessionMode): string {
  if (mode === "yolo") return "-yolo";
  if (mode === "worktree") return "-wt";
  return "";
}

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
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [useCurrentBranch, setUseCurrentBranch] = useState(false);
  const [initializeGitOnLaunch, setInitializeGitOnLaunch] = useState(false);
  const [launching, setLaunching] = useState(false);
  const branchPickerRef = useRef<HTMLDivElement>(null);

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
        setSelectedBranch(branch);
      }
    })();

    return () => { cancelled = true; };
  }, [activeRepoPath]);

  // Close install popover on outside click
  useEffect(() => {
    if (!installPopover) return;
    const handleClick = () => setInstallPopover(null);
    // Delay to avoid closing immediately from the same click
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [installPopover]);

  useEffect(() => {
    if (!branchPickerOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (branchPickerRef.current && !branchPickerRef.current.contains(e.target as Node)) {
        setBranchPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [branchPickerOpen]);

  const usesWorktree = mode === "worktree" || mode === "yolo";

  // Auto-generate branch name when mode or assistant changes
  useEffect(() => {
    if (!selectedAssistant || !isGit || useCurrentBranch) {
      setBranchName("");
      return;
    }
    const base = `shep${modeBranchSlug(mode)}-${todayStamp()}`;
    setBranchName(uniqueBranchName(base, branches));
  }, [mode, selectedAssistant, isGit, useCurrentBranch, branches]);

  const handleModeChange = (m: SessionMode) => {
    setMode(m);
    const nextUsesWorktree = m === "worktree" || m === "yolo";
    if (nextUsesWorktree) setUseCurrentBranch(false);
    if (isGit || m !== "standard") setInitializeGitOnLaunch(false);
  };

  const handleStart = async () => {
    if (!selectedAssistant || !activeRepoPath || launching) return;
    setLaunching(true);

    try {
      let worktreePath: string | null = null;
      let repoWasInitialized = false;

      if (!isGit && mode === "standard" && initializeGitOnLaunch) {
        await gitInit(activeRepoPath);
        repoWasInitialized = true;
      }

      if (usesWorktree && isGit) {
        // Worktree/YOLO: create worktree + branch
        const finalBranch = branchName.trim() || `shep${modeBranchSlug(mode)}-${todayStamp()}`;
        const folderName = finalBranch.replace(/\//g, "-") + "-wt";
        worktreePath = `${activeRepoPath}/../.shep-worktrees/${folderName}`;
        await gitCreateWorktree(activeRepoPath, worktreePath, finalBranch);

        // Execute environment blueprint: copy files, create symlinks, run post-create commands
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

        // Register as a workspace and switch to it
        const store = useTerminalStore.getState();
        store.addWorkspace(activeRepoPath, finalBranch, finalBranch, worktreePath);
        store.switchWorkspace(activeRepoPath, finalBranch);
      } else if (isGit && !usesWorktree && !repoWasInitialized) {
        // Branch mode: switch to selected base branch if needed
        if (selectedBranch !== currentBranch) {
          await gitSwitchBranch(activeRepoPath, selectedBranch);
        }
        // Create new branch unless "use current branch" is checked
        if (!useCurrentBranch) {
          const finalBranch = branchName.trim() || `shep-${todayStamp()}`;
          await gitCreateBranch(activeRepoPath, finalBranch);
        }
      }

      // If we're in a worktree workspace and didn't create a new one,
      // use the current workspace's path so the session runs there
      if (!worktreePath && inWorktree) {
        worktreePath = useTerminalStore.getState().getActiveWorkspacePath();
      }

      const started = await onStartSession(selectedAssistant.id, mode, worktreePath);
      if (!started) {
        setLaunching(false);
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("Failed to start session:", e);
      }
      pushNotice({
        tone: "error",
        title: "Couldn’t start session",
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
      {selectedAssistant && (
        <div className="mb-6">
          <label className="section-label !p-0 mb-3 block text-xs opacity-50">Mode</label>
          <div className="flex gap-2">
            {(["standard", ...(isGit ? ["worktree"] : []), "yolo"] as SessionMode[]).map((m) => (
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

      {selectedAssistant && !isGit && mode === "standard" && (
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={initializeGitOnLaunch}
              onChange={(e) => setInitializeGitOnLaunch(e.target.checked)}
              style={{ accentColor: "var(--text-muted)" }}
            />
            <span style={{ color: "var(--text-muted)" }}>
              Initialize Git repository before launch
            </span>
          </label>
          <p className="text-xs opacity-40 mt-2 max-w-md">
            Creates a local Git repo in this project before launching the assistant.
            Worktrees still need an initial commit before they can be used.
          </p>
        </div>
      )}

      {/* Branch Section — hidden in worktree for standard mode (already on a branch),
           but shown for worktree/yolo modes (creating a new worktree from base) */}
      {selectedAssistant && isGit && !(inWorktree && !usesWorktree) && (
        <div className="mb-6">
          {usesWorktree ? (
            /* Worktree/YOLO: base branch picker + branch name */
            <>
              <label className="section-label !p-0 mb-3 block text-xs opacity-50">Base Branch</label>
              <div className="relative max-w-md" ref={branchPickerRef}>
                <button
                  className="option-card w-full"
                  onClick={() => setBranchPickerOpen(!branchPickerOpen)}
                >
                  <GitBranch size={14} className="shrink-0 opacity-50" />
                  <span className="flex-1 text-left text-sm">{selectedBranch}</span>
                  <ChevronDown
                    size={14}
                    className="shrink-0 opacity-50 transition-transform duration-150"
                    style={{ transform: branchPickerOpen ? "rotate(180deg)" : undefined }}
                  />
                </button>
                {branchPickerOpen && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1 z-50 max-h-52 overflow-y-auto rounded-lg py-1"
                    style={{
                      background: "var(--glass-panel-strong)",
                      border: "1px solid var(--glass-border-strong)",
                      backdropFilter: "blur(24px) saturate(155%)",
                      WebkitBackdropFilter: "blur(24px) saturate(155%)",
                      boxShadow: "0 14px 36px rgba(0, 0, 0, 0.28)",
                    }}
                  >
                    {branches.map((b) => (
                      <button
                        key={b}
                        className={`list-item w-full ${b === selectedBranch ? "active" : ""}`}
                        style={{ padding: "6px 12px", borderRadius: 0 }}
                        onClick={() => {
                          setSelectedBranch(b);
                          setBranchPickerOpen(false);
                        }}
                      >
                        <span className="text-sm">{b}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="section-label !p-0 mt-4 mb-2 block text-xs opacity-50">New Branch Name</label>
              <input
                className="branch-dropdown__input w-full max-w-md"
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder={`shep${modeBranchSlug(mode)}-${todayStamp()}`}
              />
              <p className="text-xs opacity-40 mt-2">
                Creates an isolated worktree branching from {selectedBranch}.
              </p>
            </>
          ) : (
            /* Branch mode: base branch picker + new branch name, with opt-out */
            <>
              <label className="section-label !p-0 mb-3 block text-xs opacity-50">Base Branch</label>
              <div className="relative max-w-md" ref={branchPickerRef}>
                <button
                  className={`option-card w-full${useCurrentBranch ? " opacity-40 pointer-events-none" : ""}`}
                  onClick={() => setBranchPickerOpen(!branchPickerOpen)}
                  disabled={useCurrentBranch}
                >
                  <GitBranch size={14} className="shrink-0 opacity-50" />
                  <span className="flex-1 text-left text-sm">{selectedBranch}</span>
                  <ChevronDown
                    size={14}
                    className="shrink-0 opacity-50 transition-transform duration-150"
                    style={{ transform: branchPickerOpen ? "rotate(180deg)" : undefined }}
                  />
                </button>
                {branchPickerOpen && !useCurrentBranch && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1 z-50 max-h-52 overflow-y-auto rounded-lg py-1"
                    style={{
                      background: "var(--glass-panel-strong)",
                      border: "1px solid var(--glass-border-strong)",
                      backdropFilter: "blur(24px) saturate(155%)",
                      WebkitBackdropFilter: "blur(24px) saturate(155%)",
                      boxShadow: "0 14px 36px rgba(0, 0, 0, 0.28)",
                    }}
                  >
                    {branches.map((b) => (
                      <button
                        key={b}
                        className={`list-item w-full ${b === selectedBranch ? "active" : ""}`}
                        style={{ padding: "6px 12px", borderRadius: 0 }}
                        onClick={() => {
                          setSelectedBranch(b);
                          setBranchPickerOpen(false);
                        }}
                      >
                        <span className="text-sm">{b}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="section-label !p-0 mt-4 mb-2 block text-xs opacity-50">New Branch Name</label>
              <input
                className={`branch-dropdown__input w-full max-w-md${useCurrentBranch ? " opacity-40 pointer-events-none" : ""}`}
                type="text"
                value={useCurrentBranch ? selectedBranch : branchName}
                onChange={(e) => setBranchName(e.target.value)}
                disabled={useCurrentBranch}
                placeholder={`shep-${todayStamp()}`}
              />

              <label className="flex items-center gap-2 cursor-pointer text-xs mt-3">
                <input
                  type="checkbox"
                  checked={useCurrentBranch}
                  onChange={(e) => setUseCurrentBranch(e.target.checked)}
                  style={{ accentColor: "var(--text-muted)" }}
                />
                <span style={{ color: "var(--text-muted)" }}>Use current branch ({selectedBranch})</span>
              </label>
            </>
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
