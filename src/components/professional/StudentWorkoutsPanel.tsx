import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Clock,
  Dumbbell,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { WorkoutRoutineBar } from "@/components/professional/WorkoutRoutineBar";
import { ExerciseVideoPlayer } from "@/components/student/ExerciseVideoPlayer";
import { getVideoEmbed } from "@/lib/video-embed";
import { supabase } from "@/integrations/supabase/client";
import {
  ensureDefaultStudentRoutine,
  routinesSupported,
} from "@/lib/workout-routines";
import { appendExercisesToWorkout, importWorkoutRotina, replaceExerciseSets } from "@/lib/workout-import";
import {
  EXERCISE_CATEGORIES,
  EXERCISE_LIBRARY,
  WORKOUT_CATEGORY_LABELS,
  type ExerciseCategory,
} from "@/lib/exercise-library";
import {
  EXAMPLE_WORKOUT_TEXT,
  formatPrescriptionFromSets,
  parsePrescriptionLine,
  parseWorkoutText,
} from "@/lib/workout-text-parser";

type WorkoutRow = {
  id: string;
  letter: string;
  title: string;
  muscles: string | null;
  category: string;
  estimated_minutes: number | null;
  exercises: ExerciseRow[] | null;
};

type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: string | null;
  position: number;
  rest_seconds: number | null;
  note: string | null;
  video_url: string | null;
  image: string | null;
  exercise_sets: SetRow[] | null;
};

type SetRow = {
  id: string;
  position: number;
  target_reps: string;
  target_load: number | null;
  set_type: string;
  note: string | null;
};

interface Props {
  alunoId: string | null;
  personalId: string;
  fixedRoutineId?: string;
  hideRoutineBar?: boolean;
}

