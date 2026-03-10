import type { CommandState } from "../../lib/types";
import { Play, Square } from "lucide-react";

interface CommandItemProps {
  command: CommandState;
  onStart: () => void;
  onStop: () => void;
  onFocus: () => void;
}

export default function CommandItem({
  command,
  onStart,
  onStop,
  onFocus,
}: CommandItemProps) {
  const isRunning = command.status === "running";

  return (
    <div className="list-item">
      <button
        className="flex-1 text-left truncate"
        onClick={onFocus}
        title={command.command}
      >
        {command.name}
      </button>

      {isRunning ? (
        <button
          className="icon-btn shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onStop();
          }}
          title="Stop"
        >
          <Square size={14} fill="currentColor" />
        </button>
      ) : (
        <button
          className="icon-btn shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
          title="Start"
        >
          <Play size={14} fill="currentColor" />
        </button>
      )}
    </div>
  );
}
