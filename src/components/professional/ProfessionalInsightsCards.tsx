import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Apple,
  Calculator,
  CreditCard,
  Dumbbell,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ProfessionalInsights } from "@/lib/professional-analytics";
import { formatCurrency } from "@/lib/billing";

export function ProfessionalInsightsCards({ insights }: { insights: ProfessionalInsights }) {
  const cards = [
    {
      label: "Alunos ativos",
      value: String(insights.studentCount),
      icon: Users,
      link: "/clientes" as const,
      hint: insights.studentsWithoutAnamnesis > 0
        ? `${insights.studentsWithoutAnamnesis} sem anamnese`
        : undefined,
    },
    {
      label: "Recebido no mês",
      value: formatCurrency(insights.receivedThisMonth),
      icon: TrendingUp,
      link: "/financeiro" as const,
    },
    {
      label: "Cobranças pendentes",
      value: String(insights.pendingCount),
      icon: CreditCard,
      link: "/financeiro" as const,
      hint: insights.overdueCount > 0 ? `${insights.overdueCount} em atraso` : undefined,
      alert: insights.overdueCount > 0,
    },
    {
      label: "Retornos pendentes",
      value: String(insights.followUpAlerts),
      icon: AlertTriangle,
      link: "/" as const,
    },
    {
      label: "Treinos ativos",
      value: String(insights.activeWorkouts),
      icon: Dumbbell,
      link: "/treinos" as const,
    },
    {
      label: "Planos alimentares",
      value: String(insights.activeDietPlans),
      icon: Apple,
      link: "/dieta" as const,
    },
  ];

  return (
    <section className="px-5 pb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black text-foreground">Métricas e insights</h2>
        {insights.studentsWithoutAnamnesis > 0 && (
          <Link
            to="/clientes"
            className="text-[10px] font-bold text-primary flex items-center gap-1"
          >
            <Calculator className="size-3" />
            {insights.studentsWithoutAnamnesis} anamnese{insights.studentsWithoutAnamnesis !== 1 ? "s" : ""} pendente{insights.studentsWithoutAnamnesis !== 1 ? "s" : ""}
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.link}
              className={`rounded-2xl border bg-card p-3 transition-colors hover:border-primary/30 ${
                card.alert ? "border-destructive/40 bg-destructive/5" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`size-3.5 ${card.alert ? "text-destructive" : "text-primary"}`} />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{card.label}</p>
              </div>
              <p className="text-lg font-black">{card.value}</p>
              {card.hint && (
                <p className={`text-[10px] font-semibold mt-0.5 ${card.alert ? "text-destructive" : "text-primary"}`}>
                  {card.hint}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
