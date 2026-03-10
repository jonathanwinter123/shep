import { CODING_ASSISTANTS } from "./constants";
import AssistantButton from "./AssistantButton";

interface AssistantListProps {
  onLaunch: (assistantId: string) => void;
  runningAssistantIds: string[];
}

export default function AssistantList({ onLaunch, runningAssistantIds }: AssistantListProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {CODING_ASSISTANTS.map((assistant) => (
        <AssistantButton
          key={assistant.id}
          assistant={assistant}
          isRunning={runningAssistantIds.includes(assistant.id)}
          onClick={() => onLaunch(assistant.id)}
        />
      ))}
    </div>
  );
}
