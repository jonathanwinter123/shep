import { useCallback, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { useUIStore } from "../../stores/useUIStore";
import { useGitStore } from "../../stores/useGitStore";
import { useShallow } from "zustand/shallow";
import { GitBranch, Terminal, Sparkles, SquareTerminal, ChartNoAxesCombined } from "lucide-react";
import GearIcon from "../sidebar/icons/GearIcon";
import { assistantLogoSrc } from "../../lib/assistantLogos";
import { handleActionKey } from "../../lib/a11y";
import DevMemory from "./DevMemory";

function NewSessionButton({ onNewAssistant, onNewShell }: { onNewAssistant: () => void; onNewShell: () => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(!open);
  };

  return (
    <>
      <button
        ref={btnRef}
        className="tab !px-3 !py-1.5 !text-base font-semibold"
        onClick={handleToggle}
        title="New session"
        aria-label="Open new session"
      >
        +
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="context-menu"
          style={{ top: pos.top, left: pos.left }}
        >
          <button
            className="context-menu__item"
            onClick={() => { onNewAssistant(); setOpen(false); }}
          >
            <span className="context-menu__icon"><Sparkles size={14} /></span>
            <span>AI Assistant</span>
          </button>
          <button
            className="context-menu__item"
            onClick={() => { onNewShell(); setOpen(false); }}
          >
            <span className="context-menu__icon"><SquareTerminal size={14} /></span>
            <span>Terminal</span>
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}

interface TabBarProps {
  onClose: (tabId: string) => void;
  onNewShell: () => void;
  onNewAssistant: () => void;
}

export default function TabBar({
  onClose,
  onNewShell,
  onNewAssistant,
}: TabBarProps) {
  const projectTerminals = useTerminalStore(
    (s) => (s.activeProjectPath ? s.projectState[s.activeProjectPath] : null),
  );
  const tabs = projectTerminals?.tabs ?? [];
  const activeTabId = projectTerminals?.activeTabId ?? null;
  const { setActiveTab, reorderTab, updateTab } = useTerminalStore.getState();

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragRef = useRef({ startX: 0, didDrag: false, dropIndex: null as number | null });
  const containerRef = useRef<HTMLDivElement>(null);

  const computeDropIndex = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return null;
    const tabEls = Array.from(container.querySelectorAll<HTMLElement>("[data-tab-index]"));
    for (let i = 0; i < tabEls.length; i++) {
      const rect = tabEls[i].getBoundingClientRect();
      if (clientX < rect.left + rect.width / 2) return i;
    }
    return tabEls.length;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, tabId: string) => {
    if ((e.target as HTMLElement).closest(".icon-btn")) return;
    const d = dragRef.current;
    d.startX = e.clientX;
    d.didDrag = false;
    d.dropIndex = null;

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      setDragTabId(null);
      setDropIndex(null);
      d.didDrag = false;
    };

    const onMove = (ev: PointerEvent) => {
      if (!d.didDrag && Math.abs(ev.clientX - d.startX) > 4) {
        d.didDrag = true;
        setDragTabId(tabId);
      }
      if (d.didDrag) {
        const idx = computeDropIndex(ev.clientX);
        d.dropIndex = idx;
        setDropIndex(idx);
      }
    };

    const onUp = () => {
      if (d.didDrag && d.dropIndex !== null) {
        reorderTab(tabId, d.dropIndex);
      }
      cleanup();
    };

    const onCancel = () => cleanup();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  }, [computeDropIndex, reorderTab]);

  // Single shallow subscription for all UI panel booleans (1 subscription, not 25)
  const {
    settingsTabOpen, settingsActive,
    gitPanelOpen, gitPanelActive,
    launcherOpen, launcherActive,
    commandsPanelOpen, commandsPanelActive,
    usageTabOpen, usagePanelActive,
  } = useUIStore(useShallow((s) => ({
    settingsTabOpen: s.settingsTabOpen,
    settingsActive: s.settingsActive,
    gitPanelOpen: s.gitPanelOpen,
    gitPanelActive: s.gitPanelActive,
    launcherOpen: s.launcherOpen,
    launcherActive: s.launcherActive,
    commandsPanelOpen: s.commandsPanelOpen,
    commandsPanelActive: s.commandsPanelActive,
    usageTabOpen: s.usageTabOpen,
    usagePanelActive: s.usagePanelActive,
  })));

  // Actions are stable — grab via getState() to avoid subscribing
  const {
    activateSettings, closeSettingsTab,
    activateGitPanel, closeGitPanel, openGitPanel,
    activateLauncher, closeLauncher,
    activateCommandsPanel, closeCommandsPanel,
    activateUsagePanel, closeUsageTab,
  } = useUIStore.getState();

  // Git status — only subscribe to the active tab's repo, not all repos
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const activeTabCwd = activeTab?.worktreePath ?? activeTab?.repoPath ?? null;
  const gitStatus = useGitStore((s) =>
    activeTabCwd ? s.projectGitStatus[activeTabCwd] ?? null : null,
  );

  const anyOverlay = settingsActive || launcherActive || gitPanelActive || commandsPanelActive || usagePanelActive;

  const handleSelectTab = (tabId: string) => {
    useUIStore.getState().deactivateSettings();
    useUIStore.getState().deactivateLauncher();
    useUIStore.getState().deactivateGitPanel();
    useUIStore.getState().deactivateCommandsPanel();
    useUIStore.getState().deactivateUsagePanel();
    setActiveTab(tabId);
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) useTerminalStore.getState().clearTabBell(tab.ptyId);
  };

  return (
    <div className="tab-bar">
      <div
        ref={containerRef}
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
        role="tablist"
        aria-label="Workspace tabs"
      >
        {tabs.map((tab, i) => {
          const isActive = tab.id === activeTabId && !anyOverlay;
          const isDragging = tab.id === dragTabId;
          const logoUrl = tab.assistantId
            ? assistantLogoSrc[tab.assistantId]
            : null;

          const showDropBefore = dropIndex !== null && dragTabId && tab.id !== dragTabId && dropIndex === i;
          const showDropAfter = dropIndex !== null && dragTabId && tab.id !== dragTabId && dropIndex === i + 1 && i === tabs.length - 1;

          return (
            <div
              key={tab.id}
              data-tab-index={i}
              className={`tab ${isActive ? "active" : ""}${isDragging ? " dragging" : ""}${showDropBefore ? " drop-before" : ""}${showDropAfter ? " drop-after" : ""}`}
              onClick={() => {
                if (!dragRef.current.didDrag) handleSelectTab(tab.id);
              }}
              onKeyDown={(event) => handleActionKey(event, () => handleSelectTab(tab.id))}
              onPointerDown={(e) => handlePointerDown(e, tab.id)}
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              aria-label={`Open tab ${tab.label}`}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="" width={12} height={12} />
              ) : null}
              {editingTabId === tab.id ? (
                <input
                  className="tab-rename-input"
                  defaultValue={tab.label}
                  autoFocus
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  onFocus={(e) => e.target.select()}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val && val !== tab.label) updateTab(tab.id, { label: val });
                    setEditingTabId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") {
                      e.currentTarget.value = tab.label;
                      e.currentTarget.blur();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="truncate max-w-32"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingTabId(tab.id);
                  }}
                >
                  {tab.label}
                </span>
              )}
              <button
                className="icon-btn ml-0.5"
                aria-label={`Close tab ${tab.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
              >
                ×
              </button>
            </div>
          );
        })}

        {launcherOpen && (
          <div
            className={`tab ${launcherActive ? "active" : ""}`}
            onClick={activateLauncher}
            onKeyDown={(event) => handleActionKey(event, activateLauncher)}
            role="tab"
            tabIndex={0}
            aria-selected={launcherActive}
            aria-label="Open new AI assistant panel"
          >
            <span>+</span>
            <span>New AI Assistant</span>
            <button
              className="icon-btn ml-0.5"
              aria-label="Close new session panel"
              onClick={(e) => {
                e.stopPropagation();
                closeLauncher();
              }}
            >
              ×
            </button>
          </div>
        )}

        {gitPanelOpen && (
          <div
            className={`tab ${gitPanelActive ? "active" : ""}`}
            onClick={activateGitPanel}
            onKeyDown={(event) => handleActionKey(event, activateGitPanel)}
            role="tab"
            tabIndex={0}
            aria-selected={gitPanelActive}
            aria-label="Open Git panel"
          >
            <GitBranch size={12} />
            <span>Git</span>
            <button
              className="icon-btn ml-0.5"
              aria-label="Close Git panel"
              onClick={(e) => {
                e.stopPropagation();
                closeGitPanel();
              }}
            >
              ×
            </button>
          </div>
        )}

        {commandsPanelOpen && (
          <div
            className={`tab ${commandsPanelActive ? "active" : ""}`}
            onClick={activateCommandsPanel}
            onKeyDown={(event) => handleActionKey(event, activateCommandsPanel)}
            role="tab"
            tabIndex={0}
            aria-selected={commandsPanelActive}
            aria-label="Open commands panel"
          >
            <Terminal size={12} />
            <span>Commands</span>
            <button
              className="icon-btn ml-0.5"
              aria-label="Close commands panel"
              onClick={(e) => {
                e.stopPropagation();
                closeCommandsPanel();
              }}
            >
              ×
            </button>
          </div>
        )}

        {usageTabOpen && (
          <div
            className={`tab ${usagePanelActive ? "active" : ""}`}
            onClick={activateUsagePanel}
            onKeyDown={(event) => handleActionKey(event, activateUsagePanel)}
            role="tab"
            tabIndex={0}
            aria-selected={usagePanelActive}
            aria-label="Open usage panel"
          >
            <ChartNoAxesCombined size={12} />
            <span>Usage</span>
            <button
              className="icon-btn ml-0.5"
              aria-label="Close usage panel"
              onClick={(e) => {
                e.stopPropagation();
                closeUsageTab();
              }}
            >
              ×
            </button>
          </div>
        )}

        {settingsTabOpen && (
          <div
            className={`tab ${settingsActive ? "active" : ""}`}
            onClick={activateSettings}
            onKeyDown={(event) => handleActionKey(event, activateSettings)}
            role="tab"
            tabIndex={0}
            aria-selected={settingsActive}
            aria-label="Open settings panel"
          >
            <GearIcon size={12} />
            <span>Settings</span>
            <button
              className="icon-btn ml-0.5"
              aria-label="Close settings panel"
              onClick={(e) => {
                e.stopPropagation();
                closeSettingsTab();
              }}
            >
              ×
            </button>
          </div>
        )}

        <NewSessionButton onNewAssistant={onNewAssistant} onNewShell={onNewShell} />
      </div>

      {import.meta.env.DEV && <DevMemory />}

      {gitStatus?.is_git_repo && (
        <div
          className="flex items-center gap-1.5 shrink-0 text-xs pl-3 border-l border-white/8 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={openGitPanel}
          onKeyDown={(event) => handleActionKey(event, openGitPanel)}
          title="Open Git panel"
          role="button"
          tabIndex={0}
          aria-label={`Open Git panel for branch ${gitStatus.branch}`}
        >
          <GitBranch size={12} />
          <span className="truncate max-w-32">{gitStatus.branch}</span>
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: gitStatus.dirty
                ? "rgb(251, 191, 36)"
                : "rgb(74, 222, 128)",
            }}
          />
        </div>
      )}
    </div>
  );
}