export function StudentWorkoutsPanel({
  alunoId,
  personalId,
  fixedRoutineId,
  hideRoutineBar = false,
}: Props) {
  const qc = useQueryClient();
  const [routineId, setRoutineId] = useState<string | null>(fixedRoutineId ?? null);
  const activeRoutineId = fixedRoutineId ?? routineId;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [legacyMode, setLegacyMode] = useState(false);

  useEffect(() => {
    void routinesSupported().then((ok) => setLegacyMode(!ok));
  }, []);

  const canEditWorkouts = legacyMode || !!activeRoutineId;

  async function openWorkoutCreator(openModal: () => void) {
    setPanelError(null);
    if (legacyMode || activeRoutineId || !alunoId) {
      openModal();
      return;
    }
    try {
      const id = await ensureDefaultStudentRoutine(alunoId, personalId);
      setRoutineId(id);
      void qc.invalidateQueries({ queryKey: ["workoutRoutines", alunoId, personalId] });
      openModal();
    } catch (err) {
      setPanelError(
        err instanceof Error ? err.message : "Crie uma rotina antes de adicionar treinos.",
      );
    }
  }

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["studentWorkouts", alunoId, activeRoutineId, legacyMode],
    enabled: (!!alunoId || hideRoutineBar) && (legacyMode || !!activeRoutineId),
    queryFn: async () => {
      let q = supabase
        .from("workouts")
        .select(
          "id, letter, title, muscles, category, estimated_minutes, exercises(id, name, muscle_group, position, rest_seconds, note, video_url, image, exercise_sets(id, position, target_reps, target_load, set_type, note))",
        )
        .eq("personal_id", personalId)
        .order("letter");
      if (alunoId) q = q.eq("aluno_id", alunoId);
      else q = q.is("aluno_id", null);
      if (!legacyMode && activeRoutineId) q = q.eq("routine_id", activeRoutineId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as WorkoutRow[];
      rows.forEach((w) => {
        w.exercises?.sort((a, b) => a.position - b.position);
        w.exercises?.forEach((e) => e.exercise_sets?.sort((a, b) => a.position - b.position));
      });
      return rows;
    },
  });

  useEffect(() => {
    if (workouts.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !workouts.some((w) => w.id === selectedId)) {
      setSelectedId(workouts[0].id);
    }
  }, [workouts, selectedId]);

  const selected = workouts.find((w) => w.id === selectedId) ?? null;
  const exerciseCount = selected?.exercises?.length ?? 0;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["studentWorkouts", alunoId, activeRoutineId] });
    if (alunoId) void qc.invalidateQueries({ queryKey: ["workoutRoutines", alunoId, personalId] });
  };

  const deleteWorkout = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const moveExercise = useMutation({
    mutationFn: async ({
      exerciseId,
      neighborId,
      posA,
      posB,
    }: {
      exerciseId: string;
      neighborId: string;
      posA: number;
      posB: number;
    }) => {
      const { error: e1 } = await supabase
        .from("exercises")
        .update({ position: posB })
        .eq("id", exerciseId);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("exercises")
        .update({ position: posA })
        .eq("id", neighborId);
      if (e2) throw e2;
    },
    onSuccess: invalidate,
  });

  if (!legacyMode && activeRoutineId && isLoading) {
    return <Loader2 className="size-6 animate-spin text-primary mx-auto mt-8" />;
  }

  return (
    <div className="space-y-4 -mx-1">
      {panelError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {panelError}
        </div>
      )}

      {!hideRoutineBar && alunoId && !legacyMode && (
        <WorkoutRoutineBar
          alunoId={alunoId}
          personalId={personalId}
          routineId={routineId}
          onRoutineChange={setRoutineId}
        />
      )}

      {!canEditWorkouts && !hideRoutineBar && alunoId && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Selecione ou crie uma rotina para montar os treinos A, B, C…
        </div>
      )}

      {canEditWorkouts && (
        <>
      <button
        type="button"
        onClick={() => void openWorkoutCreator(() => setShowImport(true))}
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow"
      >
        <ClipboardPaste className="size-5" /> Colar ficha de treino
      </button>
      <p className="text-[11px] text-center text-muted-foreground -mt-2">
        Cole do WhatsApp · separa A/B/C com <span className="font-mono text-foreground">*****</span>
      </p>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {workouts.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => {
              setSelectedId(w.id);
              setEditingWorkout(false);
            }}
            className={`shrink-0 flex flex-col items-center min-w-[52px] rounded-2xl px-3 py-2 transition-all ${
              selectedId === w.id
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "bg-card border border-border text-muted-foreground"
            }`}
          >
            <span className="text-lg font-black leading-none">{w.letter}</span>
            <span className="text-[9px] font-semibold mt-0.5 max-w-[64px] truncate">
              {w.title.split(" ")[0]}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => void openWorkoutCreator(() => setShowCreate(true))}
          className="shrink-0 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-dashed border-primary/40 text-primary"
          aria-label="Novo treino"
        >
          <Plus className="size-5" />
        </button>
      </div>

      {!selected && (
        <div className="rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center">
          <Dumbbell className="size-10 text-primary mx-auto mb-3" />
          <p className="text-sm font-semibold">Nenhum treino ainda</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Cole a ficha completa ou crie o Treino A manualmente.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void openWorkoutCreator(() => setShowImport(true))}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold"
            >
              <ClipboardPaste className="size-4" /> Colar ficha
            </button>
            <button
              type="button"
              onClick={() => void openWorkoutCreator(() => setShowCreate(true))}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground"
            >
              <Plus className="size-4" /> Criar Treino A
            </button>
          </div>
        </div>
      )}

      {selected && (
        <>
          <WorkoutHeader
            workout={selected}
            exerciseCount={exerciseCount}
            editing={editingWorkout}
            onToggleEdit={() => setEditingWorkout((v) => !v)}
            onChanged={invalidate}
            onDelete={() => deleteWorkout.mutate(selected.id)}
          />

          <div className="space-y-2">
            {selected.exercises?.map((exercise, index) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                onChanged={invalidate}
                onMoveUp={
                  index > 0
                    ? () =>
                        moveExercise.mutate({
                          exerciseId: exercise.id,
                          neighborId: selected.exercises![index - 1].id,
                          posA: exercise.position,
                          posB: selected.exercises![index - 1].position,
                        })
                    : undefined
                }
                onMoveDown={
                  index < (selected.exercises?.length ?? 0) - 1
                    ? () =>
                        moveExercise.mutate({
                          exerciseId: exercise.id,
                          neighborId: selected.exercises![index + 1].id,
                          posA: exercise.position,
                          posB: selected.exercises![index + 1].position,
                        })
                    : undefined
                }
              />
            ))}
          </div>

          {selected.exercises?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/30 p-6 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhum exercício neste treino. Cole a ficha ou adicione abaixo.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 py-3.5 text-xs font-bold text-primary"
            >
              <Search className="size-4" /> Biblioteca
            </button>
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-xs font-bold text-foreground"
            >
              <Plus className="size-4" /> Nome livre
            </button>
          </div>
        </>
      )}
        </>
      )}

      {showCreate && canEditWorkouts && (
        <CreateWorkoutModal
          alunoId={alunoId}
          personalId={personalId}
          routineId={legacyMode ? null : activeRoutineId}
          existingLetters={workouts.map((w) => w.letter)}
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            setSelectedId(id);
            invalidate();
          }}
        />
      )}

      {showPicker && selected && (
        <ExercisePickerModal
          workoutId={selected.id}
          nextPosition={(selected.exercises?.length ?? 0) + 1}
          onClose={() => setShowPicker(false)}
          onAdded={() => {
            setShowPicker(false);
            invalidate();
          }}
        />
      )}

      {showCustom && selected && (
        <CustomExerciseModal
          workoutId={selected.id}
          nextPosition={(selected.exercises?.length ?? 0) + 1}
          onClose={() => setShowCustom(false)}
          onAdded={() => {
            setShowCustom(false);
            invalidate();
          }}
        />
      )}

      {showImport && canEditWorkouts && (
        <ImportWorkoutModal
          alunoId={alunoId}
          personalId={personalId}
          routineId={legacyMode ? null : activeRoutineId}
          existingLetters={workouts.map((w) => w.letter)}
          selectedWorkoutId={selectedId}
          selectedExerciseCount={selected?.exercises?.length ?? 0}
          onClose={() => setShowImport(false)}
          onImported={(firstId) => {
            setShowImport(false);
            if (firstId) setSelectedId(firstId);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function WorkoutHeader({
  workout,
  exerciseCount,
  editing,
  onToggleEdit,
  onChanged,
  onDelete,
}: {
  workout: WorkoutRow;
  exerciseCount: number;
  editing: boolean;
  onToggleEdit: () => void;
  onChanged: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(workout.title);
  const [muscles, setMuscles] = useState(workout.muscles ?? "");
  const [minutes, setMinutes] = useState(String(workout.estimated_minutes ?? 60));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(workout.title);
    setMuscles(workout.muscles ?? "");
    setMinutes(String(workout.estimated_minutes ?? 60));
  }, [workout.id, workout.title, workout.muscles, workout.estimated_minutes]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("workouts")
      .update({
        title: title.trim(),
        muscles: muscles.trim() || null,
        estimated_minutes: Number(minutes) || 60,
      })
      .eq("id", workout.id);
    setSaving(false);
    if (!error) onChanged();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-black">
            {workout.letter}
          </span>
          <div className="min-w-0">
            {!editing ? (
              <>
                <h3 className="text-base font-bold leading-tight truncate">{workout.title}</h3>
                {workout.muscles && (
                  <p className="text-[11px] text-muted-foreground truncate">{workout.muscles}</p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="field-input py-1.5 text-sm"
                  placeholder="Título do treino"
                />
                <input
                  value={muscles}
                  onChange={(e) => setMuscles(e.target.value)}
                  className="field-input py-1.5 text-xs"
                  placeholder="Grupos musculares"
                />
                <input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="field-input py-1.5 text-xs w-24"
                  placeholder="Min"
                />
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleEdit}
          className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground"
          aria-label="Editar treino"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Dumbbell className="size-3.5" /> {exerciseCount} exercícios
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {workout.estimated_minutes ?? 60} min
          </span>
        </span>
        <div className="flex items-center gap-2">
          {editing && (
            <button
              type="button"
              disabled={saving || !title.trim()}
              onClick={() => void save()}
              className="text-xs font-bold text-primary"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          )}
          <button type="button" onClick={onDelete} className="text-xs text-destructive">
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  index,
  onChanged,
  onMoveUp,
  onMoveDown,
}: {
  exercise: ExerciseRow;
  index: number;
  onChanged: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const sets = exercise.exercise_sets ?? [];

  const deleteExercise = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("exercises").delete().eq("id", exercise.id);
      if (error) throw error;
    },
    onSuccess: onChanged,
  });

  const updateRest = useMutation({
    mutationFn: async (seconds: number) => {
      const { error } = await supabase
        .from("exercises")
        .update({ rest_seconds: seconds })
        .eq("id", exercise.id);
      if (error) throw error;
    },
    onSuccess: onChanged,
  });

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-3 space-y-3">
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-bold text-primary pt-1 shrink-0">#{index + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-snug">{exercise.name}</p>
            {exercise.muscle_group && (
              <p className="text-[10px] text-muted-foreground">{exercise.muscle_group}</p>
            )}
            {sets.length > 0 && (
              <p className="text-[11px] font-bold text-primary mt-1">
                {formatPrescriptionFromSets(sets)}
              </p>
            )}
          </div>
          <div className="flex flex-col shrink-0">
            <button
              type="button"
              disabled={!onMoveUp}
              onClick={onMoveUp}
              className="p-0.5 text-muted-foreground disabled:opacity-20"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              disabled={!onMoveDown}
              onClick={onMoveDown}
              className="p-0.5 text-muted-foreground disabled:opacity-20"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => deleteExercise.mutate()}
            className="p-1 text-destructive shrink-0"
            aria-label="Excluir exercício"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="rounded-xl border border-border bg-background/30 p-2 space-y-1.5">
          <div className="grid grid-cols-[28px_1fr_56px_56px] gap-1 text-[9px] font-bold uppercase text-muted-foreground px-0.5">
            <span>Série</span>
            <span>Repetições / método</span>
            <span className="text-center">Carga</span>
            <span />
          </div>
          {sets.map((set) => (
            <SetRowEditor key={set.id} set={set} onChanged={onChanged} />
          ))}
          {sets.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              Nenhuma série — adicione abaixo
            </p>
          )}
          <AddSetButton exerciseId={exercise.id} sets={sets} onChanged={onChanged} />
        </div>

        <ExerciseNoteField exerciseId={exercise.id} note={exercise.note} onChanged={onChanged} />
        <ExerciseVideoField
          exerciseId={exercise.id}
          videoUrl={exercise.video_url}
          onChanged={onChanged}
        />

        <div className="flex items-center gap-2">
          <label className="text-[10px] text-muted-foreground shrink-0">Intervalo (s)</label>
          <input
            type="number"
            defaultValue={exercise.rest_seconds ?? 90}
            onBlur={(e) => updateRest.mutate(Number(e.target.value) || 60)}
            className="field-input flex-1 py-1.5 text-sm text-center"
          />
        </div>
      </div>
    </div>
  );
}

function AddSetButton({
  exerciseId,
  sets,
  onChanged,
}: {
  exerciseId: string;
  sets: SetRow[];
  onChanged: () => void;
}) {
  const addSet = useMutation({
    mutationFn: async () => {
      const last = sets[sets.length - 1];
      const { error } = await supabase.from("exercise_sets").insert({
        exercise_id: exerciseId,
        position: sets.length + 1,
        target_reps: last?.target_reps ?? "",
        target_load: last?.target_load ?? 0,
        set_type: "normal",
      });
      if (error) throw error;
    },
    onSuccess: onChanged,
  });

  return (
    <button
      type="button"
      onClick={() => addSet.mutate()}
      className="mt-1.5 w-full rounded-xl border border-primary/30 bg-primary/5 py-2 text-xs font-bold text-primary"
    >
      + Adicionar série
    </button>
  );
}

function ExerciseNoteField({
  exerciseId,
  note,
  onChanged,
}: {
  exerciseId: string;
  note: string | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(!!note);
  const [draft, setDraft] = useState(note ?? "");

  useEffect(() => {
    setDraft(note ?? "");
    setOpen(!!note);
  }, [exerciseId, note]);

  const save = useMutation({
    mutationFn: async (value: string | null) => {
      const { error } = await supabase
        .from("exercises")
        .update({ note: value })
        .eq("id", exerciseId);
      if (error) throw error;
    },
    onSuccess: onChanged,
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[10px] font-semibold text-primary"
      >
        <MessageSquare className="size-3" />
        Adicionar observação do exercício
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-muted-foreground">
        Observação do exercício · visível ao aluno
      </label>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const trimmed = draft.trim();
          save.mutate(trimmed || null);
          if (!trimmed) setOpen(false);
        }}
        placeholder="Ex.: amplitude completa, evitar impulso, pegada neutra…"
        rows={2}
        className="field-input text-xs resize-y min-h-[52px]"
      />
      {draft.trim() && (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            save.mutate(null);
            setOpen(false);
          }}
          className="text-[10px] text-muted-foreground underline"
        >
          Remover observação
        </button>
      )}
    </div>
  );
}

