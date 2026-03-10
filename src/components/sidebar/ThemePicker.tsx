import { THEME_LIST } from "../../lib/themes";
import { useThemeStore } from "../../stores/useThemeStore";

export default function ThemePicker() {
  const themeId = useThemeStore((s) => s.themeId);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="flex items-center gap-2 px-2 py-3 border-t border-white/8">
      {THEME_LIST.map((t) => {
        const active = t.id === themeId;
        return (
          <button
            key={t.id}
            title={t.name}
            onClick={() => setTheme(t.id)}
            className="shrink-0 rounded-full transition-transform duration-150"
            style={{
              width: 24,
              height: 24,
              background: `linear-gradient(135deg, ${t.ambientOrb1} 0%, ${t.bgLinearMid} 50%, ${t.ambientOrb3} 100%)`,
              outline: active ? "2px solid rgba(255,255,255,0.8)" : "2px solid transparent",
              outlineOffset: 2,
              transform: active ? "scale(1.15)" : "scale(1)",
              cursor: "pointer",
              border: "none",
            }}
          />
        );
      })}
    </div>
  );
}
