// src/components/settings/ShortcutEditor.tsx

import { useState, useEffect, useCallback } from "react";
import { useShortcutStore } from "../../stores/useShortcutStore";
import { getAllActions, type ActionDefinition } from "../../lib/actionRegistry";
import { eventToCombo, normalizeCombo, formatComboForDisplay } from "../../lib/keyCombo";

/** Group actions by category, sorted. */
function groupedActions(): [string, ActionDefinition[]][] {
  const actions = getAllActions();
  const groups = new Map<string, ActionDefinition[]>();
  for (const action of actions) {
    const list = groups.get(action.category) ?? [];
    list.push(action);
    groups.set(action.category, list);
  }
  const order = ["Tabs", "Sessions", "Panels", "Terminal"];
  return order
    .filter((cat) => groups.has(cat))
    .map((cat) => [cat, groups.get(cat)!] as [string, ActionDefinition[]]);
}

function KbdCombo({ combo }: { combo: string }) {
  const parts = formatComboForDisplay(combo);
  return (
    <span className="keybinding-card__keys">
      {parts.map((k, i) => (
        <kbd key={i} className="keybinding-kbd">{k}</kbd>
      ))}
    </span>
  );
}

export default function ShortcutEditor() {
  const overrides = useShortcutStore((s) => s.overrides);
  const getEffective = useShortcutStore((s) => s.getEffectiveShortcut);
  const setShortcut = useShortcutStore((s) => s.setShortcut);
  const resetShortcut = useShortcutStore((s) => s.resetShortcut);
  const isSaving = useShortcutStore((s) => s.isSaving);
  const error = useShortcutStore((s) => s.error);

  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ actionId: string; combo: string; conflictingId: string } | null>(null);

  const terminalActionIds = new Set(["terminal.newLine", "terminal.deleteWord", "terminal.clearTerminal"]);

  const groups = groupedActions();

  const handleStartRecording = useCallback((actionId: string) => {
    setRecordingId(actionId);
    setConflict(null);
    useShortcutStore.getState().setRecording(true);
  }, []);

  const handleCancelRecording = useCallback(() => {
    setRecordingId(null);
    setConflict(null);
    useShortcutStore.getState().setRecording(false);
  }, []);

  // Listen for key combo while recording
  useEffect(() => {
    if (!recordingId) return;

    const handler = (ev: KeyboardEvent) => {
      ev.preventDefault();
      ev.stopPropagation();

      if (ev.key === "Escape") {
        handleCancelRecording();
        return;
      }

      if (ev.key === "Backspace" || ev.key === "Delete") {
        void setShortcut(recordingId, "");
        setRecordingId(null);
        useShortcutStore.getState().setRecording(false);
        return;
      }

      const combo = eventToCombo(ev);
      if (!combo) return;

      const normalized = normalizeCombo(combo);
      const allActions = getAllActions();
      for (const action of allActions) {
        if (action.id === recordingId) continue;
        const effective = getEffective(action.id);
        if (effective && normalizeCombo(effective) === normalized) {
          setConflict({ actionId: recordingId, combo: normalized, conflictingId: action.id });
          return;
        }
      }

      void setShortcut(recordingId, normalized);
      setRecordingId(null);
      useShortcutStore.getState().setRecording(false);
    };

    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [recordingId, getEffective, setShortcut, handleCancelRecording]);

  const handleAcceptConflict = useCallback(() => {
    if (!conflict) return;
    void setShortcut(conflict.conflictingId, "").then(() => {
      void setShortcut(conflict.actionId, conflict.combo);
      setRecordingId(null);
      setConflict(null);
      useShortcutStore.getState().setRecording(false);
    });
  }, [conflict, setShortcut]);

  return (
    <div>
      {groups.map(([category, actions]) => (
        <div key={category} className="mb-6">
          <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">{category}</h3>
          <div className="flex flex-col gap-1">
            {actions.map((action) => {
              const effective = getEffective(action.id);
              const isOverridden = action.id in overrides;
              const isRecording = recordingId === action.id;

              return (
                <div
                  key={action.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[var(--bg-hover)]"
                >
                  <span className="text-sm text-[var(--text-secondary)]">{action.label}</span>
                  <div className="flex items-center gap-2">
                    {isRecording ? (
                      <span className="text-xs text-[var(--text-accent)] animate-pulse">
                        Press a key combo...
                      </span>
                    ) : effective ? (
                      <button
                        className="bg-transparent border-0 cursor-pointer p-0"
                        onClick={() => handleStartRecording(action.id)}
                        title="Click to rebind"
                      >
                        <KbdCombo combo={effective} />
                      </button>
                    ) : (
                      <button
                        className="text-xs text-[var(--text-muted)] bg-transparent border-0 cursor-pointer p-0 hover:text-[var(--text-secondary)]"
                        onClick={() => handleStartRecording(action.id)}
                      >
                        unbound
                      </button>
                    )}
                    {isOverridden && !isRecording && (
                      <button
                        className="text-xs text-[var(--text-muted)] bg-transparent border-0 cursor-pointer p-0 hover:text-[var(--text-secondary)]"
                        onClick={() => void resetShortcut(action.id)}
                        title="Reset to default"
                      >
                        reset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Conflict dialog */}
      {conflict && (() => {
        const conflictAction = getAllActions().find((a) => a.id === conflict.conflictingId);
        const isTerminal = terminalActionIds.has(conflict.conflictingId);
        return (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-4 max-w-sm shadow-lg">
              <p className="text-sm mb-3">
                {isTerminal ? (
                  <>
                    <strong>{conflict.combo}</strong> is currently a terminal keybinding:{" "}
                    <strong>{conflictAction?.label}</strong>. Overriding it means the terminal action will no longer work.
                  </>
                ) : (
                  <>
                    <strong>{conflict.combo}</strong> is already bound to{" "}
                    <strong>{conflictAction?.label}</strong>. Proceeding will unbind that action.
                  </>
                )}
              </p>
              <div className="flex gap-2 justify-end">
                <button className="btn-secondary text-xs" onClick={handleCancelRecording}>
                  Cancel
                </button>
                <button className="btn-primary text-xs" onClick={handleAcceptConflict}>
                  Override
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {isSaving && <div className="mt-2 text-xs text-[var(--text-muted)]">Saving...</div>}
      {error && <div className="mt-2 text-sm text-red-300">{error}</div>}
    </div>
  );
}
