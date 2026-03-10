import { useState } from "react";
import { ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  label: string;
  badge?: string | number | null;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  label,
  badge,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mt-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="section-toggle"
      >
        <ChevronRight
          size={14}
          className="shrink-0 transition-transform duration-150"
          style={{ transform: isOpen ? "rotate(90deg)" : undefined }}
        />
        <span className="flex-1 text-left">{label}</span>
        {!isOpen && badge != null && (
          <span className="badge">{badge}</span>
        )}
      </button>
      {isOpen && (
        <div className="flex flex-col gap-0.5 mt-0.5 pl-4">
          {children}
        </div>
      )}
    </div>
  );
}
