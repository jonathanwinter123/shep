import type { CodingAssistant } from "../../lib/types";
import { CircleSmall } from "lucide-react";
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
  isRunning?: boolean;
  onClick: () => void;
}

export default function AssistantButton({
  assistant,
  isRunning = false,
  onClick,
}: AssistantButtonProps) {
  const Logo = logoComponents[assistant.id];

  return (
    <button className="list-item w-full" onClick={onClick} title={`Launch ${assistant.name}`}>
      {Logo && <Logo size={14} />}
      <span className="truncate flex-1 text-left">{assistant.name}</span>
      {isRunning && <CircleSmall size={14} className="shrink-0" fill="var(--status-running)" stroke="none" />}
    </button>
  );
}
