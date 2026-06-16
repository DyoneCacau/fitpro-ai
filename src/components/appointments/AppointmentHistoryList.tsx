import {
  APPOINTMENT_KIND_LABELS,
  formatAppointmentTime,
  getRecurrenceLabel,
  type AppointmentKind,
  type AppointmentStatus,
  type StudentAppointment,
} from "@/lib/appointments";

function kindBadgeClass(kind: AppointmentKind): string {
  switch (kind) {
    case "retorno":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "avaliacao":
      return "bg-violet-500/15 text-violet-600 dark:text-violet-400";
    case "consulta":
      return "bg-sky-500/15 text-sky-600 dark:text-sky-400";
    default:
      return "bg-primary/15 text-primary";
  }
}

function statusLabel(status: AppointmentStatus): string {
  switch (status) {
    case "completed":
      return "Concluído";
    case "cancelled":
      return "Cancelado";
    default:
      return "Agendado";
  }
}

export function AppointmentHistoryList({
  items,
  emptyMessage = "Nenhum agendamento registrado ainda.",
}: {
  items: StudentAppointment[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-5 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-border bg-card/60 p-3 flex items-start gap-3"
        >
          <div className="shrink-0 text-center min-w-[52px]">
            <p className="text-[10px] font-bold text-primary uppercase leading-tight">
              {new Date(item.scheduled_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}
            </p>
            <p className="text-[9px] text-muted-foreground">
              {formatAppointmentTime(item.scheduled_at)}
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${kindBadgeClass(item.kind)}`}
              >
                {APPOINTMENT_KIND_LABELS[item.kind]}
              </span>
              <span className="text-[10px] text-muted-foreground">{statusLabel(item.status)}</span>
            </div>
            {item.recurrence_days && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Plano: {getRecurrenceLabel(item.recurrence_days)}
              </p>
            )}
            {item.notes && (
              <p className="text-[10px] text-foreground/80 mt-1 line-clamp-2">{item.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