function ExerciseVideoField({
  exerciseId,
  videoUrl,
  onChanged,
}: {
  exerciseId: string;
  videoUrl: string | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(!!videoUrl);
  const [draft, setDraft] = useState(videoUrl ?? "");

  useEffect(() => {
    setDraft(videoUrl ?? "");
    setOpen(!!videoUrl);
  }, [exerciseId, videoUrl]);

  const save = useMutation({
    mutationFn: async (value: string | null) => {
      const { error } = await supabase
        .from("exercises")
        .update({ video_url: value })
        .eq("id", exerciseId);
      if (error) throw error;
    },
    onSuccess: onChanged,
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[10px] font-semibold text-primary"
      >
        <Video className="size-3" />
        Adicionar vídeo de execução
      </button>
    );
  }

  const trimmed = draft.trim();
  const embed = getVideoEmbed(trimmed);
  const invalid = trimmed.length > 0 && embed.kind === "invalid";

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
        <Video className="size-3" /> Vídeo de execução · YouTube, Vimeo ou link direto (.mp4)
      </label>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          save.mutate(trimmed || null);
          if (!trimmed) setOpen(false);
        }}
        placeholder="https://youtube.com/watch?v=… , vimeo.com/… ou https://…/video.mp4"
        className="field-input text-xs"
      />
      {invalid && (
        <p className="text-[10px] font-medium text-destructive">
          Link inválido. Cole uma URL do YouTube, Vimeo ou de um arquivo de vídeo.
        </p>
      )}
      {!invalid && embed.kind !== "invalid" && (
        <div className="max-w-xs">
          <p className="text-[10px] text-muted-foreground mb-1">Pré-visualização</p>
          <ExerciseVideoPlayer url={trimmed} title="Pré-visualização do vídeo" />
        </div>
      )}
      {trimmed && (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            save.mutate(null);
            setOpen(false);
          }}
          className="text-[10px] text-muted-foreground underline"
        >
          Remover vídeo
        </button>
      )}
    </div>
  );
}

