import { useState, useEffect, useRef } from "react";
import type { CodingAssistant, SessionMode } from "../../lib/types";
import { CODING_ASSISTANTS } from "../sidebar/constants";
import { isGitRepo, gitCurrentBranch, gitListBranches, gitCreateWorktree } from "../../lib/tauri";
import { useRepoStore } from "../../stores/useRepoStore";
import { ChevronDown } from "lucide-react";
import ClaudeLogo from "../sidebar/icons/ClaudeLogo";
import CodexLogo from "../sidebar/icons/CodexLogo";
import GeminiLogo from "../sidebar/icons/GeminiLogo";

const logoComponents: Record<string, React.ComponentType<{ size?: number }>> = {
  claude: ClaudeLogo,
  codex: CodexLogo,
  gemini: GeminiLogo,
};

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

  // Detect git repo on mount / when repo changes
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

  // Close branch picker on outside click
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

  const handleStart = async () => {
    if (!selectedAssistant || !activeRepoPath) return;
    setLaunching(true);

    try {
      let worktreePath: string | null = null;

      if (mode === "yolo" && isGit) {
        // Create an isolated worktree
        const branchSuffix = `yolo-${selectedAssistant.id}-${Date.now()}`;
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
    <div className="absolute inset-0 overflow-y-auto p-6">
      <h2 className="section-label !p-0 mb-6">New AI Assistant Session</h2>

      {/* Assistant Picker */}
      <div className="mb-6">
        <label className="section-label !p-0 mb-2 block text-xs opacity-50">Assistant</label>
        <div className="flex flex-wrap gap-2">
          {CODING_ASSISTANTS.map((assistant) => {
            const Logo = logoComponents[assistant.id];
            const isSelected = selectedAssistant?.id === assistant.id;
            return (
              <button
                key={assistant.id}
                className={`list-item ${isSelected ? "active" : ""}`}
                style={{ padding: "10px 16px", gap: "10px" }}
                onClick={() => setSelectedAssistant(assistant)}
              >
                {Logo && <Logo size={16} />}
                <span>{assistant.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Toggle */}
      {selectedAssistant && (
        <div className="mb-6">
          <label className="section-label !p-0 mb-2 block text-xs opacity-50">Mode</label>
          <div className="flex gap-2">
            <button
              className={`list-item ${mode === "standard" ? "active" : ""}`}
              style={{ padding: "10px 16px" }}
              onClick={() => setMode("standard")}
            >
              Standard
            </button>
            <button
              className={`list-item ${mode === "yolo" ? "active" : ""}`}
              style={{ padding: "10px 16px" }}
              onClick={() => setMode("yolo")}
            >
              YOLO
            </button>
          </div>
          {yoloUnavailable && (
            <p className="text-xs opacity-50 mt-2">
              {selectedAssistant.name} does not support a YOLO/auto mode flag.
            </p>
          )}
        </div>
      )}

      {/* Branch Section */}
      {selectedAssistant && isGit && (
        <div className="mb-6">
          <label className="section-label !p-0 mb-2 block text-xs opacity-50">Branch</label>
          {mode === "yolo" ? (
            <>
              <div className="relative inline-block" ref={branchPickerRef}>
                <button
                  className="list-item"
                  style={{ padding: "8px 12px", gap: "8px", minWidth: 180 }}
                  onClick={() => setBranchPickerOpen(!branchPickerOpen)}
                >
                  <code className="text-xs flex-1 text-left">{selectedBranch}</code>
                  <ChevronDown
                    size={14}
                    className="shrink-0 opacity-50 transition-transform duration-150"
                    style={{ transform: branchPickerOpen ? "rotate(180deg)" : undefined }}
                  />
                </button>
                {branchPickerOpen && (
                  <div
                    className="absolute left-0 top-full mt-1 z-50 min-w-[220px] max-h-52 overflow-y-auto rounded-lg py-1"
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
                        <code className="text-xs">{b}</code>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs opacity-50 mt-2">
                Creates an isolated worktree branching from the selected branch.
              </p>
            </>
          ) : (
            <p className="text-sm opacity-70">
              On <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs">{currentBranch}</code>
            </p>
          )}
        </div>
      )}

      {/* Start Button */}
      {selectedAssistant && (
        <button
          className="list-item active"
          style={{ padding: "10px 24px" }}
          disabled={launching || !!yoloUnavailable}
          onClick={handleStart}
        >
          {launching ? "Starting..." : "Start Session"}
        </button>
      )}
    </div>
  );
}
