import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ClipboardList, Dumbbell, Loader2, Timer } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { PremiumCollapsible } from "@/components/student/ui/PremiumCollapsible";
import { supabase } from "@/integrations/supabase/client";
import {
  formatLoadLabel,
  formatRestLabel,
  formatSeriesLabel,
} from "@/lib/workout-display";
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

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      setCompletedSetIds(new Set());
      return;
    }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [active]);

  function toggleSetComplete(setId: string) {
    setCompletedSetIds((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
  }

  const { data: workout, isLoading, error } = useQuery({
    queryKey: ["workoutDetail", id],
    queryFn: async () => {
      const { data, error: qError } = await supabase
        .from("workouts")
        .select(
          "id, letter, title, muscles, estimated_minutes, exercises(id, name, position, rest_seconds, note, exercise_sets(id, position, target_reps, target_load, set_type, note))",
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
              completedSetIds={completedSetIds}
              onToggleSet={toggleSetComplete}
            />
          ))}
        </div>
      </div>

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
  completedSetIds,
  onToggleSet,
}: {
  exercise: DbExercise;
  muscles: string | null;
  active: boolean;
  completedSetIds: Set<string>;
  onToggleSet: (setId: string) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const sets = exercise.exercise_sets ?? [];
  const muscleLabel = muscles?.split(/[,/]/)[0]?.trim() ?? "Geral";

  return (
    <div className="px-4 py-4">
      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="w-full text-left"
      >
        <p className="text-[15px] font-bold text-foreground leading-snug">{exercise.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{muscleLabel}</p>
      </button>

      {showDetail && (
        <div className="mt-3 space-y-2 rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Séries: </span>
            {formatSeriesLabel(sets)}
          </p>
          <p>
            <span className="font-semibold text-foreground">Carga: </span>
            {formatLoadLabel(sets)}
          </p>
          <p>
            <span className="font-semibold text-foreground">Intervalo: </span>
            {formatRestLabel(exercise.rest_seconds)}
          </p>
          {exercise.note?.trim() && (
            <p className="text-foreground leading-relaxed">{exercise.note.trim()}</p>
          )}

          {active && sets.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              {sets.map((set) => {
                const done = completedSetIds.has(set.id);
                return (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => onToggleSet(set.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-2 py-2 transition-colors",
                      done
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-background",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                        done ? "bg-primary text-primary-foreground" : "border border-border text-primary",
                      )}
                    >
                      {done ? <Check className="size-3.5" strokeWidth={3} /> : `${set.position}ª`}
                    </span>
                    <span className={cn("flex-1 text-left", done && "line-through opacity-70")}>
                      {set.target_reps} · {set.target_load ?? 0} kg
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
