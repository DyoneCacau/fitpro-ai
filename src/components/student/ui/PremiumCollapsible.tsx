import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PremiumCollapsible({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={open}
      >
        {Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        )}
        <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function TimelineList({ children }: { children: ReactNode }) {
  return <ul className="relative space-y-0 pl-1">{children}</ul>;
}

export function TimelineItem({
  children,
  isLast = false,
  marker,
}: {
  children: ReactNode;
  isLast?: boolean;
  marker?: ReactNode;
}) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      <div className="flex flex-col items-center shrink-0">
        <div className="flex size-6 items-center justify-center rounded-full border-2 border-primary/30 bg-background text-primary z-10">
          {marker ?? <span className="size-2 rounded-full bg-primary/60" />}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1 min-h-[12px]" />}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">{children}</div>
    </li>
  );
}

export function PeriodPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors",
            value === opt.id
              ? "bg-primary text-primary-foreground shadow-glow"
              : "bg-card border border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
