import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { BillingPanel } from "@/components/professional/BillingPanel";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { fetchBillingSummary, formatCurrency } from "@/lib/billing";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — FitPro AI" }] }),
  component: () => (
    <AuthGate allowedRoles={["personal", "admin"]}>
      <FinanceiroPage />
    </AuthGate>
  ),
});

function FinanceiroPage() {
  const { user } = useAuth();

  const { data: summary } = useQuery({
    queryKey: ["billingSummary", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchBillingSummary(user!.id),
  });

  return (
    <AppShell>
      <PageHeader
        title="Financeiro"
        subtitle="Cobranças, planos e inadimplência · automatize sua recorrência"
      />
      <div className="px-5 py-5 pb-10 space-y-4">
        {summary && summary.overdueCount > 0 && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            <p className="font-bold text-destructive">
              {summary.overdueCount} cobrança{summary.overdueCount !== 1 ? "s" : ""} em atraso
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total: {formatCurrency(summary.overdueTotal)} · alunos foram notificados automaticamente
            </p>
          </div>
        )}
        {user?.id && <BillingPanel personalId={user.id} />}
      </div>
    </AppShell>
  );
}
