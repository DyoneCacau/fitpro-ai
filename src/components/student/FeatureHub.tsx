import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

export function FeatureHubCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-border bg-card p-4 flex items-center gap-4 text-left active:scale-[0.99] transition-transform"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function SubPageHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <header className="bg-gradient-hero px-5 pt-10 pb-5 border-b border-border/40">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-semibold text-primary mb-3"
      >
        ← Voltar
      </button>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      {subtitle && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>}
    </header>
  );
}

export function WeekDayTabs({
  selectedDay,
  onSelectDay,
}: {
  selectedDay: number;
  onSelectDay: (day: number) => void;
}) {
  const days = [
    { id: 0, short: "Dom" },
    { id: 1, short: "Seg" },
    { id: 2, short: "Ter" },
    { id: 3, short: "Qua" },
    { id: 4, short: "Qui" },
    { id: 5, short: "Sex" },
    { id: 6, short: "Sab" },
  ];

  return (
    <div className="flex border-b border-border overflow-x-auto">
      {days.map((d) => {
        const active = selectedDay === d.id;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelectDay(d.id)}
            className={`flex-1 min-w-[44px] py-3 text-xs font-bold transition-colors ${
              active ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            {d.short}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
