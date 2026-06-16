import {
  getRecurrenceLabel,
  RECURRENCE_PRESETS,
  type RecurrencePresetId,
} from "@/lib/appointments";

export function RecurrencePresetPicker({
  value,
  onChange,
  optional = false,
}: {
  value: number | null;
  onChange: (days: number | null) => void;
  optional?: boolean;
}) {
  const selectedPreset = RECURRENCE_PRESETS.find((p) => p.days === value);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {optional && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={`rounded-xl px-3 py-2 text-[11px] font-bold border transition-colors ${
              value === null
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            Sem repetição
          </button>
        )}
        {RECURRENCE_PRESETS.map((preset) => {
          const active = selectedPreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.days)}
              className={`rounded-xl px-3 py-2 text-[11px] font-bold border transition-colors ${
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {preset.shortLabel}
            </button>
          );
        })}
      </div>
      {value !== null && (
        <p className="text-[10px] text-muted-foreground">
          {getRecurrenceLabel(value)} — ao concluir, o próximo agendamento é criado automaticamente.
        </p>
      )}
    </div>
  );
}

export function defaultRecurrenceForKind(kind: string): number | null {
  if (kind === "retorno" || kind === "avaliacao") {
    return RECURRENCE_PRESETS.find((p) => p.id === "mensal")!.days;
  }
  return null;
}

export type { RecurrencePresetId };
