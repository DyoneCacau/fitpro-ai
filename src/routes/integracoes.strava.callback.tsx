import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exchangeStravaCode } from "@/lib/api/wearables.functions";

export const Route = createFileRoute("/integracoes/strava/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
  }),
  head: () => ({ meta: [{ title: "Conectando atividades — FitPro AI" }] }),
  component: StravaCallbackPage,
});

function StravaCallbackPage() {
  const navigate = useNavigate();
  const { code, error } = Route.useSearch();
  const [status, setStatus] = useState<"loading" | "ok" | "fail">("loading");

  useEffect(() => {
    if (error) {
      setStatus("fail");
      toast.error("Autorização cancelada.");
      return;
    }
    if (!code) {
      setStatus("fail");
      return;
    }

    void (async () => {
      try {
        await exchangeStravaCode({ data: { code } });
        setStatus("ok");
        toast.success("Atividades conectadas com sucesso!");
        setTimeout(() => {
          void navigate({ to: "/integracoes" });
        }, 1200);
      } catch (e) {
        setStatus("fail");
        toast.error(e instanceof Error ? e.message : "Erro ao conectar atividades");
      }
    })();
  }, [code, error, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-background">
      {status === "loading" && (
        <>
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Conectando atividades…</p>
        </>
      )}
      {status === "ok" && (
        <p className="text-sm font-semibold text-foreground">Conectado! Redirecionando…</p>
      )}
      {status === "fail" && (
        <button
          type="button"
          className="text-sm font-semibold text-primary underline"
          onClick={() => void navigate({ to: "/integracoes" })}
        >
          Voltar às integrações
        </button>
      )}
    </div>
  );
}
