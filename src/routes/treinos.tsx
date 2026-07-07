import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { ProfessionalStudentWorkspace } from "@/components/professional/ProfessionalStudentWorkspace";
import { StudentWorkoutsPanel } from "@/components/professional/StudentWorkoutsPanel";
import { WorkoutTemplateLibrary } from "@/components/professional/WorkoutTemplateLibrary";
import { PremiumCollapsible } from "@/components/student/ui/PremiumCollapsible";
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
        subtitle="Periodização e prescrição de treinos"
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

type StudentWorkout = {
  id: string;
  letter: string;
  title: string;
  muscles: string | null;
  category: string | null;
  estimated_minutes: number | null;
  exercises: { count: number }[] | null;
  workout_routines: {
    name: string;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
  } | null;
};

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
      return (data ?? []) as StudentWorkout[];
    },
  });

  const routineName = workouts[0]?.workout_routines?.name;
  const exerciseCount = (w: StudentWorkout) => w.exercises?.[0]?.count ?? 0;

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-8">
        <header className="sticky top-0 z-20 bg-gradient-hero px-4 pt-10 pb-4 border-b border-border">
          <button
            type="button"
            onClick={() => router.navigate({ to: "/" })}
            className="absolute left-4 top-10 flex size-9 items-center justify-center rounded-full border border-border bg-card/80"
          >
            <ChevronLeft className="size-5 text-foreground" />
          </button>
          <p className="text-center text-base font-black text-foreground">Meus treinos</p>
          {routineName && (
            <p className="text-center text-xs text-muted-foreground mt-1 truncate px-10">
              {routineName}
            </p>
          )}
        </header>

        <div className="px-3 pt-4 space-y-4">
          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          )}

          {!isLoading && workouts.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border bg-card/40 p-10 text-center mx-1">
              <Dumbbell className="size-10 text-primary mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">Nenhum treino prescrito</p>
              <p className="text-xs text-muted-foreground mt-1">
                Aguarde seu profissional montar sua ficha.
              </p>
            </div>
          )}

          {!isLoading && workouts.length > 0 && (
            <>
              <div className="mx-1 rounded-3xl border border-border bg-card/50 overflow-hidden shadow-card">
                <div className="p-3 border-b border-border">
                  <PremiumCollapsible title="Observações" icon={ClipboardList}>
                    <p className="text-xs leading-relaxed">
                      Toque em um treino para ver os exercícios e iniciar a sessão. Marque as séries
                      durante o treino para acompanhar seu progresso.
                    </p>
                  </PremiumCollapsible>
                </div>

                <div className="divide-y divide-border">
                  {workouts.map((w) => (
                    <Link
                      key={w.id}
                      to="/treino/$id"
                      params={{ id: w.id }}
                      className="flex items-center gap-3 px-4 py-4 active:bg-muted/30 transition-colors"
                    >
                      <div className="size-10 shrink-0 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-lg font-black">
                        {w.letter}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-foreground leading-snug truncate">
                          {w.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {w.muscles?.split(/[,/]/)[0]?.trim() ?? w.category ?? "Treino"}
                        </p>
                        <p className="text-[11px] text-primary font-semibold mt-1">
                          {exerciseCount(w)} exercícios · {w.estimated_minutes ?? 60} min
                        </p>
                      </div>
                      <ChevronRight className="size-5 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>

              <p className="text-center text-[11px] text-muted-foreground px-4">
                {workouts.length} treino{workouts.length !== 1 ? "s" : ""} na sua rotina atual
              </p>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
