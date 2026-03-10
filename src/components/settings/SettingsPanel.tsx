import { THEME_LIST } from "../../lib/themes";
import { useThemeStore } from "../../stores/useThemeStore";

export default function SettingsPanel() {
  const themeId = useThemeStore((s) => s.themeId);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="absolute inset-0 overflow-y-auto p-6">
      <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
        Theme
      </h2>

      <div className="flex flex-wrap gap-3">
        {THEME_LIST.map((t) => {
          const active = t.id === themeId;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all cursor-pointer ${
                active
                  ? "border-white/20 bg-white/8"
                  : "border-white/8 bg-white/3 hover:border-white/14 hover:bg-white/5"
              }`}
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
              <span
                className={`text-sm ${active ? "text-white" : "text-slate-300/70"}`}
              >
                {t.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
