import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/privacidade-saude")({
  head: () => ({ meta: [{ title: "Privacidade de Saúde — FitPro AI" }] }),
  component: PrivacidadeSaudePage,
});

function PrivacidadeSaudePage() {
  return (
    <AppShell>
      <PageHeader title="Dados de saúde" subtitle="Política de privacidade" />
      <article className="px-5 pb-10 prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
        <p>
          O FitPro AI lê dados de saúde (passos, calorias, distância, frequência cardíaca e sono)
          somente com sua autorização, via Apple Saúde ou Health Connect.
        </p>
        <h2 className="text-foreground text-base font-bold mt-6">Como usamos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Painel de atividade e integração com treino/dieta</li>
          <li>Acompanhamento pelo profissional vinculado</li>
          <li>Sincronização opcional com Strava</li>
        </ul>
        <h2 className="text-foreground text-base font-bold mt-6">Seus direitos</h2>
        <p>
          Desconecte integrações em Perfil → Relógio, Strava e saúde. Notificações push seguem as
          permissões do sistema operacional e aparecem no relógio quando pareado.
        </p>
      </article>
    </AppShell>
  );
}
