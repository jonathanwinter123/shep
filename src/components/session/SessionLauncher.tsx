import { useState, useEffect, useMemo } from "react";
import type { CodingAssistant, SessionMode } from "../../lib/types";
import { CODING_ASSISTANTS } from "../sidebar/constants";
import { checkCommandExists } from "../../lib/tauri";
import { useRepoStore } from "../../stores/useRepoStore";
import { useGitStore } from "../../stores/useGitStore";
import { HandMetal } from "lucide-react";
import { assistantLogoSrc } from "../../lib/assistantLogos";
import { ASSISTANT_INSTALL_URLS } from "../sidebar/constants";
import BranchDropdown from "../git/BranchDropdown";

interface SessionLauncherProps {
  onStartSession: (
    assistantId: string,
    mode: SessionMode,
    worktreePath: string | null,
  ) => Promise<boolean>;
}

export default function SessionLauncher({ onStartSession }: SessionLauncherProps) {
  const activeRepoPath = useRepoStore((s) => s.activeRepoPath);

  const [selectedAssistant, setSelectedAssistant] = useState<CodingAssistant | null>(null);
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [installPopover, setInstallPopover] = useState<string | null>(null);
  const [yolo, setYolo] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [selectedWorktreePath, setSelectedWorktreePath] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

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

  // Git state
  const gitStatus = useGitStore(
    (s) => activeRepoPath ? s.projectGitStatus[activeRepoPath] ?? null : null,
  );
  const isGit = gitStatus?.is_git_repo ?? false;
  const currentBranch = gitStatus?.branch ?? "";

  // Worktree map for BranchDropdown (branch name → worktree path)
  const worktrees = useGitStore(
    (s) => activeRepoPath ? s.worktreesByRepo[activeRepoPath] ?? [] : [],
  );
  const worktreeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const wt of worktrees) {
      if (!wt.is_main && wt.branch) map.set(wt.branch, wt.path);
    }
    return map;
  }, [worktrees]);

  const handleBranchChanged = () => {
    // Branch was switched via the dropdown — clear worktree selection
    setSelectedWorktreePath(null);
    setSelectedBranch(null);
  };

  const handleSelectWorktree = (branch: string, worktreePath: string) => {
    setSelectedWorktreePath(worktreePath);
    setSelectedBranch(branch);
  };

  const handleStart = async () => {
    if (!selectedAssistant || !activeRepoPath || launching) return;
    setLaunching(true);

    const mode: SessionMode = yolo ? "yolo" : "standard";
    const started = await onStartSession(selectedAssistant.id, mode, selectedWorktreePath);
    if (!started) {
      setLaunching(false);
    }
  };

  const yoloUnavailable = yolo && selectedAssistant && !selectedAssistant.yoloFlag;

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

      {/* Branch picker */}
      {selectedAssistant && isGit && activeRepoPath && (
        <div className="mb-6">
          <label className="section-label !p-0 mb-3 block text-xs opacity-50">Branch</label>
          <BranchDropdown
            repoPath={activeRepoPath}
            currentBranch={selectedBranch ?? currentBranch}
            isWorktree={false}
            onBranchChanged={handleBranchChanged}
            worktreeMap={worktreeMap}
            allowWorktreeSelect
            onSelectWorktree={handleSelectWorktree}
          />
        </div>
      )}

      {/* YOLO toggle */}
      {selectedAssistant && (
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={yolo}
              onChange={(e) => setYolo(e.target.checked)}
              style={{ accentColor: "var(--text-muted)" }}
            />
            <HandMetal size={14} style={{ opacity: 0.5 }} />
            <span style={{ color: "var(--text-muted)" }}>Auto-accept mode</span>
          </label>
          {yoloUnavailable && (
            <p className="text-xs opacity-40 mt-2">
              {selectedAssistant.name} does not support auto-accept mode.
            </p>
          )}
        </div>
      )}

      {/* Start Button */}
      {selectedAssistant && (
        <button
          className="btn-primary"
          disabled={launching || !!yoloUnavailable}
          aria-busy={launching}
          onClick={handleStart}
        >
          {launching ? "Starting..." : "Start Session"}
        </button>
      )}
    </div>
  );
}
