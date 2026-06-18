import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { ProfessionalStudentWorkspace } from "@/components/professional/ProfessionalStudentWorkspace";
import { DietTemplateLibrary } from "@/components/professional/DietTemplateLibrary";
import { StudentDietPanel } from "@/components/professional/StudentDietPanel";
import { StudentNutritionHub } from "@/components/student/nutrition/StudentNutritionHub";
import { StudentFoodDiary } from "@/components/student/nutrition/StudentFoodDiary";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dieta")({
  head: () => ({ meta: [{ title: "Dieta — FitPro AI" }] }),
  component: () => (
    <AuthGate>
      <DietaPage />
    </AuthGate>
  ),
});

function DietaPage() {
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

  if (isProfessional) return <ProfessionalDietaPage />;
  return <StudentDietaPage />;
}

function ProfessionalDietaPage() {
  const [view, setView] = useState<"aluno" | "biblioteca">("aluno");

  return (
    <AppShell>
      <header className="bg-gradient-hero px-5 pt-12 pb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Profissional</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Dieta</h1>
        <p className="text-xs text-muted-foreground mt-1">Prescrição alimentar e modelos reutilizáveis</p>
      </header>

      <div className="px-5 pb-2 pt-4">
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
            Biblioteca de planos
          </button>
        </div>
      </div>

      {view === "biblioteca" ? (
        <div className="px-5 py-5 pb-10">
          <DietTemplateLibrary />
        </div>
      ) : (
        <ProfessionalStudentWorkspace subtitle="Selecione o aluno para montar refeições e metas">
          {({ alunoId, personalId }) => (
            <StudentDietPanel key={alunoId} alunoId={alunoId} personalId={personalId} />
          )}
        </ProfessionalStudentWorkspace>
      )}
    </AppShell>
  );
}

function StudentDietaPage() {
  const [tab, setTab] = useState<"alimentacao" | "diario">("alimentacao");

  return (
    <AppShell>
      <div className="px-5 pt-4 pb-2">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-card border border-border p-1">
          <button
            type="button"
            onClick={() => setTab("alimentacao")}
            className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
              tab === "alimentacao"
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground"
            }`}
          >
            Alimentação
          </button>
          <button
            type="button"
            onClick={() => setTab("diario")}
            className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
              tab === "diario"
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground"
            }`}
          >
            Diário
          </button>
        </div>
      </div>

      {tab === "alimentacao" ? (
        <StudentNutritionHub />
      ) : (
        <>
          <header className="bg-gradient-hero px-5 pt-6 pb-5">
            <h1 className="text-xl font-bold text-foreground">Diário alimentar</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Registre o que você comeu hoje e acompanhe suas metas.
            </p>
          </header>
          <StudentFoodDiary />
        </>
      )}
    </AppShell>
  );
}
