import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, Check, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { QuickAppointmentModal, type StudentOption } from "@/components/professional/QuickAppointmentModal";
import {
  APPOINTMENT_KIND_LABELS,
  cancelAppointment,
  completeAppointment,
  fetchFollowUpAlerts,
  formatAlertMessage,
  formatRecurrenceInfo,
  fetchTodayAppointments,
  formatAppointmentTime,
  type AppointmentKind,
  type StudentAppointment,
} from "@/lib/appointments";

export function ProfessionalHomeAgenda({
  personalId,
  students,
}: {
  personalId: string;
  students: StudentOption[];
}) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) {
      map.set(s.id, s.full_name?.trim() || "Aluno");
    }
    return map;
  }, [students]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["todayAppointments", personalId] });
    void qc.invalidateQueries({ queryKey: ["followUpAlerts", personalId] });
    void qc.invalidateQueries({ queryKey: ["studentAppointmentHistory"] });
    void qc.invalidateQueries({ queryKey: ["studentFollowUp"] });
    void qc.invalidateQueries({ queryKey: ["studentScheduledAppointments"] });
  };

  const { data: today = [], isLoading } = useQuery({
    queryKey: ["todayAppointments", personalId],
    queryFn: () => fetchTodayAppointments(personalId),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["followUpAlerts", personalId],
    queryFn: () => fetchFollowUpAlerts(personalId, nameById),
    enabled: nameById.size > 0,
  });

  const complete = useMutation({
    mutationFn: completeAppointment,
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: invalidate,
  });

  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="px-5 pb-8 space-y-6">
      {alerts.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-amber-500" />
            Sugestões de retorno
          </h2>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Link
                key={alert.alunoId}
                to="/alunos/$alunoId"
                params={{ alunoId: alert.alunoId }}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors active:scale-[0.99] ${
                  alert.overdue
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{alert.studentName}</p>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      alert.overdue ? "text-destructive" : "text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {formatAlertMessage(alert)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Último:{" "}
                    {new Date(alert.lastVisitAt!).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" />
              Agenda de hoje
            </h2>
            <p className="text-[10px] text-muted-foreground capitalize">{todayLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-2 text-[11px] font-bold text-primary"
          >
            <Plus className="size-3.5" />
            Agendar
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : today.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-5 text-center">
            <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje.</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Retorno e avaliação usam o plano definido no cadastro do aluno.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-3 text-xs font-semibold text-primary"
            >
              Criar agendamento
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {today.map((ap) => (
              <AppointmentRow
                key={ap.id}
                appointment={ap}
                studentName={nameById.get(ap.aluno_id) ?? "Aluno"}
                onComplete={() => complete.mutate(ap.id)}
                onCancel={() => cancel.mutate(ap.id)}
                busy={complete.isPending || cancel.isPending}
              />
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <QuickAppointmentModal
          personalId={personalId}
          students={students}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            invalidate();
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

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

function AppointmentRow({
  appointment,
  studentName,
  onComplete,
  onCancel,
  busy,
}: {
  appointment: StudentAppointment;
  studentName: string;
  onComplete: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const recurrenceInfo = formatRecurrenceInfo(appointment);

  return (
    <div className="rounded-2xl border border-border bg-card p-3 flex gap-3 items-start">
      <div className="shrink-0 text-center min-w-[44px]">
        <p className="text-sm font-black text-primary leading-none">
          {formatAppointmentTime(appointment.scheduled_at)}
        </p>
        <p className="text-[9px] text-muted-foreground mt-0.5">{appointment.duration_minutes} min</p>
      </div>
      <div className="flex-1 min-w-0">
        <Link
          to="/alunos/$alunoId"
          params={{ alunoId: appointment.aluno_id }}
          className="text-sm font-semibold truncate block hover:text-primary"
        >
          {studentName}
        </Link>
        <span
          className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${kindBadgeClass(appointment.kind)}`}
        >
          {APPOINTMENT_KIND_LABELS[appointment.kind]}
        </span>
        {recurrenceInfo && (
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">{recurrenceInfo}</p>
        )}
        {appointment.notes && (
          <p className="text-[10px] text-foreground/80 mt-1 line-clamp-2">{appointment.notes}</p>
        )}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          disabled={busy}
          onClick={onComplete}
          className="p-1.5 rounded-lg bg-primary/10 text-primary"
          aria-label="Concluir"
          title="Concluir — gera próximo se houver recorrência"
        >
          <Check className="size-4" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive"
          aria-label="Cancelar"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
