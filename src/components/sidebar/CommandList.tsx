import type { CommandState } from "../../lib/types";
import CommandItem from "./CommandItem";

interface CommandListProps {
  commands: CommandState[];
  onStart: (name: string) => void;
  onStop: (name: string) => void;
  onFocus: (name: string) => void;
}

export default function CommandList({
  commands,
  onStart,
  onStop,
  onFocus,
}: CommandListProps) {
  if (commands.length === 0) {
    return (
      <div className="px-2.5 py-1.5" style={{ color: "var(--text-muted)" }}>
        No commands configured
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {commands.map((cmd) => (
        <CommandItem
          key={cmd.name}
          command={cmd}
          onStart={() => onStart(cmd.name)}
          onStop={() => onStop(cmd.name)}
          onFocus={() => onFocus(cmd.name)}
        />
      ))}
    </div>
  );
}
