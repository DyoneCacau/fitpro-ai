import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { ProfessionalStudentWorkspace } from "@/components/professional/ProfessionalStudentWorkspace";
import { StudentWorkoutsPanel } from "@/components/professional/StudentWorkoutsPanel";
import { WorkoutTemplateLibrary } from "@/components/professional/WorkoutTemplateLibrary";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { refreshRoutineStatuses } from "@/lib/workout-routines";

export const Route = createFileRoute("/treinos")({
  head: () => ({ meta: [{ title: "Treinos — FitPro AI" }] }),
  component: () => (
    <AuthGate>
      <TreinosPage />
    </AuthGate>
  ),
});

function TreinosPage() {
  const { role, loading } = useAuth();
  const isProfessional = role === "personal" || role === "admin";

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      </AppShell>
    );
  }

  if (isProfessional) return <ProfessionalTreinosPage />;
  return <StudentTreinosPage />;
}

function ProfessionalTreinosPage() {
  const [view, setView] = useState<"aluno" | "biblioteca">("aluno");

  return (
    <AppShell>
      <PageHeader
        title="Treinos"
        subtitle="Periodização e prescrição · estilo MFIT Personal"
      />

      <div className="px-5 pb-2">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-card border border-border p-1">
          <button
            type="button"
            onClick={() => setView("aluno")}
            className={`rounded-xl py-2 text-[11px] font-bold ${
              view === "aluno"
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground"
            }`}
          >
            Por aluno
          </button>
          <button
            type="button"
            onClick={() => setView("biblioteca")}
            className={`rounded-xl py-2 text-[11px] font-bold ${
              view === "biblioteca"
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground"
            }`}
          >
            Biblioteca de Treinos
          </button>
        </div>
      </div>

      {view === "biblioteca" ? (
        <div className="px-5 py-5 pb-10">
          <WorkoutTemplateLibrary />
        </div>
      ) : (
        <ProfessionalStudentWorkspace subtitle="Selecione o aluno · rotinas com datas e fases">
          {({ alunoId, personalId }) => (
            <StudentWorkoutsPanel key={alunoId} alunoId={alunoId} personalId={personalId} />
          )}
        </ProfessionalStudentWorkspace>
      )}
    </AppShell>
  );
}

function StudentTreinosPage() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["workouts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      await refreshRoutineStatuses();
      const { data, error } = await supabase
        .from("workouts")
        .select(
          "id, letter, title, muscles, category, estimated_minutes, is_active, exercises(count), workout_routines(name, status, starts_at, ends_at)",
        )
        .eq("aluno_id", user!.id)
        .eq("is_active", true)
        .order("letter");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        <header className="bg-gradient-hero px-4 pt-10 pb-6 text-center relative border-b border-border">
          <button
            type="button"
            onClick={() => router.navigate({ to: "/" })}
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
          <p className="mt-3 text-sm font-medium text-muted-foreground">Minha rotina de treinos</p>
        </header>

        <div className="px-4 py-5 space-y-3">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          )}
          {!isLoading && workouts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
              <Dumbbell className="size-10 text-primary mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">Nenhum treino prescrito</p>
              <p className="text-xs text-muted-foreground mt-1">
                Aguarde seu profissional montar sua ficha.
              </p>
            </div>
          )}
          {workouts.map((w) => (
            <Link
              key={w.id}
              to="/treino/$id"
              params={{ id: w.id }}
              className="block rounded-2xl border border-border bg-card p-4 shadow-card active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center text-xl font-black shadow-glow">
                  {w.letter}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{w.title}</p>
                  {w.muscles && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{w.muscles}</p>
                  )}
                  <p className="text-[11px] text-primary font-semibold mt-1">
                    {(w.exercises as { count: number }[] | null)?.[0]?.count ?? 0} exercícios ·{" "}
                    {w.estimated_minutes ?? 60} min
                  </p>
                </div>
                <ChevronRight className="size-5 text-primary shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
