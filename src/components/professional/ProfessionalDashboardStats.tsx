import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Apple,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Dumbbell,
  FileWarning,
  Receipt,
  Repeat,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ProfessionalDashboard } from "@/lib/professional-analytics";
import { formatCurrency } from "@/lib/billing";

export function ProfessionalDashboardStats({ data }: { data: ProfessionalDashboard }) {
  const { insights, revenue } = data;

  return (
    <div className="space-y-6 px-5 pb-6">
      {/* ===== VISÃO GERAL — Faturamento ===== */}
      <section data-tour="faturamento">
        <SectionLabel>Visão geral</SectionLabel>
        <h2 className="mb-3 text-sm font-black text-foreground">Faturamento do mês</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-gradient-card p-4 md:col-span-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Mês atual · até hoje
            </p>
            <p className="mt-1 text-3xl font-black text-foreground">
              {formatCurrency(revenue.monthCents)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {data.transactionsThisMonth} transaç{data.transactionsThisMonth === 1 ? "ão" : "ões"} no mês
            </p>
          </div>
          <MiniRevenue label="Hoje" value={formatCurrency(revenue.todayCents)} />
          <MiniRevenue label="Esta semana" value={formatCurrency(revenue.weekCents)} />
          <MiniRevenue label="Este ano" value={formatCurrency(revenue.yearCents)} />
        </div>
      </section>

      {/* ===== OPERACIONAL ===== */}
      <section>
        <SectionLabel>Operacional</SectionLabel>
        <h2 className="mb-3 text-sm font-black text-foreground">Atendimentos & agenda</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={<CalendarClock className="size-4" />}
            label="Atendimentos hoje"
            value={data.appointmentsToday}
            link="/"
          />
          <StatCard
            icon={<CalendarDays className="size-4" />}
            label="Próximos 30 dias"
            value={data.upcomingAppointments}
            link="/"
          />
          <StatCard
            icon={<AlertTriangle className="size-4" />}
            label="Retornos pendentes"
            value={insights.followUpAlerts}
            link="/"
            alert={insights.followUpAlerts > 0}
          />
          <StatCard
            icon={<FileWarning className="size-4" />}
            label="Sem anamnese"
            value={insights.studentsWithoutAnamnesis}
            link="/clientes"
            alert={insights.studentsWithoutAnamnesis > 0}
          />
          <StatCard
            icon={<Users className="size-4" />}
            label="Alunos ativos"
            value={insights.studentCount}
            link="/clientes"
          />
        </div>
      </section>

      {/* ===== FINANCEIRO ===== */}
      <section>
        <SectionLabel>Financeiro</SectionLabel>
        <h2 className="mb-3 text-sm font-black text-foreground">Vendas & receita</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          <StatCard
            icon={<TrendingUp className="size-4" />}
            label="Recebido no mês"
            value={formatCurrency(revenue.monthCents)}
            link="/financeiro"
            money
          />
          <StatCard
            icon={<Repeat className="size-4" />}
            label="Receita recorrente"
            value={formatCurrency(data.recurringRevenueCents)}
            hint={`${data.activeSubscriptions} assinatura${data.activeSubscriptions === 1 ? "" : "s"}`}
            link="/financeiro"
            money
          />
          <StatCard
            icon={<Receipt className="size-4" />}
            label="Ticket médio"
            value={formatCurrency(data.ticketMedioCents)}
            link="/financeiro"
            money
          />
          <StatCard
            icon={<CreditCard className="size-4" />}
            label="Cobranças pendentes"
            value={insights.pendingCount}
            hint={insights.overdueCount > 0 ? `${insights.overdueCount} em atraso` : undefined}
            link="/financeiro"
            alert={insights.overdueCount > 0}
          />
          <StatCard
            icon={<Wallet className="size-4" />}
            label="Em atraso"
            value={formatCurrency(data.overdueTotalCents)}
            link="/financeiro"
            alert={data.overdueTotalCents > 0}
            money
          />
          <StatCard
            icon={<Dumbbell className="size-4" />}
            label="Treinos ativos"
            value={insights.activeWorkouts}
            link="/treinos"
          />
          <StatCard
            icon={<Apple className="size-4" />}
            label="Planos alimentares"
            value={insights.activeDietPlans}
            link="/dieta"
          />
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{children}</p>
  );
}

function MiniRevenue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black text-foreground">{value}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  link,
  alert,
  money,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  link: "/" | "/clientes" | "/treinos" | "/dieta" | "/financeiro";
  alert?: boolean;
  money?: boolean;
}) {
  return (
    <Link
      to={link}
      className={`rounded-2xl border bg-card p-3 transition-colors hover:border-primary/30 ${
        alert ? "border-destructive/40 bg-destructive/5" : "border-border"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={alert ? "text-destructive" : "text-primary"}>{icon}</span>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={`font-black ${money ? "text-base" : "text-lg"}`}>{value}</p>
      {hint && (
        <p className={`mt-0.5 text-[10px] font-semibold ${alert ? "text-destructive" : "text-primary"}`}>
          {hint}
        </p>
      )}
    </Link>
  );
}
