import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Dumbbell, Loader2, Play } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import {
  formatLoadLabel,
  formatRestLabel,
  formatSeriesLabel,
} from "@/lib/workout-display";

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

function WorkoutPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [active, setActive] = useState(false);

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

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="relative bg-gradient-hero px-4 pt-10 pb-4 text-center border-b border-border">
        <button
          type="button"
          onClick={() => router.navigate({ to: "/treinos" })}
          className="absolute left-4 top-10 flex size-9 items-center justify-center rounded-full border border-border bg-card/80"
        >
          <ChevronLeft className="size-5 text-foreground" />
        </button>
        <div className="flex items-center justify-center gap-2">
          <Dumbbell className="size-6 text-primary" />
          <span className="font-black tracking-tight text-foreground">
            FitPro <span className="text-primary">AI</span>
          </span>
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">{workout.title}</p>
        {workout.muscles && (
          <p className="text-xs text-muted-foreground mt-0.5">{workout.muscles}</p>
        )}
      </header>

      <div className="border-b border-primary/20 bg-primary/10 px-4 py-5 text-center">
        {!active ? (
          <>
            <button
              type="button"
              onClick={() => setActive(true)}
              className="mx-auto block min-w-[200px] rounded-xl bg-gradient-primary px-8 py-3 text-lg font-black tracking-wide text-primary-foreground shadow-glow active:scale-[0.98]"
            >
              INICIAR
            </button>
            <p className="mt-3 text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Você está no &quot;modo visualização&quot;. Aperte INICIAR para começar seu treino.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-foreground">
              Treino em andamento · Treino {workout.letter}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Registre carga e reps em cada exercício abaixo
            </p>
            <button
              type="button"
              onClick={() => setActive(false)}
              className="mt-3 text-xs text-primary underline"
            >
              Voltar ao modo visualização
            </button>
          </>
        )}
      </div>

      <div className="px-3 py-4 space-y-3">
        {exercises.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">
            Seu profissional ainda não adicionou exercícios neste treino.
          </p>
        )}
        {exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} active={active} />
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({ exercise, active }: { exercise: DbExercise; active: boolean }) {
  const sets = exercise.exercise_sets ?? [];
  const hasSetNotes = sets.some((set) => set.note?.trim());

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex shadow-card">
      <div className="flex-1 p-4 min-w-0">
        <h3 className="font-bold text-foreground text-[15px] leading-snug">{exercise.name}</h3>
        <dl className="mt-2 space-y-0.5 text-sm text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">Séries: </span>
            {formatSeriesLabel(sets)}
          </div>
          <div>
            <span className="font-semibold text-foreground">Carga: </span>
            {formatLoadLabel(sets)}
          </div>
          <div>
            <span className="font-semibold text-foreground">Intervalo: </span>
            {formatRestLabel(exercise.rest_seconds)}
          </div>
        </dl>

        {exercise.note?.trim() && (
          <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-2 text-xs text-foreground leading-relaxed">
            <span className="font-semibold text-primary">Observação: </span>
            {exercise.note.trim()}
          </div>
        )}

        {(active || hasSetNotes) && sets.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-border pt-3">
            {sets.map((set) => (
              <div key={set.id} className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs bg-background rounded-lg border border-border px-2 py-1.5">
                  <span className="font-bold w-6 text-primary">{set.position}ª</span>
                  <span className="flex-1 text-foreground">{set.target_reps}</span>
                  <span className="text-muted-foreground">{set.target_load ?? 0} kg</span>
                </div>
                {set.note?.trim() && (
                  <p className="text-[11px] text-muted-foreground pl-8 leading-snug">
                    <span className="font-semibold text-foreground">Obs.: </span>
                    {set.note.trim()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative w-[110px] shrink-0 bg-muted flex items-center justify-center">
        <Dumbbell className="size-10 text-muted-foreground/50" />
        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
          <div className="size-10 rounded-full bg-card border border-border flex items-center justify-center shadow-card">
            <Play className="size-5 text-primary ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>
    </div>
  );
}
