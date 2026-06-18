import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  APPOINTMENT_KIND_LABELS,
  createAppointment,
  fetchStudentFollowUp,
  getAppointmentErrorMessage,
  getRecurrenceLabel,
  type AppointmentKind,
} from "@/lib/appointments";

export type StudentOption = { id: string; full_name: string | null };

type Props = {
  personalId: string;
  students: StudentOption[];
  onClose: () => void;
  onSaved: () => void;
  defaultAlunoId?: string;
  defaultScheduledAt?: string;
  title?: string;
};

function defaultDateTime(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d.toISOString().slice(0, 16);
}

export function QuickAppointmentModal({
  personalId,
  students,
  onClose,
  onSaved,
  defaultAlunoId,
  defaultScheduledAt,
  title = "Novo agendamento",
}: Props) {
  const lockStudent = !!defaultAlunoId;
  const [alunoId, setAlunoId] = useState(defaultAlunoId ?? students[0]?.id ?? "");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt ?? defaultDateTime());
  const [kind, setKind] = useState<AppointmentKind>("treino");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usesPlan = kind === "retorno" || kind === "avaliacao";

  const { data: studentPlan } = useQuery({
    queryKey: ["studentFollowUp", personalId, alunoId],
    queryFn: () => fetchStudentFollowUp(personalId, alunoId),
    enabled: !!alunoId && usesPlan,
  });

  const selectedName =
    students.find((s) => s.id === alunoId)?.full_name?.trim() ||
    (lockStudent ? "Aluno" : "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!alunoId) return;
    setSaving(true);
    setError(null);
    try {
      await createAppointment({
        personal_id: personalId,
        aluno_id: alunoId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        kind,
        notes,
      });
      onSaved();
    } catch (err) {
      setError(getAppointmentErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
          <h3 className="text-sm font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 text-muted-foreground">
            <X className="size-5" />
          </button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="p-4 space-y-3">
          {lockStudent ? (
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
              <p className="text-[10px] uppercase text-muted-foreground">Cliente</p>
              <p className="text-sm font-semibold">{selectedName}</p>
            </div>
          ) : (
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground">Aluno</span>
              <select
                value={alunoId}
                onChange={(e) => setAlunoId(e.target.value)}
                className="field-input"
                required
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name?.trim() || "Aluno"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Data e hora</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="field-input"
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Tipo</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as AppointmentKind)}
              className="field-input"
            >
              {Object.entries(APPOINTMENT_KIND_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {usesPlan && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-[11px] font-semibold text-foreground">Plano do aluno</p>
              {studentPlan ? (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {APPOINTMENT_KIND_LABELS[studentPlan.kind]} ·{" "}
                  {getRecurrenceLabel(studentPlan.interval_days)}
                </p>
              ) : (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                  Plano não definido. Configure na aba Agenda do aluno ou no convite.
                </p>
              )}
            </div>
          )}
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Observação</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="field-input"
              placeholder="Opcional"
            />
          </label>
          <p className="text-[10px] text-muted-foreground">
            Agendamentos de hoje aparecem na agenda da página inicial.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={saving || !alunoId || (usesPlan && !studentPlan)}
            className="w-full rounded-2xl bg-gradient-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar agendamento"}
          </button>
        </form>
      </div>
    </div>
  );
}
