import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { StudentWorkoutsPanel } from "@/components/professional/StudentWorkoutsPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  ROUTINE_LEVEL_LABELS,
  ROUTINE_LEVEL_ORDER,
  ROUTINE_OBJECTIVE_PRESETS,
  ROUTINE_SEX_LABELS,
  cloneRoutineToStudent,
  createTemplateRoutine,
  deleteTemplateRoutine,
  fetchTemplateRoutines,
  type RoutineKind,
  type RoutineLevel,
  type RoutineTargetSex,
  type WorkoutRoutineRow,
} from "@/lib/workout-routines";

type SexFilter = "all" | RoutineTargetSex;

export function WorkoutTemplateLibrary() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [kind, setKind] = useState<RoutineKind>("treinos");
  const [sexFilter, setSexFilter] = useState<SexFilter>("all");
  const [search, setSearch] = useState("");
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [cloneTarget, setCloneTarget] = useState<WorkoutRoutineRow | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["workoutTemplates", user?.id, kind, sexFilter],
    enabled: !!user?.id,
    queryFn: () =>
      fetchTemplateRoutines(user!.id, {
        kind,
        sex: sexFilter === "all" ? "all" : sexFilter,
      }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.objective ?? "").toLowerCase().includes(q) ||
        ROUTINE_LEVEL_LABELS[t.level].toLowerCase().includes(q),
    );
  }, [templates, search]);

  const grouped = useMemo(() => {
    const map = new Map<RoutineLevel, WorkoutRoutineRow[]>();
    for (const level of ROUTINE_LEVEL_ORDER) map.set(level, []);
    for (const t of filtered) {
      const list = map.get(t.level) ?? [];
      list.push(t);
      map.set(t.level, list);
    }
    return ROUTINE_LEVEL_ORDER.filter((level) => (map.get(level)?.length ?? 0) > 0).map(
      (level) => ({ level, items: map.get(level)! }),
    );
  }, [filtered]);

  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ["workoutTemplates", user?.id] });

  const removeTemplate = useMutation({
    mutationFn: deleteTemplateRoutine,
    onSuccess: () => {
      if (openedId) setOpenedId(null);
      invalidate();
    },
  });

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Header estilo MFIT */}
      <div className="rounded-2xl bg-gradient-hero border border-border overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Biblioteca de Treinos</h2>
        </div>
      </div>

      {/* Abas: Rotina de treinos | Aeróbico */}
      <div className="grid grid-cols-2 gap-0 rounded-2xl border border-border overflow-hidden">
        {(["treinos", "aerobico"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k);
              setOpenedId(null);
            }}
            className={`py-3 text-xs font-bold uppercase tracking-wide transition-colors ${
              kind === k
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground"
            }`}
          >
            {k === "treinos" ? "Rotina de treinos" : "Aeróbico"}
          </button>
        ))}
      </div>

      {/* Filtros + Nova rotina */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["masculino", "feminino"] as const).map((sex) => {
          const active = sexFilter === sex;
          return (
            <button
              key={sex}
              type="button"
              onClick={() => setSexFilter(active ? "all" : sex)}
              className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wide ${
                active
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-primary/15 text-primary border border-primary/30"
              }`}
            >
              {ROUTINE_SEX_LABELS[sex]}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-foreground text-background px-4 py-2.5 text-xs font-bold"
        >
          <Plus className="size-4" /> Rotina
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Procurar"
          className="field-input pl-9 bg-card"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && grouped.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-semibold">Nenhuma rotina na biblioteca</p>
          <p className="text-xs text-muted-foreground mt-1">
            Toque em <strong>+ Rotina</strong> para criar como no MFIT Personal.
          </p>
        </div>
      )}

      {/* Lista agrupada por nível */}
      <div className="space-y-5">
        {grouped.map(({ level, items }) => (
          <section key={level}>
            <h3 className="text-sm font-bold text-foreground mb-2 px-1">
              {ROUTINE_LEVEL_LABELS[level]}
            </h3>
            <div className="space-y-3">
              {items.map((routine) => (
                <RoutineLibraryCard
                  key={routine.id}
                  routine={routine}
                  isOpen={openedId === routine.id}
                  onOpen={() => setOpenedId(openedId === routine.id ? null : routine.id)}
                  onClone={() => setCloneTarget(routine)}
                  onDelete={() => {
                    if (confirm(`Excluir a rotina "${routine.name}"?`)) {
                      removeTemplate.mutate(routine.id);
                    }
                  }}
                  deleting={removeTemplate.isPending}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {openedId && (
        <div className="rounded-2xl border border-primary/30 bg-card/40 p-3 pt-4">
          <p className="text-xs font-bold text-primary mb-3 px-1">Montar treinos A, B, C…</p>
          <StudentWorkoutsPanel
            alunoId={null}
            personalId={user.id}
            fixedRoutineId={openedId}
            hideRoutineBar
          />
        </div>
      )}

      {showCreate && (
        <CreateLibraryRoutineModal
          defaultKind={kind}
          personalId={user.id}
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            setOpenedId(id);
            invalidate();
          }}
        />
      )}

      {cloneTarget && (
        <CloneLibraryToStudentModal
          routine={cloneTarget}
          onClose={() => setCloneTarget(null)}
        />
      )}
    </div>
  );
}

function RoutineLibraryCard({
  routine,
  isOpen,
  onOpen,
  onClone,
  onDelete,
  deleting,
}: {
  routine: WorkoutRoutineRow;
  isOpen: boolean;
  onOpen: () => void;
  onClone: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
      <div className="p-4">
        <p className="text-base font-bold text-foreground">{routine.name}</p>
        {routine.objective && (
          <p className="text-sm text-muted-foreground mt-0.5">{routine.objective}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {ROUTINE_SEX_LABELS[routine.target_sex ?? "unissex"]}
        </p>
      </div>
      <div className="flex border-t border-border">
        <button
          type="button"
          onClick={onOpen}
          className={`flex-1 py-3 text-xs font-bold ${
            isOpen ? "bg-primary/20 text-primary" : "bg-foreground text-background"
          }`}
        >
          {isOpen ? "Fechar" : "Abrir"}
        </button>
        <button
          type="button"
          onClick={onClone}
          className="flex-1 py-3 text-xs font-bold border-l border-border bg-card text-foreground"
        >
          Clonar
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="w-14 py-3 flex items-center justify-center border-l border-border bg-destructive text-destructive-foreground disabled:opacity-50"
          aria-label="Excluir rotina"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function CreateLibraryRoutineModal({
  personalId,
  defaultKind,
  onClose,
  onCreated,
}: {
  personalId: string;
  defaultKind: RoutineKind;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<RoutineLevel>("iniciante");
  const [objective, setObjective] = useState<string>(ROUTINE_OBJECTIVE_PRESETS[0]);
  const [customObjective, setCustomObjective] = useState("");
  const [targetSex, setTargetSex] = useState<RoutineTargetSex>("masculino");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const finalObjective =
        objective === "Outro" ? customObjective.trim() : objective;
      const id = await createTemplateRoutine({
        personalId,
        name,
        level,
        objective: finalObjective,
        routineKind: defaultKind,
        targetSex,
      });
      onCreated(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar rotina.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="+ Nova rotina" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome da rotina">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Iniciante, Hipertrofia…"
            className="field-input"
            autoFocus
          />
        </Field>
        <Field label="Nível (categoria na lista)">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as RoutineLevel)}
            className="field-input"
          >
            {ROUTINE_LEVEL_ORDER.map((k) => (
              <option key={k} value={k}>
                {ROUTINE_LEVEL_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Objetivo">
          <select
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="field-input"
          >
            {ROUTINE_OBJECTIVE_PRESETS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            <option value="Outro">Outro…</option>
          </select>
        </Field>
        {objective === "Outro" && (
          <Field label="Objetivo personalizado">
            <input
              required
              value={customObjective}
              onChange={(e) => setCustomObjective(e.target.value)}
              className="field-input"
            />
          </Field>
        )}
        <Field label="Sexo alvo">
          <div className="grid grid-cols-2 gap-2">
            {(["masculino", "feminino"] as const).map((sex) => (
              <button
                key={sex}
                type="button"
                onClick={() => setTargetSex(sex)}
                className={`rounded-xl py-2.5 text-xs font-bold uppercase ${
                  targetSex === sex
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground"
                }`}
              >
                {ROUTINE_SEX_LABELS[sex]}
              </button>
            ))}
          </div>
        </Field>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full rounded-2xl bg-gradient-primary py-3.5 font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Criar rotina"}
        </button>
      </form>
    </ModalShell>
  );
}

function CloneLibraryToStudentModal({
  routine,
  onClose,
}: {
  routine: WorkoutRoutineRow;
  onClose: () => void;
}) {
  const [targetId, setTargetId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["myStudents"],
    queryFn: async () => {
      const { data, error: qError } = await supabase.rpc("get_my_students");
      if (qError) throw qError;
      return data ?? [];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId) return;
    setSaving(true);
    setError(null);
    try {
      await cloneRoutineToStudent(routine.id, targetId, { name: routine.name });
      const student = students.find((s: { id: string }) => s.id === targetId);
      setSuccess(`Rotina clonada para ${student?.full_name ?? "o aluno"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao clonar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Clonar para aluno" onClose={onClose}>
      <p className="text-xs text-muted-foreground mb-3">
        Copia <strong>{routine.name}</strong>
        {routine.objective ? ` · ${routine.objective}` : ""} com todos os treinos.
      </p>
      {isLoading && <Loader2 className="size-5 animate-spin text-primary mx-auto mb-3" />}
      <form onSubmit={submit} className="space-y-3">
        <Field label="Selecione o aluno">
          <select
            required
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="field-input"
          >
            <option value="">Escolha…</option>
            {students.map((s: { id: string; full_name: string | null }) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? "Aluno"}
              </option>
            ))}
          </select>
        </Field>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && <p className="text-xs text-primary">{success}</p>}
        <button
          type="submit"
          disabled={!targetId || saving || !!success}
          className="w-full rounded-2xl bg-gradient-primary py-3.5 font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Clonando…" : "Clonar rotina"}
        </button>
      </form>
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-card border-t border-border p-5 pb-8 max-h-[90vh] overflow-y-auto"
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
