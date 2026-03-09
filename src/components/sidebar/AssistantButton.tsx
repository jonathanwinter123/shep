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
      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors"
      onClick={onClick}
      title={`Launch ${assistant.name}`}
    >
      {Logo && (
        <span className="shrink-0 text-gray-400">
          <Logo size={16} />
        </span>
      )}
      <span className="truncate">{assistant.name}</span>
    </button>
  );
}
