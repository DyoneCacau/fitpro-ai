import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  CreditCard,
  Dumbbell,
  MessageCircle,
  Smartphone,
  Users,
  X,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "FitPro AI — Centralize alunos, treino, dieta e cobrança" },
      {
        name: "description",
        content:
          "Plataforma para personal trainers e nutricionistas. Anamnese, treinos com vídeo, dieta e cobrança automatizada em um único app.",
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    title: "Anamnese via formulário",
    subtitle: "Visão do aluno em 360º",
    icon: Calculator,
  },
  {
    title: "Treino via app",
    subtitle: "Exercícios com vídeo de execução",
    icon: Dumbbell,
  },
  {
    title: "Automatiza cobrança",
    subtitle: "Aumenta recorrência e retenção",
    icon: CreditCard,
  },
  {
    title: "Centralizado em um app",
    subtitle: "Aumenta valor agregado",
    icon: Smartphone,
  },
  {
    title: "Visualiza métricas",
    subtitle: "Recebe insights e ajustes",
    icon: BarChart3,
  },
] as const;

const REPLACES = [
  { bad: "WhatsApp", good: "Treino estruturado no app", icon: MessageCircle },
  { bad: "Google Drive", good: "Dieta e materiais centralizados", icon: CheckCircle2 },
  { bad: "Planilha de cobrança", good: "Faturas e alertas automáticos", icon: CreditCard },
  { bad: "Vários apps", good: "Alunos, treino, dieta e financeiro", icon: Users },
] as const;

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Dumbbell className="size-4" />
            </div>
            <span className="text-lg font-black tracking-tight">FitPro AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              to="/auth"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow"
            >
              Testar grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16">
        <section className="pt-12 pb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
            Para personal trainers e nutricionistas
          </p>
          <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">
            Centralize alunos, treinos, dieta e{" "}
            <span className="text-primary">cobrança</span> em um único app
          </h1>
          <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Pare de gerenciar sua consultoria em WhatsApp, Drive e planilhas. O FitPro AI
            entrega treino com vídeo, plano alimentar, anamnese e financeiro no mesmo lugar.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-sm font-black text-primary-foreground shadow-glow"
            >
              Testar grátis
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#funcionalidades"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Ver funcionalidades
            </a>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 gap-3 mb-14">
          {REPLACES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.bad}
                className="rounded-2xl border border-border bg-card/60 p-4 flex gap-3"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <X className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground line-through">{item.bad}</p>
                  <p className="text-sm font-bold mt-0.5 flex items-center gap-1.5">
                    <Icon className="size-3.5 text-primary shrink-0" />
                    {item.good}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        <section id="funcionalidades" className="mb-14">
          <div className="rounded-3xl border border-primary/20 bg-card/50 p-1 shadow-card overflow-hidden">
            <div className="rounded-[22px] border-l-4 border-l-primary bg-gradient-to-br from-card to-primary/5 p-5 md:p-8">
              <h2 className="text-xl font-black mb-1">Tudo que você precisa para escalar</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Migre pro lado que cresce. Centralize seus problemas em um único solucionador.
              </p>
              <div className="space-y-2">
                {FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.title}
                      className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/60 px-4 py-3.5 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">
                          {f.title} <span className="text-primary">→</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{f.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/30 p-8 text-center">
          <h2 className="text-2xl font-black">Pronto para profissionalizar sua consultoria?</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Crie sua conta, convide alunos e comece a prescrever treinos, dietas e cobranças hoje.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-sm font-black text-primary-foreground shadow-glow"
          >
            Criar conta profissional
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
