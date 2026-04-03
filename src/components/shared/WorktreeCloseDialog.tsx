import { GitFork, Upload, Trash2, X } from "lucide-react";
import { useWorktreeDialogStore } from "../../stores/useWorktreeDialogStore";

export default function WorktreeCloseDialog() {
  const pending = useWorktreeDialogStore((s) => s.pending);
  const respond = useWorktreeDialogStore((s) => s.respond);

  if (!pending) return null;

  const branchLabel = pending.branch ?? "unknown branch";

  return (
    <div className="worktree-dialog__backdrop" onClick={() => respond(null)}>
      <div
        className="worktree-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Close worktree session"
      >
        <div className="worktree-dialog__header">
          <GitFork size={16} style={{ opacity: 0.6 }} />
          <span className="worktree-dialog__title">Close worktree session</span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Cancel"
            onClick={() => respond(null)}
          >
            <X size={14} />
          </button>
        </div>

        <p className="worktree-dialog__branch">{branchLabel}</p>

        {pending.dirty && (
          <p className="worktree-dialog__warning">This worktree has uncommitted changes.</p>
        )}

        <div className="worktree-dialog__actions">
          <button
            type="button"
            className="worktree-dialog__btn worktree-dialog__btn--keep"
            onClick={() => respond("keep")}
          >
            <GitFork size={14} />
            Keep branch
          </button>
          <button
            type="button"
            className="worktree-dialog__btn worktree-dialog__btn--push"
            onClick={() => respond("push")}
          >
            <Upload size={14} />
            Push &amp; clean up
          </button>
          <button
            type="button"
            className="worktree-dialog__btn worktree-dialog__btn--discard"
            onClick={() => respond("discard")}
          >
            <Trash2 size={14} />
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
