import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Loader2, Save } from "lucide-react";
import { AppointmentHistoryList } from "@/components/appointments/AppointmentHistoryList";
import { RecurrencePresetPicker } from "@/components/professional/RecurrencePresetPicker";
import {
  APPOINTMENT_KIND_LABELS,
  addDays,
  daysUntil,
  fetchStudentAppointmentHistory,
  fetchStudentFollowUp,
  formatAppointmentDate,
  getRecurrenceLabel,
  updateStudentFollowUpPlan,
  type AppointmentKind,
} from "@/lib/appointments";

interface Props {
  alunoId: string;
  personalId: string;
}

const FOLLOW_UP_KIND_OPTIONS: AppointmentKind[] = ["retorno", "avaliacao"];

export function StudentAgendaPanel({ alunoId, personalId }: Props) {
  const qc = useQueryClient();
  const { data: followUp, isLoading: loadingFollowUp } = useQuery({
    queryKey: ["studentFollowUp", personalId, alunoId],
    queryFn: () => fetchStudentFollowUp(personalId, alunoId),
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["studentAppointmentHistory", personalId, alunoId],
    queryFn: () => fetchStudentAppointmentHistory(personalId, alunoId),
  });

  const [intervalDays, setIntervalDays] = useState<number>(30);
  const [kind, setKind] = useState<AppointmentKind>("retorno");

  useEffect(() => {
    if (followUp) {
      setIntervalDays(followUp.interval_days);
      setKind(followUp.kind);
    }
  }, [followUp]);

  const savePlan = useMutation({
    mutationFn: () => {
      if (!intervalDays) throw new Error("Selecione a periodicidade");
      return updateStudentFollowUpPlan(alunoId, intervalDays, kind);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["studentFollowUp", personalId, alunoId] });
      void qc.invalidateQueries({ queryKey: ["followUpAlerts", personalId] });
    },
  });

  const isLoading = loadingFollowUp || loadingHistory;

  const nextDue =
    followUp?.last_visit_at && followUp.interval_days
      ? addDays(new Date(followUp.last_visit_at), followUp.interval_days)
      : null;
  const daysLeft = nextDue ? daysUntil(nextDue) : null;

  const planDirty =
    followUp && (intervalDays !== followUp.interval_days || kind !== followUp.kind);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <CalendarCheck className="size-4 text-primary" />
          Plano do aluno
        </h2>
        <p className="text-[10px] text-muted-foreground mt-1">
          Definido no convite. Usado automaticamente em retornos e reavaliações.
        </p>

        {isLoading && !followUp ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Tipo de acompanhamento
              </span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as AppointmentKind)}
                className="field-input"
              >
                {FOLLOW_UP_KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {APPOINTMENT_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Periodicidade
              </span>
              <RecurrencePresetPicker value={intervalDays} onChange={setIntervalDays} />
            </div>

            {followUp?.last_visit_at && (
              <p className="text-xs text-muted-foreground">
                Último realizado:{" "}
                <span className="text-foreground font-medium">
                  {formatAppointmentDate(followUp.last_visit_at)}
                </span>
              </p>
            )}

            {nextDue && daysLeft !== null && (
              <p
                className={`text-xs font-semibold ${
                  daysLeft < 0
                    ? "text-destructive"
                    : daysLeft <= 7
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-primary"
                }`}
              >
                {daysLeft < 0
                  ? `Atrasado há ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) === 1 ? "" : "s"}`
                  : daysLeft === 0
                    ? "Próximo vence hoje"
                    : `Próximo previsto em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}`}
                {" · "}
                {nextDue.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}

            {(planDirty || !followUp) && (
              <button
                type="button"
                disabled={savePlan.isPending || !intervalDays}
                onClick={() => savePlan.mutate()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
              >
                {savePlan.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Salvar plano
              </button>
            )}

            {followUp && !planDirty && (
              <p className="text-[10px] text-muted-foreground">
                Plano ativo: {getRecurrenceLabel(followUp.interval_days)} ·{" "}
                {APPOINTMENT_KIND_LABELS[followUp.kind]}
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold mb-3">Histórico de agendamentos</h3>
        {loadingHistory ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <AppointmentHistoryList items={history} />
        )}
      </div>
    </div>
  );
}
