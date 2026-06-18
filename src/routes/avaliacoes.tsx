import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/avaliacoes")({
  head: () => ({ meta: [{ title: "Avaliações — FitPro AI" }] }),
  component: () => (
    <AuthGate>
      <AvaliacoesRedirect />
    </AuthGate>
  ),
});

function AvaliacoesRedirect() {
  const { role } = useAuth();
  if (role === "aluno") return <Navigate to="/perfil" search={{ tab: "acompanhamento" }} />;
  return <Navigate to="/" />;
}
