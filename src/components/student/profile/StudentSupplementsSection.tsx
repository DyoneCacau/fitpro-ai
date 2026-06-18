import { useQuery } from "@tanstack/react-query";
import { Pill } from "lucide-react";
import { EmptyState } from "@/components/student/FeatureHub";
import { useAuth } from "@/hooks/use-auth";
import { fetchStudentActiveDietPlan, sortSupplements } from "@/lib/diet";

export function StudentSupplementsSection() {
  const { user } = useAuth();
  const { data: plan, isLoading } = useQuery({
    queryKey: ["dietPlanFull", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchStudentActiveDietPlan(user!.id),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>;
  }

  const supplements = sortSupplements(plan?.diet_supplements);

  if (!plan || supplements.length === 0) {
    return (
      <EmptyState
        icon={Pill}
        title="Nenhum suplemento"
        description="Seu profissional ainda não cadastrou suplementos no seu plano."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{plan.name}</p>
      {supplements.map((s) => (
        <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold">{s.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {s.dosage.trim() || "—"}
            {s.timing?.trim() && ` · ${s.timing.trim()}`}
          </p>
          {s.notes?.trim() && <p className="text-[10px] text-muted-foreground mt-1">{s.notes}</p>}
        </div>
      ))}
    </div>
  );
}
