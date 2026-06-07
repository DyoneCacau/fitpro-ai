import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell, Flame, Heart, Zap, Activity, Plus, Clock, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/treinos")({
  head: () => ({ meta: [{ title: "Treinos — FitPro AI" }] }),
  component: () => (
    <AuthGate>
      <TreinosPage />
    </AuthGate>
  ),
});

const CATEGORIES = [
  { id: "todos", label: "Todos", icon: Dumbbell },
  { id: "forca", label: "Força", icon: Zap },
  { id: "hipertrofia", label: "Hipertrofia", icon: Dumbbell },
  { id: "cardio", label: "Cardio", icon: Heart },
  { id: "funcional", label: "Funcional", icon: Flame },
  { id: "mobilidade", label: "Mobilidade", icon: Activity },
] as const;

type CatId = (typeof CATEGORIES)[number]["id"];

function TreinosPage() {
  const { user } = useAuth();
  const [cat, setCat] = useState<CatId>("todos");

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["workouts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("id, letter, title, muscles, category, estimated_minutes, is_active, exercises(count)")
        .eq("aluno_id", user!.id)
        .eq("is_active", true)
        .order("letter");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () => (cat === "todos" ? workouts : workouts.filter((w) => w.category === cat)),
    [workouts, cat],
  );

  return (
    <AppShell>
      <PageHeader
        title="Treinos"
        subtitle="Sua biblioteca"
        right={
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      {/* Tabs categorias estilo MFIT */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex gap-2 overflow-x-auto px-5 py-3 no-scrollbar">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  active
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <section className="px-5 py-5 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold">Nenhum treino nesta categoria</p>
            <p className="text-xs text-muted-foreground mt-1">
              Seu profissional ainda não criou treinos {cat !== "todos" ? `de ${cat}` : ""}.
            </p>
          </div>
        )}
        {filtered.map((w) => (
          <Link
            key={w.id}
            to="/treino/$id"
            params={{ id: w.id }}
            className="block rounded-3xl bg-gradient-card border border-border p-5 shadow-card transition-all active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                    {w.letter}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-primary">
                    {w.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold leading-tight">{w.title}</h3>
                {w.muscles && (
                  <p className="text-xs text-muted-foreground mt-0.5">{w.muscles}</p>
                )}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3.5 w-3.5" />
                    {(w.exercises as { count: number }[] | null)?.[0]?.count ?? 0} exercícios
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {w.estimated_minutes}min
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
