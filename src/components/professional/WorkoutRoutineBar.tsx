import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Calendar,
  Copy,
  History,
  Loader2,
  Plus,
  Settings2,
  UserPlus,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyStudents } from "@/lib/students";
import {
  ROUTINE_LEVEL_LABELS,
  ROUTINE_SCHEDULE_LABELS,
  ROUTINE_STATUS_LABELS,
  cloneRoutineToStudent,
  createStudentRoutine,
  fetchPeerStudentRoutines,
  fetchStudentRoutines,
  fetchTemplateRoutines,
  formatRoutinePeriod,
  initialRoutineStatus,
  type RoutineLevel,
  type WorkoutRoutineRow,
  updateRoutine,
} from "@/lib/workout-routines";

interface Props {
  alunoId: string;
  personalId: string;
  routineId: string | null;
  onRoutineChange: (id: string | null) => void;
}

export function WorkoutRoutineBar({ alunoId, personalId, routineId, onRoutineChange }: Props) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showClone, setShowClone] = useState(false);
  const [showCopyToOther, setShowCopyToOther] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ["workoutRoutines", alunoId, personalId],
    queryFn: () => fetchStudentRoutines(alunoId, personalId),
  });

  const activeRoutines = useMemo(
    () => routines.filter((r) => r.status === "active" || r.status === "scheduled"),
    [routines],
  );
  const archivedRoutines = useMemo(() => routines.filter((r) => r.status === "archived"), [routines]);
  const selected = routines.find((r) => r.id === routineId) ?? null;

  useEffect(() => {
    if (isLoading) return;
    if (routines.length === 0) {
      onRoutineChange(null);
      return;
    }
    const preferred =
      activeRoutines.find((r) => r.status === "active") ??
      activeRoutines[0] ??
      routines[0];
    if (!routineId || !routines.some((r) => r.id === routineId)) {
      onRoutineChange(preferred?.id ?? null);
    }
  }, [isLoading, routines, activeRoutines, routineId, onRoutineChange]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["workoutRoutines", alunoId, personalId] });
    void qc.invalidateQueries({ queryKey: ["studentWorkouts", alunoId] });
  };

  const archiveRoutine = useMutation({
    mutationFn: async (id: string) => updateRoutine(id, { status: "archived" }),
    onSuccess: invalidate,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Periodização · rotina
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Libere treinos por fase da periodização
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-primary/10 border border-primary/30 px-3 py-2 text-[11px] font-bold text-primary"
        >
          <Plus className="size-3.5" /> Nova
        </button>
      </div>

      {activeRoutines.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {activeRoutines.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onRoutineChange(r.id)}
              className={`shrink-0 min-w-[140px] rounded-2xl border px-3 py-2.5 text-left transition-all ${
                routineId === r.id
                  ? "border-primary bg-primary/10 shadow-glow"
                  : "border-border bg-card"
              }`}
            >
              <p className="text-xs font-bold truncate">{r.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {ROUTINE_STATUS_LABELS[r.status]}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="rounded-2xl border border-border bg-card/60 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{selected.name}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="size-3" />
                {formatRoutinePeriod(selected)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {ROUTINE_LEVEL_LABELS[selected.level]}
                {selected.objective ? ` · ${selected.objective}` : ""}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                selected.status === "active"
                  ? "bg-primary/20 text-primary"
                  : selected.status === "scheduled"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {ROUTINE_STATUS_LABELS[selected.status]}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-bold"
            >
              <Settings2 className="size-3" /> Configurar
            </button>
            <button
              type="button"
              onClick={() => setShowClone(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-bold"
            >
              <Copy className="size-3" /> Clonar
            </button>
            <button
              type="button"
              onClick={() => setShowCopyToOther(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[10px] font-bold text-primary"
            >
              <UserPlus className="size-3" /> Copiar p/ aluno
            </button>
            {selected.status !== "archived" && (
              <button
                type="button"
                onClick={() => archiveRoutine.mutate(selected.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground"
              >
                <Archive className="size-3" /> Arquivar
              </button>
            )}
            {archivedRoutines.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-bold"
              >
                <History className="size-3" /> Histórico ({archivedRoutines.length})
              </button>
            )}
          </div>

          {selected.notes && (
            <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
              {selected.notes}
            </p>
          )}

          {(selected.auto_archive_on_end || selected.hide_before_start) && (
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              {selected.auto_archive_on_end && (
                <span className="rounded-md bg-background px-2 py-0.5">
                  Arquivar ao vencer
                </span>
              )}
              {selected.hide_before_start && (
                <span className="rounded-md bg-background px-2 py-0.5">
                  Ocultar antes do início
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {routines.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Crie a primeira rotina para periodizar os treinos A, B, C…
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-3 text-xs font-bold text-primary"
          >
            + Criar rotina
          </button>
        </div>
      )}

      {showCreate && (
        <RoutineFormModal
          title="Nova rotina do aluno"
          onClose={() => setShowCreate(false)}
          onSubmit={async (values) => {
            const id = await createStudentRoutine({
              alunoId,
              personalId,
              ...values,
            });
            setShowCreate(false);
            onRoutineChange(id);
            invalidate();
          }}
        />
      )}

      {showConfig && selected && (
        <RoutineFormModal
          title="Configurar periodização"
          initial={selected}
          onClose={() => setShowConfig(false)}
          onSubmit={async (values) => {
            await updateRoutine(selected.id, {
              name: values.name,
              level: values.level,
              objective: values.objective ?? null,
              schedule_type: values.scheduleType,
              starts_at: values.startsAt || null,
              ends_at: values.endsAt || null,
              auto_archive_on_end: values.autoArchiveOnEnd,
              hide_before_start: values.hideBeforeStart,
              notes: values.notes ?? null,
              status: initialRoutineStatus(values.startsAt ?? null, values.hideBeforeStart),
            });
            setShowConfig(false);
            invalidate();
          }}
        />
      )}

      {showClone && (
        <CloneRoutineModal
          alunoId={alunoId}
          personalId={personalId}
          onClose={() => setShowClone(false)}
          onCloned={(id) => {
            setShowClone(false);
            onRoutineChange(id);
            invalidate();
          }}
        />
      )}

      {showCopyToOther && selected && (
        <CopyToOtherStudentModal
          sourceRoutineId={selected.id}
          sourceRoutineName={selected.name}
          currentAlunoId={alunoId}
          onClose={() => setShowCopyToOther(false)}
        />
      )}

      {showHistory && (
        <HistoryModal
          routines={archivedRoutines}
          onClose={() => setShowHistory(false)}
          onSelect={(id) => {
            setShowHistory(false);
            onRoutineChange(id);
          }}
        />
      )}
    </div>
  );
}

function RoutineFormModal({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  initial?: WorkoutRoutineRow;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    level: RoutineLevel;
    objective?: string;
    startsAt?: string | null;
    endsAt?: string | null;
    autoArchiveOnEnd: boolean;
    hideBeforeStart: boolean;
    notes?: string;
    scheduleType: WorkoutRoutineRow["schedule_type"];
  }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [level, setLevel] = useState<RoutineLevel>(initial?.level ?? "iniciante");
  const [objective, setObjective] = useState(initial?.objective ?? "");
  const [startsAt, setStartsAt] = useState(initial?.starts_at ?? "");
  const [endsAt, setEndsAt] = useState(initial?.ends_at ?? "");
  const [autoArchive, setAutoArchive] = useState(initial?.auto_archive_on_end ?? false);
  const [hideBeforeStart, setHideBeforeStart] = useState(initial?.hide_before_start ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [scheduleType, setScheduleType] = useState(initial?.schedule_type ?? "por_letra");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name,
        level,
        objective,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        autoArchiveOnEnd: autoArchive,
        hideBeforeStart,
        notes,
        scheduleType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a rotina.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title={title} onClose={onClose} tall>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nome da rotina">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Fase 1 — Emagrecimento"
            className="field-input"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nível">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as RoutineLevel)}
              className="field-input"
            >
              {Object.entries(ROUTINE_LEVEL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Modelo">
            <select
              value={scheduleType}
              onChange={(e) =>
                setScheduleType(e.target.value as WorkoutRoutineRow["schedule_type"])
              }
              className="field-input"
            >
              {Object.entries(ROUTINE_SCHEDULE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Objetivo">
          <input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Ex: Emagrecimento, hipertrofia…"
            className="field-input"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Início">
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="field-input"
            />
          </Field>
          <Field label="Fim">
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="field-input"
            />
          </Field>
        </div>
        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={autoArchive}
            onChange={(e) => setAutoArchive(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <strong>Arquivar ao vencer</strong> — aluno deixa de ver quando a data fim passar
          </span>
        </label>
        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={hideBeforeStart}
            onChange={(e) => setHideBeforeStart(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <strong>Não exibir antes do início</strong> — próxima fase só aparece na data de início
          </span>
        </label>
        <Field label="Observações">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anotações sobre o aluno ou alinhamentos…"
            className="field-input resize-none"
          />
        </Field>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full rounded-2xl bg-gradient-primary py-3.5 font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar rotina"}
        </button>
      </form>
    </ModalShell>
  );
}

function CloneRoutineModal({
  alunoId,
  personalId,
  onClose,
  onCloned,
}: {
  alunoId: string;
  personalId: string;
  onClose: () => void;
  onCloned: (routineId: string) => void;
}) {
  const [sourceId, setSourceId] = useState("");
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["workoutTemplates", personalId],
    queryFn: () => fetchTemplateRoutines(personalId),
  });

  const { data: otherRoutines = [] } = useQuery({
    queryKey: ["workoutRoutines", alunoId, personalId],
    queryFn: () => fetchStudentRoutines(alunoId, personalId),
  });

  const { data: peerRoutines = [], isLoading: loadingPeers } = useQuery({
    queryKey: ["peerWorkoutRoutines", personalId, alunoId],
    queryFn: () => fetchPeerStudentRoutines(personalId, alunoId),
  });

  const sources = useMemo(
    () => [
      ...templates.map((t) => ({ ...t, group: "Biblioteca padrão", label: t.name })),
      ...otherRoutines.map((r) => ({ ...r, group: "Rotinas deste aluno", label: r.name })),
      ...peerRoutines.map((r) => ({
        ...r,
        group: "De outro aluno",
        label: `${r.studentName} — ${r.name}`,
      })),
    ],
    [templates, otherRoutines, peerRoutines],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceId) return;
    setSaving(true);
    setError(null);
    try {
      const id = await cloneRoutineToStudent(sourceId, alunoId, {
        name: name.trim() || undefined,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
      });
      onCloned(id);
    } catch {
      setError("Não foi possível clonar a rotina.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Clonar rotina" onClose={onClose} tall>
      <p className="text-xs text-muted-foreground mb-3">
        Copie da biblioteca padrão ou de outra rotina do aluno com o botão{" "}
        <strong>Clonar</strong>.
      </p>
      {isLoading || loadingPeers ? (
        <Loader2 className="size-5 animate-spin text-primary mx-auto mb-3" />
      ) : null}
      <form onSubmit={submit} className="space-y-3">
        <Field label="Rotina de origem">
          <select
            required
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="field-input"
          >
            <option value="">Selecione…</option>
            {["Biblioteca padrão", "Rotinas deste aluno", "De outro aluno"].map((group) => {
              const items = sources.filter((s) => s.group === group);
              if (items.length === 0) return null;
              return (
                <optgroup key={group} label={group}>
                  {items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </Field>
        <Field label="Nome da cópia (opcional)">
          <input value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Início">
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="field-input"
            />
          </Field>
          <Field label="Fim">
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="field-input"
            />
          </Field>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={!sourceId || saving}
          className="w-full rounded-2xl bg-gradient-primary py-3.5 font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Clonando…" : "Clonar para este aluno"}
        </button>
      </form>
    </ModalShell>
  );
}

function CopyToOtherStudentModal({
  sourceRoutineId,
  sourceRoutineName,
  currentAlunoId,
  onClose,
}: {
  sourceRoutineId: string;
  sourceRoutineName: string;
  currentAlunoId: string;
  onClose: () => void;
}) {
  const [targetId, setTargetId] = useState("");
  const [name, setName] = useState(`${sourceRoutineName} (cópia)`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["myStudents"],
    queryFn: () => fetchMyStudents(),
  });

  const others = students.filter((s: { id: string }) => s.id !== currentAlunoId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await cloneRoutineToStudent(sourceRoutineId, targetId, {
        name: name.trim() || undefined,
      });
      const target = others.find((s: { id: string; full_name: string | null }) => s.id === targetId);
      setSuccess(`Rotina copiada para ${target?.full_name ?? "o aluno"} com sucesso.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível copiar a rotina.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Copiar rotina para outro aluno" onClose={onClose}>
      <p className="text-xs text-muted-foreground mb-3">
        Copia <strong>{sourceRoutineName}</strong> com todos os treinos A/B/C e exercícios.
      </p>
      {isLoading && <Loader2 className="size-5 animate-spin text-primary mx-auto mb-3" />}
      <form onSubmit={submit} className="space-y-3">
        <Field label="Aluno destino">
          <select
            required
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="field-input"
          >
            <option value="">Selecione o aluno…</option>
            {others.map((s: { id: string; full_name: string | null }) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? "Aluno"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nome da rotina no aluno destino">
          <input value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
        </Field>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && <p className="text-xs text-primary">{success}</p>}
        <button
          type="submit"
          disabled={!targetId || saving || !!success}
          className="w-full rounded-2xl bg-gradient-primary py-3.5 font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Copiando…" : "Copiar rotina"}
        </button>
      </form>
    </ModalShell>
  );
}

function HistoryModal({
  routines,
  onClose,
  onSelect,
}: {
  routines: WorkoutRoutineRow[];
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <ModalShell title="Histórico de rotinas" onClose={onClose}>
      <p className="text-xs text-muted-foreground mb-3">
        Rotinas arquivadas ficam no histórico do aluno.
      </p>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {routines.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-left"
          >
            <p className="text-sm font-semibold">{r.name}</p>
            <p className="text-[10px] text-muted-foreground">{formatRoutinePeriod(r)}</p>
          </button>
        ))}
        {routines.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma rotina arquivada.</p>
        )}
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
  tall,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  tall?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-t-3xl bg-card border-t border-border p-5 pb-8 ${tall ? "max-h-[90vh] overflow-y-auto" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full bg-secondary p-1.5">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
