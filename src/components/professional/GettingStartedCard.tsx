import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, Rocket } from "lucide-react";
import type { ProfessionalDashboard } from "@/lib/professional-analytics";

type Step = {
  label: string;
  description: string;
  done: boolean;
  to: "/clientes" | "/treinos" | "/dieta" | "/financeiro";
  cta: string;
};

export function GettingStartedCard({ data }: { data: ProfessionalDashboard }) {
  const steps: Step[] = [
    {
      label: "Cadastrar cliente",
      description: "Convide seu primeiro aluno para a plataforma.",
      done: data.checklist.hasStudent,
      to: "/clientes",
      cta: "Cadastrar",
    },
    {
      label: "Criar treino",
      description: "Monte a primeira rotina de treinos.",
      done: data.checklist.hasWorkout,
      to: "/treinos",
      cta: "Criar treino",
    },
    {
      label: "Montar cardápio",
      description: "Crie um plano alimentar para seus alunos.",
      done: data.checklist.hasDietPlan,
      to: "/dieta",
      cta: "Montar",
    },
    {
      label: "Configurar cobrança",
      description: "Defina um plano de mensalidade e comece a cobrar.",
      done: data.checklist.hasBillingPlan,
      to: "/financeiro",
      cta: "Configurar",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = Math.round((doneCount / total) * 100);

  if (doneCount === total) return null;

  return (
    <section data-tour="primeiros-passos" className="px-5 pb-4">
      <div className="rounded-2xl border border-border bg-gradient-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/12">
              <Rocket className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Primeiros passos</p>
              <p className="text-[11px] text-muted-foreground">
                Complete os passos abaixo para começar
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-primary">
            {doneCount}/{total}
          </span>
        </div>

        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {steps.map((s) => (
            <div
              key={s.label}
              className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                s.done ? "border-success/40 bg-success/5" : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    s.done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.done ? <Check className="size-4" /> : ""}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground">{s.description}</p>
                </div>
              </div>
              {!s.done && (
                <Link
                  to={s.to}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow"
                >
                  {s.cta}
                  <ChevronRight className="size-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
