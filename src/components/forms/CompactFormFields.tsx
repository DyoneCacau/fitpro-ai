export const compactInputClass =
  "field-input field-input-compact w-full text-right tabular-nums [appearance:textfield]";

export const compactSelectClass = "field-input field-input-compact w-full text-xs";

export const compactTextareaClass =
  "field-input field-input-compact field-textarea-compact w-full text-xs leading-snug";

export function CompactMetricField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className="grid w-full grid-cols-[minmax(0,1fr)_minmax(4.5rem,38%)] items-center gap-2 py-1">
      <span className="text-[10px] font-medium text-muted-foreground leading-snug">{label}</span>
      <div className="min-w-0">{children}</div>
    </label>
  );
}

export function CompactBlockField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mt-1.5">
      <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
      <div className="mt-0.5">{children}</div>
      {hint && <p className="mt-0.5 text-[9px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CompactSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider text-primary mt-2 mb-0.5">{children}</p>
  );
}

export function CompactMetricGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-4 gap-y-0 sm:grid-cols-2">{children}</div>;
}

export function CompactMetricRow({ children }: { children: React.ReactNode }) {
  return <div className="w-full">{children}</div>;
}
