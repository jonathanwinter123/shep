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
      <div className="tree-node">
        <div className="px-2.5 py-1.5" style={{ color: "var(--text-muted)" }}>
          No commands configured
        </div>
      </div>
    );
  }

  return (
    <>
      {commands.map((cmd) => (
        <div key={cmd.name} className="tree-node">
          <CommandItem
            command={cmd}
            onStart={() => onStart(cmd.name)}
            onStop={() => onStop(cmd.name)}
            onFocus={() => onFocus(cmd.name)}
          />
        </div>
      ))}
    </>
  );
}
