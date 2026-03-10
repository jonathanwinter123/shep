interface SectionHeaderProps {
  label: string;
}

export default function SectionHeader({ label }: SectionHeaderProps) {
  return (
    <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300/42 select-none">
      {label}
    </div>
  );
}
