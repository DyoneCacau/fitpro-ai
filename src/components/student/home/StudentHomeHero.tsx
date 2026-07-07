import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Dumbbell, Flame, Scale } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useHealthDashboard } from "@/hooks/use-health-dashboard";
import { fetchStudentAssessments } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

export function StudentHomeHero() {
  const { user } = useAuth();
  const { data: health } = useHealthDashboard();

  const { data: workouts = [] } = useQuery({
    queryKey: ["homeWorkouts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("id, letter, title, muscles, estimated_minutes, exercises(count)")
        .eq("aluno_id", user!.id)
        .eq("is_active", true)
        .order("letter");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ["homeAssessments", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchStudentAssessments(user!.id),
  });

  const todayIndex = new Date().getDay();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - todayIndex);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const workoutDays = health?.workoutDaysThisWeek ?? Array(7).fill(false);
  const todayWorkout = workouts[todayIndex % Math.max(workouts.length, 1)] ?? workouts[0];
  const latest = assessments[0];
  const previous = assessments[1];
  const weightDelta =
    latest?.weight_kg != null && previous?.weight_kg != null
      ? latest.weight_kg - previous.weight_kg
      : null;

  const streak = workoutDays.filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Sua semana</p>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-bold text-orange-400">
              <Flame className="size-3" /> {streak} {streak === 1 ? "dia" : "dias"}
            </span>
          )}
        </div>
        <div className="flex justify-between gap-1">
          {weekDays.map((d, i) => {
            const isToday = i === todayIndex;
            const trained = workoutDays[(i + 6) % 7];
            return (
              <div key={d.toISOString()} className="flex flex-col items-center gap-1.5 flex-1">
                <span className="text-[10px] font-bold text-muted-foreground">{WEEK[i]}</span>
                <div
                  className={cn(
                    "size-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all",
                    isToday
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : trained
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-muted/40 text-muted-foreground",
                  )}
                >
                  {d.getDate()}
                </div>
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    trained ? "bg-emerald-500" : "bg-muted-foreground/30",
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>

      {todayWorkout && (
        <Link
          to="/treino/$id"
          params={{ id: todayWorkout.id }}
          className="block rounded-2xl bg-gradient-primary p-5 text-primary-foreground shadow-glow relative overflow-hidden active:scale-[0.99] transition-transform"
        >
          <Dumbbell className="absolute -right-4 -bottom-4 size-28 opacity-15" />
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
            Hoje · Treino {todayWorkout.letter}
          </p>
          <p className="text-xl font-black mt-1 leading-tight line-clamp-2">{todayWorkout.title}</p>
          {todayWorkout.muscles && (
            <p className="text-sm opacity-90 mt-0.5">{todayWorkout.muscles}</p>
          )}
          <p className="text-xs opacity-80 mt-2">
            {(todayWorkout.exercises as { count: number }[] | null)?.[0]?.count ?? 0} exercícios ·{" "}
            {todayWorkout.estimated_minutes ?? 60} min
          </p>
          <span className="inline-flex items-center gap-1 mt-4 text-sm font-bold">
            Ver treino <ChevronRight className="size-4" />
          </span>
        </Link>
      )}

      {(latest?.weight_kg != null || latest?.body_fat_pct != null) && (
        <div className="grid grid-cols-2 gap-3">
          {latest?.weight_kg != null && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Scale className="size-3.5" />
                <span className="text-[10px] font-bold uppercase">Peso</span>
              </div>
              <p className="text-2xl font-black text-primary">{latest.weight_kg} kg</p>
              {weightDelta != null && weightDelta !== 0 && (
                <p
                  className={cn(
                    "text-xs font-semibold mt-0.5",
                    weightDelta < 0 ? "text-emerald-500" : "text-orange-400",
                  )}
                >
                  {weightDelta > 0 ? "+" : ""}
                  {weightDelta.toFixed(1)} kg
                </p>
              )}
            </div>
          )}
          {latest?.body_fat_pct != null && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <span className="text-[10px] font-bold uppercase">% Gordura</span>
              </div>
              <p className="text-2xl font-black text-primary">{latest.body_fat_pct}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Última avaliação</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
