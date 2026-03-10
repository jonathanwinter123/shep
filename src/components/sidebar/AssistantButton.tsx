import type { CodingAssistant } from "../../lib/types";
import ClaudeLogo from "./icons/ClaudeLogo";
import CodexLogo from "./icons/CodexLogo";
import GeminiLogo from "./icons/GeminiLogo";

const logoComponents: Record<string, React.ComponentType<{ size?: number }>> = {
  claude: ClaudeLogo,
  codex: CodexLogo,
  gemini: GeminiLogo,
};

interface AssistantButtonProps {
  assistant: CodingAssistant;
  onClick: () => void;
}

export default function AssistantButton({
  assistant,
  onClick,
}: AssistantButtonProps) {
  const Logo = logoComponents[assistant.id];

  return (
    <button
      className="glass-button w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-slate-300/72 hover:text-slate-100"
      onClick={onClick}
      title={`Launch ${assistant.name}`}
    >
      {Logo && (
        <span className="shrink-0 text-slate-300/72">
          <Logo size={16} />
        </span>
      )}
      <span className="truncate">{assistant.name}</span>
    </button>
  );
}
