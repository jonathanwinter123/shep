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
      <div className="px-4 py-2 text-[12px] text-slate-300/42">
        Edit .shep/workspace.yml to add commands
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-1">
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
