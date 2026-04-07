import claudeSrc from "../../assets/claude.svg";
import codexSrc from "../../assets/openai.svg";
import geminiSrc from "../../assets/gemini.svg";
import opencodeSrc from "../../assets/opencode.svg";

export const assistantLogoSrc: Record<string, string> = {
  claude: claudeSrc,
  codex: codexSrc,
  gemini: geminiSrc,
  opencode: opencodeSrc,
};

const MONO_ASSISTANT_LOGOS = new Set(["codex"]);

export function getAssistantLogoClass(assistantId: string): string | undefined {
  return MONO_ASSISTANT_LOGOS.has(assistantId) ? "themed-mono-logo" : undefined;
}
