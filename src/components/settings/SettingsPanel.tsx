import { useEffect } from "react";
import { EDITOR_OPTIONS } from "../../lib/editors";
import { THEME_LIST } from "../../lib/themes";
import { useEditorStore } from "../../stores/useEditorStore";
import { useThemeStore } from "../../stores/useThemeStore";

export default function SettingsPanel() {
  const themeId = useThemeStore((s) => s.themeId);
  const setTheme = useThemeStore((s) => s.setTheme);
  const settings = useEditorStore((s) => s.settings);
  const hasLoaded = useEditorStore((s) => s.hasLoaded);
  const isSaving = useEditorStore((s) => s.isSaving);
  const error = useEditorStore((s) => s.error);
  const loadSettings = useEditorStore((s) => s.loadSettings);
  const setPreferredEditor = useEditorStore((s) => s.setPreferredEditor);

  useEffect(() => {
    if (!hasLoaded) {
      void loadSettings();
    }
  }, [hasLoaded, loadSettings]);

  return (
    <div className="absolute inset-0 overflow-y-auto p-6">
      <h2 className="section-label !p-0 mb-4">Theme</h2>

      <div className="flex flex-wrap gap-3">
        {THEME_LIST.map((t) => {
          const active = t.id === themeId;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`option-card min-w-44 ${active ? "selected" : ""}`}
            >
              <div
                className="shrink-0 rounded-full"
                style={{
                  width: 24,
                  height: 24,
                  background: `linear-gradient(135deg, ${t.ambientOrb1} 0%, ${t.bgLinearMid} 50%, ${t.ambientOrb3} 100%)`,
                  outline: active
                    ? "2px solid rgba(255,255,255,0.7)"
                    : "2px solid transparent",
                  outlineOffset: 2,
                }}
              />
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>

      <h2 className="section-label !p-0 mt-8 mb-2">Editor</h2>
      <p className="text-sm text-white/55 mb-4 max-w-2xl">
        Choose the app Shep should use when you open the selected project from the sidebar.
      </p>

      <div className="flex flex-wrap gap-3">
        {EDITOR_OPTIONS.map((option) => {
          const active = option.id === settings.preferredEditor;
          return (
            <button
              key={option.id}
              onClick={() => void setPreferredEditor(option.id)}
              className={`option-card min-w-44 ${active ? "selected" : ""}`}
            >
              <img
                src={option.logoSrc}
                alt=""
                width={20}
                height={20}
                className="shrink-0"
              />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 text-sm text-white/50">
        {isSaving
          ? "Saving editor preference..."
          : settings.preferredEditor
            ? "Sidebar actions will open projects directly in your chosen editor."
            : "When no editor is set, the sidebar action sends you here to configure one."}
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
