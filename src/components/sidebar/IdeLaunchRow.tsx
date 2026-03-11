import { CodeXml } from "lucide-react";
import { useUIStore } from "../../stores/useUIStore";

interface IdeLaunchRowProps {
  repoPath: string;
  onOpenInEditor: (repoPath: string) => void;
}

export default function IdeLaunchRow({
  repoPath,
  onOpenInEditor,
}: IdeLaunchRowProps) {
  const settingsActive = useUIStore((s) => s.settingsActive);

  return (
    <div className="mt-1">
      <button
        onClick={() => onOpenInEditor(repoPath)}
        className={`section-toggle ${settingsActive ? "!text-[var(--text-primary)] !bg-white/6" : ""}`}
      >
        <CodeXml size={14} className="shrink-0" />
        <span className="truncate">Open in IDE</span>
      </button>
    </div>
  );
}
