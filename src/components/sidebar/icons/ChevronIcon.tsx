interface ChevronIconProps {
  size?: number;
  open?: boolean;
}

export default function ChevronIcon({ size = 10, open = false }: ChevronIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 transition-transform duration-150"
      style={{ transform: open ? "rotate(90deg)" : undefined }}
    >
      <path d="M3.5 2L6.5 5L3.5 8" />
    </svg>
  );
}