function SetRowEditor({ set, onChanged }: { set: SetRow; onChanged: () => void }) {
  const [noteOpen, setNoteOpen] = useState(!!set.note);

  useEffect(() => {
    setNoteOpen(!!set.note);
  }, [set.id, set.note]);

  const save = useMutation({
    mutationFn: async (patch: Partial<SetRow>) => {
      const { error } = await supabase.from("exercise_sets").update(patch).eq("id", set.id);
      if (error) throw error;
    },
    onSuccess: onChanged,
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("exercise_sets").delete().eq("id", set.id);
      if (error) throw error;
    },
    onSuccess: onChanged,
  });

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[28px_1fr_56px_56px] gap-1 items-center">
        <span className="text-xs font-bold pl-0.5">{set.position}</span>
        <input
          defaultValue={set.target_reps}
          onBlur={(e) => save.mutate({ target_reps: e.target.value.trim() || "—" })}
          placeholder="12 · falha · drop · 10-8"
          className="field-input py-1.5 text-xs"
        />
        <input
          type="number"
          defaultValue={set.target_load ?? 0}
          onBlur={(e) => save.mutate({ target_load: Number(e.target.value) })}
          className="field-input py-1.5 text-xs text-center"
        />
        <div className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            onClick={() => setNoteOpen((v) => !v)}
            className={`p-1 ${set.note || noteOpen ? "text-primary" : "text-muted-foreground/40"}`}
            aria-label="Observação da série"
            title="Observação da série"
          >
            <MessageSquare className="size-3.5" />
          </button>
          <button type="button" onClick={() => remove.mutate()} className="p-1 text-destructive">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      {noteOpen && (
        <input
          key={`${set.id}-${set.note ?? ""}`}
          defaultValue={set.note ?? ""}
          onBlur={(e) => {
            const trimmed = e.target.value.trim();
            save.mutate({ note: trimmed || null });
            if (!trimmed) setNoteOpen(false);
          }}
          placeholder="Observação desta série (opcional)"
          className="field-input py-1.5 text-[11px] ml-7"
        />
      )}
    </div>
  );
}

