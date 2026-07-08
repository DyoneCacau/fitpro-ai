import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ClipboardList,
  Dumbbell,
  Loader2,
  SkipForward,
  Timer,
  Video,
  X,
} from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { ExerciseVideoPlayer } from "@/components/student/ExerciseVideoPlayer";
import { PremiumCollapsible } from "@/components/student/ui/PremiumCollapsible";
import { supabase } from "@/integrations/supabase/client";
import { formatRestLabel, setTypeLabel } from "@/lib/workout-display";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/treino/$id")({
  head: () => ({ meta: [{ title: "Treino — FitPro AI" }] }),
  component: () => (
    <AuthGate>
      <WorkoutPage />
    </AuthGate>
  ),
});

type DbExercise = {
  id: string;
  name: string;
  position: number;
  rest_seconds: number | null;
  note: string | null;
  video_url: string | null;
  image: string | null;
  exercise_sets: Array<{
    id: string;
    position: number;
    target_reps: string;
    target_load: number | null;
    set_type: string;
    note: string | null;
  }> | null;
};

type DbWorkout = {
  id: string;
  letter: string;
  title: string;
  muscles: string | null;
  estimated_minutes: number | null;
  exercises: DbExercise[] | null;
};

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function WorkoutPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [completedSetIds, setCompletedSetIds] = useState<Set<string>>(() => new Set());
  const [completedExerciseIds, setCompletedExerciseIds] = useState<Set<string>>(() => new Set());
  const [rest, setRest] = useState<{ remaining: number; total: number } | null>(null);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      setCompletedSetIds(new Set());
      setCompletedExerciseIds(new Set());
      setRest(null);
      return;
    }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    if (!rest) return;
    if (rest.remaining <= 0) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([200, 100, 200]);
      }
      const done = setTimeout(() => setRest(null), 2000);
      return () => clearTimeout(done);
    }
    const t = setTimeout(
      () => setRest((r) => (r ? { ...r, remaining: r.remaining - 1 } : r)),
      1000,
    );
    return () => clearTimeout(t);
  }, [rest]);

  function startRest(seconds: number) {
    const s = Math.max(0, Math.round(seconds));
    if (s <= 0) return;
    setRest({ remaining: s, total: s });
  }

  function toggleSetComplete(setId: string, restSeconds: number) {
    const wasDone = completedSetIds.has(setId);
    setCompletedSetIds((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
    if (!wasDone) startRest(restSeconds);
  }

  function toggleExerciseComplete(exerciseId: string, restSeconds: number) {
    const wasDone = completedExerciseIds.has(exerciseId);
    setCompletedExerciseIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
    if (!wasDone) startRest(restSeconds);
  }

  const { data: workout, isLoading, error } = useQuery({
    queryKey: ["workoutDetail", id],
    queryFn: async () => {
      const { data, error: qError } = await supabase
        .from("workouts")
        .select(
          "id, letter, title, muscles, estimated_minutes, exercises(id, name, position, rest_seconds, note, video_url, image, exercise_sets(id, position, target_reps, target_load, set_type, note))",
        )
        .eq("id", id)
        .eq("is_active", true)
        .single();
      if (qError) throw qError;
      const row = data as DbWorkout;
      row.exercises?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      row.exercises?.forEach((e) =>
        e.exercise_sets?.sort((a, b) => a.position - b.position),
      );
      return row;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-muted-foreground">Treino não encontrado.</p>
        <button
          type="button"
          onClick={() => router.navigate({ to: "/treinos" })}
          className="mt-4 text-primary font-semibold text-sm"
        >
          Voltar aos treinos
        </button>
      </div>
    );
  }

  const exercises = workout.exercises ?? [];
  const allNotes = exercises
    .filter((e) => e.note?.trim())
    .map((e) => ({ name: e.name, note: e.note!.trim() }));

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-20 bg-gradient-hero px-4 pt-10 pb-4 border-b border-border">
        <button
          type="button"
          onClick={() => router.navigate({ to: "/treinos" })}
          className="absolute left-4 top-10 flex size-9 items-center justify-center rounded-full border border-border bg-card/80"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="text-center text-base font-black text-foreground">Meu treino</p>
        <p className="text-center text-xs text-muted-foreground mt-1">
          Treino {workout.letter} · {workout.title}
        </p>
      </header>

      <div className="mx-3 mt-4 rounded-3xl border border-border bg-card/50 overflow-hidden shadow-card">
        {allNotes.length > 0 && (
          <div className="p-3 border-b border-border">
            <PremiumCollapsible title="Observações" icon={ClipboardList}>
              <ul className="space-y-2">
                {allNotes.map((n) => (
                  <li key={n.name}>
                    <span className="font-semibold text-foreground">{n.name}: </span>
                    {n.note}
                  </li>
                ))}
              </ul>
            </PremiumCollapsible>
          </div>
        )}

        <div className="divide-y divide-border">
          {exercises.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12 px-4">
              Seu profissional ainda não adicionou exercícios neste treino.
            </p>
          )}
          {exercises.map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              muscles={workout.muscles}
              active={active}
              done={completedExerciseIds.has(exercise.id)}
              onToggleExercise={toggleExerciseComplete}
              onStartRest={startRest}
              completedSetIds={completedSetIds}
              onToggleSet={toggleSetComplete}
            />
          ))}
        </div>
      </div>

      {rest && (
        <div className="fixed inset-x-0 bottom-[68px] z-40 px-3 pb-2">
          <div
            className={cn(
              "mx-auto max-w-md rounded-2xl border p-3 shadow-lg backdrop-blur",
              rest.remaining <= 0
                ? "border-emerald-500/50 bg-emerald-500/15"
                : "border-primary/40 bg-card/95",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full",
                  rest.remaining <= 0 ? "bg-emerald-500 text-white" : "bg-primary/15 text-primary",
                )}
              >
                {rest.remaining <= 0 ? (
                  <Check className="size-6" strokeWidth={3} />
                ) : (
                  <Timer className="size-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {rest.remaining <= 0 ? "Descanso concluído" : "Descanso"}
                </p>
                <p className="text-2xl font-black tabular-nums leading-tight">
                  {formatElapsed(Math.max(0, rest.remaining))}
                </p>
              </div>
              {rest.remaining > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setRest((r) =>
                        r ? { total: r.total + 15, remaining: r.remaining + 15 } : r,
                      )
                    }
                    className="shrink-0 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground active:scale-95"
                  >
                    +15s
                  </button>
                  <button
                    type="button"
                    onClick={() => setRest(null)}
                    className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground active:scale-95 flex items-center gap-1"
                  >
                    <SkipForward className="size-3.5" />
                    Pular
                  </button>
                </>
              )}
              {rest.remaining <= 0 && (
                <button
                  type="button"
                  onClick={() => setRest(null)}
                  className="shrink-0 rounded-xl border border-border bg-background p-2 text-muted-foreground active:scale-95"
                  aria-label="Fechar"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-linear",
                  rest.remaining <= 0 ? "bg-emerald-500" : "bg-primary",
                )}
                style={{
                  width: `${rest.total > 0 ? (Math.max(0, rest.remaining) / rest.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Barra fixa inferior — estilo referência */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-primary/30 bg-gradient-to-r from-primary/95 to-primary pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md flex items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-primary-foreground min-w-0 flex-1">
            <Timer className="size-5 shrink-0 opacity-90" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase opacity-80 truncate">
                {active ? "Treino em andamento" : "Pronto para treinar"}
              </p>
              <p className="text-lg font-black tabular-nums">{formatElapsed(elapsed)}</p>
            </div>
          </div>
          {!active ? (
            <button
              type="button"
              onClick={() => setActive(true)}
              className="shrink-0 rounded-xl bg-background px-5 py-2.5 text-sm font-black text-primary shadow-lg active:scale-[0.98]"
            >
              Iniciar treino
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActive(false)}
              className="shrink-0 rounded-xl bg-background/20 border border-primary-foreground/30 px-4 py-2.5 text-xs font-bold text-primary-foreground"
            >
              Encerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ExerciseRow({
  exercise,
  muscles,
  active,
  done,
  onToggleExercise,
  onStartRest,
  completedSetIds,
  onToggleSet,
}: {
  exercise: DbExercise;
  muscles: string | null;
  active: boolean;
  done: boolean;
  onToggleExercise: (exerciseId: string, restSeconds: number) => void;
  onStartRest: (restSeconds: number) => void;
  completedSetIds: Set<string>;
  onToggleSet: (setId: string, restSeconds: number) => void;
}) {
  const restSeconds = exercise.rest_seconds ?? 60;
  const [showVideo, setShowVideo] = useState(false);
  const sets = exercise.exercise_sets ?? [];
  const muscleLabel = muscles?.split(/[,/]/)[0]?.trim() ?? "Geral";
  const hasVideo = !!exercise.video_url?.trim();

  return (
    <div className={cn("px-4 py-4 transition-colors", done && "bg-primary/[0.04]")}>
      <div className="flex gap-3">
        {active && (
          <button
            type="button"
            onClick={() => onToggleExercise(exercise.id, restSeconds)}
            aria-label={done ? "Desmarcar exercício" : "Marcar exercício como feito"}
            className={cn(
              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors active:scale-90",
              done
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/40 text-transparent",
            )}
          >
            <Check className="size-4" strokeWidth={3} />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[15px] font-bold leading-snug",
              done ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {exercise.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{muscleLabel}</p>

          {/* Séries sempre visíveis */}
          {sets.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {sets.map((set) => {
                const setDone = completedSetIds.has(set.id);
                return (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => active && onToggleSet(set.id, restSeconds)}
                    disabled={!active}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-2 py-2 transition-colors text-left",
                      setDone
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-background",
                      !active && "cursor-default opacity-95",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                        setDone
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-primary",
                      )}
                    >
                      {setDone ? <Check className="size-3.5" strokeWidth={3} /> : `${set.position}ª`}
                    </span>
                    <span className={cn("flex-1", setDone && "line-through opacity-70")}>
                      {set.target_reps} · {set.target_load ?? 0} kg
                    </span>
                    {setTypeLabel(set.set_type, true) && set.set_type !== "normal" && (
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        {setTypeLabel(set.set_type, true)}
                      </span>
                    )}
                    {active && (
                      <span
                        className={cn(
                          "shrink-0 text-[10px] font-bold uppercase",
                          setDone ? "text-primary" : "text-muted-foreground/60",
                        )}
                      >
                        {setDone ? "Feito" : "Marcar"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Rodapé: intervalo + vídeo */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <button
              type="button"
              onClick={() => active && onStartRest(restSeconds)}
              disabled={!active}
              className={cn(
                "inline-flex items-center gap-1",
                active ? "text-primary font-semibold" : "text-muted-foreground",
              )}
            >
              <Timer className="size-3.5" />
              Intervalo: {formatRestLabel(exercise.rest_seconds)}
            </button>
            {hasVideo && (
              <button
                type="button"
                onClick={() => setShowVideo((v) => !v)}
                className="inline-flex items-center gap-1 font-semibold text-primary"
              >
                <Video className="size-3.5" />
                {showVideo ? "Ocultar vídeo" : "Ver vídeo"}
              </button>
            )}
          </div>

          {showVideo && hasVideo && (
            <div className="mt-2">
              <ExerciseVideoPlayer url={exercise.video_url!.trim()} title={exercise.name} />
            </div>
          )}

          {exercise.note?.trim() && (
            <p className="mt-2 rounded-lg bg-muted/30 p-2 text-xs leading-relaxed text-muted-foreground">
              {exercise.note.trim()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
