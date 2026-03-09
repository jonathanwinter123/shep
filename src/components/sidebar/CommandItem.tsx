import type { CommandState } from "../../lib/types";

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
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors group">
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isRunning
            ? "bg-green-500"
            : command.status === "crashed"
              ? "bg-red-500"
              : "bg-gray-500"
        }`}
      />

      <button
        className="flex-1 text-left text-[13px] text-gray-400 truncate hover:text-gray-200"
        onClick={onFocus}
        title={command.command}
      >
        {command.name}
      </button>

      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {isRunning ? (
          <button
            className="text-gray-500 hover:text-white transition-colors p-0.5"
            onClick={onStop}
            title="Stop"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1" y="1" width="8" height="8" rx="1" />
            </svg>
          </button>
        ) : (
          <button
            className="text-gray-500 hover:text-white transition-colors p-0.5"
            onClick={onStart}
            title="Start"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <polygon points="2,1 9,5 2,9" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
