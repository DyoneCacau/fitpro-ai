const DIET_WEEK_DAYS = [
  { id: 1, label: "SEG" },
  { id: 2, label: "TER" },
  { id: 3, label: "QUA" },
  { id: 4, label: "QUI" },
  { id: 5, label: "SEX" },
  { id: 6, label: "SAB" },
] as const;

export function defaultDietWeekDay(): number {
  const today = new Date().getDay();
  if (today >= 1 && today <= 6) return today;
  return 1;
}

export function DietWeekDayTabs({
  selectedDay,
  onSelectDay,
}: {
  selectedDay: number;
  onSelectDay: (day: number) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
      {DIET_WEEK_DAYS.map((day) => {
        const active = selectedDay === day.id;
        return (
          <button
            key={day.id}
            type="button"
            onClick={() => onSelectDay(day.id)}
            className={`shrink-0 min-w-[2.75rem] rounded-lg px-2.5 py-2 text-[11px] font-black tracking-wide transition-colors ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}
