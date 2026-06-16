import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Apple, Calculator, CalendarCheck, Dumbbell, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { StudentAnamnesisPanel } from "@/components/professional/StudentAnamnesisPanel";
import { StudentDietPanel } from "@/components/professional/StudentDietPanel";
import { StudentAgendaPanel } from "@/components/professional/StudentAgendaPanel";
import { StudentWorkoutsPanel } from "@/components/professional/StudentWorkoutsPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/alunos/$alunoId")({
  head: () => ({ meta: [{ title: "Aluno — FitPro AI" }] }),
  component: () => (
    <AuthGate allowedRoles={["personal", "admin"]}>
      <StudentDetailPage />
    </AuthGate>
  ),
});

type Tab = "anamnese" | "treinos" | "dieta" | "agenda";

function StudentDetailPage() {
  const { alunoId } = Route.useParams();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("anamnese");

  const { data: student, isLoading, error } = useQuery({
    queryKey: ["studentProfile", alunoId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error: qError } = await supabase
        .from("profiles")
        .select("id, full_name, created_at, personal_id")
        .eq("id", alunoId)
        .eq("personal_id", user!.id)
        .maybeSingle();
      if (qError) throw qError;
      if (!data) throw new Error("Aluno não encontrado ou sem vínculo.");
      return data;
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error || !student || !user) {
    return (
      <AppShell>
        <div className="px-5 pt-8 text-center">
          <p className="text-sm text-destructive">Não foi possível abrir o cadastro deste aluno.</p>
          <Link to="/alunos" className="text-primary text-sm mt-3 inline-block">Voltar</Link>
        </div>
      </AppShell>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Calculator }[] = [
    { id: "anamnese", label: "Anamnese", icon: Calculator },
    { id: "treinos", label: "Treinos", icon: Dumbbell },
    { id: "dieta", label: "Dieta", icon: Apple },
    { id: "agenda", label: "Agenda", icon: CalendarCheck },
  ];

  return (
    <AppShell>
      <header className="px-5 pt-10 pb-4 border-b border-border">
        <Link to="/alunos" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <ArrowLeft className="size-4" /> Meus alunos
        </Link>
        <h1 className="text-xl font-bold">{student.full_name ?? "Aluno"}</h1>
        <p className="text-xs text-muted-foreground mt-1">Gestão híbrida · treino + nutrição</p>
      </header>

      <div className="px-5 pt-4">
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-card border border-border p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-xl py-2 text-[11px] font-bold flex flex-col items-center gap-1 ${
                  active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <section className="px-5 py-5 pb-10">
        {tab === "anamnese" && <StudentAnamnesisPanel alunoId={alunoId} personalId={user.id} />}
        {tab === "treinos" && <StudentWorkoutsPanel alunoId={alunoId} personalId={user.id} />}
        {tab === "dieta" && <StudentDietPanel alunoId={alunoId} personalId={user.id} />}
        {tab === "agenda" && <StudentAgendaPanel alunoId={alunoId} personalId={user.id} />}
      </section>
    </AppShell>
  );
}
