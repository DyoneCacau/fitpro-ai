import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Clock, Dumbbell, Layers, ChevronRight, Zap, TrendingUp, Calendar, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { todayWorkout, weekSchedule, stats } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FitPro AI — Seu treino de hoje" },
      { name: "description", content: "Plataforma SaaS premium para Personal Trainers e alunos. Execute treinos, acompanhe evolução e converse com seu personal." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <AuthGate>
      <HomeInner />
    </AuthGate>
  );
}

function HomeInner() {
  const { user, role } = useAuth();
  const totalSets = todayWorkout.exercises.reduce((a, e) => a + e.sets.length, 0);
  const name = (user?.user_metadata?.full_name as string) ?? user?.email ?? "Atleta";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <AppShell>
      {/* Header */}
      <header className="bg-gradient-hero px-5 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Quarta · 06 Jun {role && <span className="ml-2 rounded-full bg-primary/15 text-primary px-2 py-0.5 normal-case tracking-normal">{role}</span>}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">Olá, {name.split(" ")[0]} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-glow">
              {initials}
            </div>
          </div>
        </div>

        {/* Streak strip */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-card/60 backdrop-blur border border-border p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15 text-warning">
            <Flame className="h-5 w-5" fill="currentColor" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Streak atual</p>
            <p className="text-base font-bold">{stats.streak} dias consecutivos 🔥</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Volume semana</p>
            <p className="text-sm font-bold">{stats.weekVolume} kg</p>
          </div>
        </div>
      </header>

      {/* Week */}
      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Frequência da semana
          </h2>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex justify-between gap-1.5">
          {weekSchedule.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`flex h-11 w-full items-center justify-center rounded-2xl text-sm font-bold transition-all ${
                  d.today
                    ? "bg-gradient-primary text-primary-foreground shadow-glow animate-pulse-glow"
                    : d.done
                      ? "bg-success/20 text-success border border-success/30"
                      : "bg-card text-muted-foreground border border-border"
                }`}
              >
                {d.day}
              </div>
              <span className="text-[10px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Today workout hero */}
      <section className="px-5 mt-7">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" fill="currentColor" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
            Treino de hoje
          </h2>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-card border border-border shadow-elevated">
          {/* Glow accent */}
          <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 mb-3">
                  <span className="text-xs font-bold text-primary">TREINO {todayWorkout.letter}</span>
                </div>
                <h3 className="text-2xl font-bold text-balance leading-tight">
                  {todayWorkout.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{todayWorkout.muscles}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <Stat icon={Dumbbell} label="Exercícios" value={todayWorkout.exercises.length.toString()} />
              <Stat icon={Layers} label="Séries" value={totalSets.toString()} />
              <Stat icon={Clock} label="Tempo" value={`${todayWorkout.estimatedMinutes}min`} />
            </div>

            <Link
              to="/treino/$id"
              params={{ id: todayWorkout.id }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 font-bold text-primary-foreground shadow-glow transition-transform active:scale-[0.98]"
            >
              <Zap className="h-5 w-5" fill="currentColor" />
              INICIAR TREINO
            </Link>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="px-5 mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Acesso rápido
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickCard icon={TrendingUp} title="Meu Progresso" subtitle={`${stats.totalWorkouts} treinos`} />
          <QuickCard icon={Dumbbell} title="Biblioteca" subtitle="350+ exercícios" />
          <QuickCard icon={Layers} title="Avaliações" subtitle="Última: 12/05" />
          <QuickCard icon={Calendar} title="Histórico" subtitle="Esta semana" />
        </div>
      </section>

      {/* Trainer card */}
      <section className="px-5 mt-6">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground font-bold">
            JP
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Júnior Pagula</p>
            <p className="text-xs text-muted-foreground">Seu Personal · CREF 019933-G</p>
          </div>
          <button className="rounded-full bg-primary/15 p-2 text-primary">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Dumbbell; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background/40 border border-border p-3">
      <Icon className="h-4 w-4 text-primary mb-1.5" />
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function QuickCard({ icon: Icon, title, subtitle }: { icon: typeof Dumbbell; title: string; subtitle: string }) {
  return (
    <div className="group cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}
