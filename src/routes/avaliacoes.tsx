import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Ruler, Scale, Activity, Camera } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/avaliacoes")({
  head: () => ({ meta: [{ title: "Avaliações — FitPro AI" }] }),
  component: () => (
    <AuthGate>
      <Avaliacoes />
    </AuthGate>
  ),
});

interface Assessment {
  id: string;
  assessed_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  lean_mass_kg: number | null;
  measurements: Record<string, number> | null;
  photos: string[] | null;
  notes: string | null;
}

function Avaliacoes() {
  const { user } = useAuth();
  const { data: assessments = [] } = useQuery({
    queryKey: ["assessments", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("aluno_id", user!.id)
        .order("assessed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Assessment[];
    },
  });

  const latest = assessments[0];
  const previous = assessments[1];

  const deltaWeight =
    latest?.weight_kg && previous?.weight_kg
      ? Number(latest.weight_kg) - Number(previous.weight_kg)
      : 0;
  const deltaBF =
    latest?.body_fat_pct && previous?.body_fat_pct
      ? Number(latest.body_fat_pct) - Number(previous.body_fat_pct)
      : 0;

  return (
    <AppShell>
      <PageHeader title="Avaliação Física" subtitle="Antropometria e evolução" />

      <section className="px-5 pt-5">
        {!latest && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <Ruler className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold">Nenhuma avaliação registrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Seu profissional ainda não cadastrou avaliações.
            </p>
          </div>
        )}

        {latest && (
          <div className="rounded-3xl bg-gradient-card border border-border p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Última avaliação</p>
                <p className="text-sm font-bold">
                  {new Date(latest.assessed_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <BigStat
                icon={Scale}
                label="Peso"
                value={latest.weight_kg ? `${latest.weight_kg} kg` : "—"}
                delta={deltaWeight ? `${deltaWeight > 0 ? "+" : ""}${deltaWeight.toFixed(1)} kg` : undefined}
                deltaPositive={deltaWeight < 0}
              />
              <BigStat
                icon={Activity}
                label="% Gordura"
                value={latest.body_fat_pct ? `${latest.body_fat_pct}%` : "—"}
                delta={deltaBF ? `${deltaBF > 0 ? "+" : ""}${deltaBF.toFixed(1)}%` : undefined}
                deltaPositive={deltaBF < 0}
              />
              <BigStat
                icon={Ruler}
                label="Altura"
                value={latest.height_cm ? `${latest.height_cm} cm` : "—"}
              />
              <BigStat
                icon={Activity}
                label="Massa Magra"
                value={latest.lean_mass_kg ? `${latest.lean_mass_kg} kg` : "—"}
              />
            </div>
          </div>
        )}
      </section>

      {latest?.measurements && Object.keys(latest.measurements).length > 0 && (
        <section className="px-5 mt-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Medidas (cm)
          </h2>
          <div className="rounded-2xl bg-card border border-border divide-y divide-border">
            {Object.entries(latest.measurements).map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-3 text-sm">
                <span className="capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-bold">{v} cm</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {assessments.length > 1 && (
        <section className="px-5 mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Histórico
          </h2>
          <div className="space-y-2">
            {assessments.slice(1).map((a) => (
              <div key={a.id} className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Scale className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{new Date(a.assessed_at).toLocaleDateString("pt-BR")}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.weight_kg ?? "—"}kg · {a.body_fat_pct ?? "—"}% gordura
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {latest?.photos && latest.photos.length > 0 && (
        <section className="px-5 mt-6 pb-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4" /> Fotos
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {latest.photos.map((p, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-secondary border border-border" />
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function BigStat({
  icon: Icon,
  label,
  value,
  delta,
  deltaPositive,
}: {
  icon: typeof Scale;
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-background/40 border border-border p-3">
      <Icon className="h-4 w-4 text-primary mb-1.5" />
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
      {delta && (
        <p className={`text-[10px] font-bold mt-1 ${deltaPositive ? "text-success" : "text-warning"}`}>
          {delta}
        </p>
      )}
    </div>
  );
}
