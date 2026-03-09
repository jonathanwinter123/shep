import { CODING_ASSISTANTS } from "./constants";
import AssistantButton from "./AssistantButton";

interface AssistantListProps {
  onLaunch: (assistantId: string) => void;
}

export default function AssistantList({ onLaunch }: AssistantListProps) {
  return (
    <div className="flex flex-col gap-0.5 px-1">
      {CODING_ASSISTANTS.map((assistant) => (
        <AssistantButton
          key={assistant.id}
          assistant={assistant}
          onClick={() => onLaunch(assistant.id)}
        />
      ))}
    </div>
  );
}