function ImportWorkoutModal({
  alunoId,
  personalId,
  routineId,
  existingLetters,
  selectedWorkoutId,
  selectedExerciseCount,
  onClose,
  onImported,
}: {
  alunoId: string | null;
  personalId: string;
  routineId: string | null;
  existingLetters: string[];
  selectedWorkoutId: string | null;
  selectedExerciseCount: number;
  onClose: () => void;
  onImported: (firstWorkoutId: string | null) => void;
}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"rotina" | "append">("rotina");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocks = useMemo(() => parseWorkoutText(text), [text]);
  const totalExercises = blocks.reduce((n, b) => n + b.exercises.length, 0);

  useEffect(() => {
    if (blocks.length > 1) setMode("rotina");
  }, [blocks.length]);

  async function handleImport() {
    if (blocks.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      if (mode === "append" && selectedWorkoutId) {
        const exercises = blocks.flatMap((b) => b.exercises);
        await appendExercisesToWorkout(selectedWorkoutId, exercises, selectedExerciseCount + 1);
        onImported(selectedWorkoutId);
        return;
      }
      const ids = await importWorkoutRotina(
        blocks,
        alunoId,
        personalId,
        existingLetters,
        routineId,
      );
      onImported(ids[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar ficha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Colar ficha de treino" onClose={onClose} tall>
      <p className="text-xs text-muted-foreground mb-3">
        Cole no formato que você recebe:{" "}
        <span className="text-foreground font-medium">Exercício 4x12 a 10</span> ou{" "}
        <span className="text-foreground font-medium">3x falha</span>. Separe treinos A/B/C com{" "}
        <span className="font-mono">*****</span>.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder="Stiff 4x 12 a 10&#10;Mesa flexora 4x12 a 10&#10;..."
        className="field-input font-mono text-xs leading-relaxed resize-none"
      />

      <button
        type="button"
        onClick={() => setText(EXAMPLE_WORKOUT_TEXT)}
        className="mt-2 text-xs font-semibold text-primary"
      >
        Usar exemplo que você enviou
      </button>

      {blocks.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-background/40 p-3 max-h-40 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">
            Prévia · {blocks.length} treino{blocks.length > 1 ? "s" : ""} · {totalExercises} exercícios
          </p>
          {blocks.map((block, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <p className="text-xs font-bold text-primary mb-1">
                Treino {String.fromCharCode(65 + i)} — {block.suggestedTitle}
              </p>
              <ul className="space-y-0.5">
                {block.exercises.slice(0, 4).map((ex) => (
                  <li key={ex.name} className="text-[11px] text-muted-foreground truncate">
                    {ex.name} · <span className="text-foreground">{ex.prescription}</span>
                  </li>
                ))}
                {block.exercises.length > 4 && (
                  <li className="text-[10px] text-muted-foreground">
                    +{block.exercises.length - 4} exercícios…
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      {blocks.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-card border border-border p-1">
          <button
            type="button"
            onClick={() => setMode("rotina")}
            className={`rounded-xl py-2 text-[11px] font-bold ${
              mode === "rotina" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Criar rotina (A, B, C…)
          </button>
          <button
            type="button"
            disabled={!selectedWorkoutId}
            onClick={() => setMode("append")}
            className={`rounded-xl py-2 text-[11px] font-bold disabled:opacity-40 ${
              mode === "append" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Só no treino atual
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <button
        type="button"
        disabled={blocks.length === 0 || saving || (mode === "append" && !selectedWorkoutId)}
        onClick={() => void handleImport()}
        className="mt-4 w-full rounded-2xl bg-gradient-primary py-3.5 font-bold text-primary-foreground disabled:opacity-50"
      >
        {saving ? "Importando…" : mode === "rotina" ? "Importar rotina completa" : "Adicionar ao treino"}
      </button>
    </ModalShell>
  );
}

function CreateWorkoutModal({
  alunoId,
  personalId,
  routineId,
  existingLetters,
  onClose,
  onCreated,
}: {
  alunoId: string | null;
  personalId: string;
  routineId: string | null;
  existingLetters: string[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const nextLetter = useMemo(() => {
    const used = new Set(existingLetters.map((l) => l.toUpperCase()));
    for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      if (!used.has(c)) return c;
    }
    return "A";
  }, [existingLetters]);

  const [letter, setLetter] = useState(nextLetter);
  const [title, setTitle] = useState("");
  const [muscles, setMuscles] = useState("");
  const [category, setCategory] = useState("hipertrofia");
  const [minutes, setMinutes] = useState("60");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      aluno_id: alunoId,
      personal_id: personalId,
      letter: letter.trim().toUpperCase(),
      title: title.trim(),
      muscles: muscles.trim() || null,
      category: category as "hipertrofia",
      estimated_minutes: Number(minutes) || 60,
      is_active: true,
    };
    if (routineId) payload.routine_id = routineId;

    const { data, error: insertError } = await supabase
      .from("workouts")
      .insert(payload as never)
      .select("id")
      .single();
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onCreated(data.id);
  }

  return (
    <ModalShell title="Novo treino na rotina" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          <Field label="Letra">
            <input
              value={letter}
              onChange={(e) => setLetter(e.target.value.toUpperCase())}
              maxLength={1}
              className="field-input text-center font-black"
            />
          </Field>
          <div className="col-span-3">
            <Field label="Título">
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Peito e tríceps"
                className="field-input"
              />
            </Field>
          </div>
        </div>
        <Field label="Grupos musculares">
          <input
            value={muscles}
            onChange={(e) => setMuscles(e.target.value)}
            placeholder="Peitoral, tríceps…"
            className="field-input"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Categoria">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="field-input">
              {Object.entries(WORKOUT_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Duração (min)">
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="field-input"
            />
          </Field>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={!title.trim() || saving}
          className="w-full rounded-2xl bg-gradient-primary py-3.5 font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar treino"}
        </button>
      </form>
    </ModalShell>
  );
}

function CustomExerciseModal({
  workoutId,
  nextPosition,
  onClose,
  onAdded,
}: {
  workoutId: string;
  nextPosition: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [prescription, setPrescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedVideo = videoUrl.trim();
  const videoEmbed = getVideoEmbed(trimmedVideo);
  const videoInvalid = trimmedVideo.length > 0 && videoEmbed.kind === "invalid";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const exerciseName = name.trim();
    if (!exerciseName) return;
    if (videoInvalid) {
      setError("O link de vídeo é inválido. Use YouTube, Vimeo ou um arquivo de vídeo.");
      return;
    }

    const prescriptionText = prescription.trim();
    const parsed = prescriptionText ? parsePrescriptionLine(prescriptionText) : null;
    const sets =
      parsed ??
      (prescriptionText
        ? [{ position: 1, target_reps: prescriptionText, target_load: 0, set_type: "normal" as const }]
        : [
            { position: 1, target_reps: "", target_load: 0, set_type: "normal" as const },
            { position: 2, target_reps: "", target_load: 0, set_type: "normal" as const },
            { position: 3, target_reps: "", target_load: 0, set_type: "normal" as const },
          ]);

    setSaving(true);
    setError(null);
    try {
      const { data: exercise, error: insertError } = await supabase
        .from("exercises")
        .insert({
          workout_id: workoutId,
          name: exerciseName,
          position: nextPosition,
          rest_seconds: 90,
          video_url: trimmedVideo || null,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      await replaceExerciseSets(exercise.id, sets);
      onAdded();
    } catch {
      setError("Não foi possível adicionar o exercício.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Exercício com nome livre" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome do exercício">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Stiff unilateral na polia"
            className="field-input"
            autoFocus
          />
        </Field>
        <Field label="Prescrição (opcional)">
          <input
            value={prescription}
            onChange={(e) => setPrescription(e.target.value)}
            placeholder="12 · falha · drop · 4x12"
            className="field-input text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Texto livre — edite série a série depois de adicionar.
          </p>
        </Field>
        <Field label="Vídeo de execução (opcional)">
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=… , vimeo.com/… ou https://…/video.mp4"
            className="field-input text-sm"
          />
          {videoInvalid ? (
            <p className="text-[10px] font-medium text-destructive mt-1">
              Link inválido. Use YouTube, Vimeo ou um arquivo de vídeo.
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground mt-1">
              O aluno assiste ao vídeo direto no app, na tela do treino.
            </p>
          )}
          {!videoInvalid && videoEmbed.kind !== "invalid" && (
            <div className="mt-2 max-w-xs">
              <ExerciseVideoPlayer url={trimmedVideo} title="Pré-visualização do vídeo" />
            </div>
          )}
        </Field>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full rounded-2xl bg-gradient-primary py-3.5 font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Adicionando…" : "Adicionar ao treino"}
        </button>
      </form>
    </ModalShell>
  );
}

function ExercisePickerModal({
  workoutId,
  nextPosition,
  onClose,
  onAdded,
}: {
  workoutId: string;
  nextPosition: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ExerciseCategory | "todos">("todos");
  const [adding, setAdding] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EXERCISE_LIBRARY.filter((ex) => {
      const matchCat = category === "todos" || ex.category === category;
      const matchSearch =
        !q || ex.name.toLowerCase().includes(q) || ex.muscle_group.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, category]);

  async function addExercise(item: (typeof EXERCISE_LIBRARY)[number]) {
    setAdding(item.name);
    const { data: exercise, error } = await supabase
      .from("exercises")
      .insert({
        workout_id: workoutId,
        name: item.name,
        muscle_group: item.muscle_group,
        position: nextPosition,
        rest_seconds: 90,
      })
      .select("id")
      .single();
    if (error) {
      setAdding(null);
      return;
    }
    await supabase.from("exercise_sets").insert([
      { exercise_id: exercise.id, position: 1, target_reps: "", target_load: 0, set_type: "normal" },
      { exercise_id: exercise.id, position: 2, target_reps: "", target_load: 0, set_type: "normal" },
      { exercise_id: exercise.id, position: 3, target_reps: "", target_load: 0, set_type: "normal" },
    ]);
    setAdding(null);
    onAdded();
  }

  return (
    <ModalShell title="Biblioteca de exercícios" onClose={onClose} tall>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Procurar exercício…"
          className="field-input pl-9"
          autoFocus
        />
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 pb-1">
        {EXERCISE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
              category === c.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
        {filtered.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-[10px] text-muted-foreground">{item.muscle_group}</p>
            </div>
            <button
              type="button"
              disabled={adding === item.name}
              onClick={() => void addExercise(item)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              {adding === item.name ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum exercício encontrado.</p>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
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
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
