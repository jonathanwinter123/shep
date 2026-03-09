interface SectionHeaderProps {
  label: string;
}

export default function SectionHeader({ label }: SectionHeaderProps) {
  return (
    <div className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 select-none">
      {label}
    </div>
  );
}
