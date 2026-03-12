import { useState, type ReactNode } from "react";
import { ChevronRight, Plus } from "lucide-react";

interface CollapsibleSectionProps {
  label: string;
  icon: ReactNode;
  badge?: string | number | null;
  hasItems?: boolean;
  defaultOpen?: boolean;
  onAdd?: () => void;
  children: ReactNode;
}

export default function CollapsibleSection({
  label,
  icon,
  badge,
  hasItems = false,
  defaultOpen = true,
  onAdd,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleClick = () => {
    if (hasItems) {
      setIsOpen(!isOpen);
    } else if (onAdd) {
      onAdd();
    }
  };

  return (
    <>
      <div className="section-toggle group">
        <button
          onClick={handleClick}
          className="flex items-center gap-1.5 flex-1 min-w-0"
        >
          {hasItems ? (
            <ChevronRight
              size={14}
              className="shrink-0 transition-transform duration-150"
              style={{ transform: isOpen ? "rotate(90deg)" : undefined }}
            />
          ) : (
            <span className="shrink-0 w-[14px] flex items-center justify-center">{icon}</span>
          )}
          <span className="truncate">{label}</span>
          {badge != null && (
            <span className="badge">{badge}</span>
          )}
        </button>
        {hasItems && onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10"
            title={`New ${label.replace(/s$/, "").toLowerCase()}`}
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      {hasItems && isOpen && (
        <div className="tree-branch mt-0.5">
          {children}
        </div>
      )}
    </>
  );
}
