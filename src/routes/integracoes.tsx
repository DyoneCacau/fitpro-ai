import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { HealthDashboardCard } from "@/components/student/wearables/HealthDashboardCard";
import { WearableConnectPanel } from "@/components/student/wearables/WearableConnectPanel";

export const Route = createFileRoute("/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — FitPro AI" }] }),
  component: () => (
    <AuthGate>
      <IntegracoesPage />
    </AuthGate>
  ),
});

function IntegracoesPage() {
  return (
    <AppShell>
      <PageHeader
        title="Relógio e saúde"
        subtitle="Conecte seu relógio e apps de atividade"
      />
      <section className="px-5 pb-8 space-y-5">
        <HealthDashboardCard />
        <WearableConnectPanel />
      </section>
    </AppShell>
  );
}
