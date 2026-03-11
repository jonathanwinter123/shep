import { useState, useEffect, useRef } from "react";
import type { CodingAssistant, SessionMode } from "../../lib/types";
import { CODING_ASSISTANTS } from "../sidebar/constants";
import { isGitRepo, gitCurrentBranch, gitListBranches, gitCreateWorktree } from "../../lib/tauri";
import { useRepoStore } from "../../stores/useRepoStore";
import { ChevronDown, GitBranch } from "lucide-react";
import { assistantLogoSrc } from "../../lib/assistantLogos";

interface SessionLauncherProps {
  onStartSession: (
    assistantId: string,
    mode: SessionMode,
    worktreePath: string | null,
  ) => void;
}

export default function SessionLauncher({ onStartSession }: SessionLauncherProps) {
  const activeRepoPath = useRepoStore((s) => s.activeRepoPath);

  const [selectedAssistant, setSelectedAssistant] = useState<CodingAssistant | null>(null);
  const [mode, setMode] = useState<SessionMode>("standard");
  const [isGit, setIsGit] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const branchPickerRef = useRef<HTMLDivElement>(null);

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

  const handleStart = async () => {
    if (!selectedAssistant || !activeRepoPath) return;
    setLaunching(true);

    try {
      let worktreePath: string | null = null;

      if (usesWorktree && isGit) {
        const branchSuffix = `${mode}-${selectedAssistant.id}-${Date.now()}`;
        worktreePath = `${activeRepoPath}/../.shep-worktrees/${branchSuffix}`;
        await gitCreateWorktree(activeRepoPath, worktreePath, branchSuffix);
      }

      onStartSession(selectedAssistant.id, mode, worktreePath);
    } catch (e) {
      console.error("Failed to start session:", e);
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
            return (
              <button
                key={assistant.id}
                className={`option-card ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedAssistant(assistant)}
              >
                {logoUrl && <img src={logoUrl} alt="" width={18} height={18} />}
                <span>{assistant.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Toggle */}
      {selectedAssistant && (
        <div className="mb-6">
          <label className="section-label !p-0 mb-3 block text-xs opacity-50">Mode</label>
          <div className="flex gap-2">
            <button
              className={`option-card ${mode === "standard" ? "selected" : ""}`}
              onClick={() => setMode("standard")}
            >
              Standard
            </button>
            {isGit && (
              <button
                className={`option-card ${mode === "worktree" ? "selected" : ""}`}
                onClick={() => setMode("worktree")}
              >
                Worktree
              </button>
            )}
            <button
              className={`option-card ${mode === "yolo" ? "selected" : ""}`}
              onClick={() => setMode("yolo")}
            >
              YOLO
            </button>
          </div>
          {yoloUnavailable && (
            <p className="text-xs opacity-40 mt-2">
              {selectedAssistant.name} does not support a YOLO/auto mode flag.
            </p>
          )}
        </div>
      )}

      {/* Branch Section */}
      {selectedAssistant && isGit && (
        <div className="mb-6">
          <label className="section-label !p-0 mb-3 block text-xs opacity-50">Branch</label>
          {usesWorktree ? (
            <>
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
              <p className="text-xs opacity-40 mt-2">
                Creates an isolated worktree branching from the selected branch.
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <GitBranch size={14} className="opacity-40" />
              <span className="branch-tag">{currentBranch}</span>
            </div>
          )}
        </div>
      )}

      {/* Start Button */}
      {selectedAssistant && (
        <button
          className="btn-primary"
          disabled={launching || !!yoloUnavailable}
          onClick={handleStart}
        >
          {launching ? "Starting..." : "Start Session"}
        </button>
      )}
    </div>
  );
}
