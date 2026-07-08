import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações — FitPro AI" }] }),
  component: () => (
    <AuthGate>
      <Notifs />
    </AuthGate>
  ),
});

function Notifs() {
  const { user } = useAuth();
  const { data: items = [], refetch } = useQuery({
    queryKey: ["notifs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .then(() => refetch());
  }, [user, refetch]);

  return (
    <AppShell>
      <PageHeader title="Notificações" subtitle="Suas atualizações" />
      <section className="px-5 py-5 space-y-2">
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <BellOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold">Sem notificações</p>
          </div>
        )}
        {items.map((n) => {
          const inner = (
            <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
            </>
          );
          const className =
            "rounded-2xl bg-card border border-border p-4 flex items-start gap-3";
          return n.link ? (
            <Link key={n.id} to={n.link} className={`${className} active:scale-[0.99] transition-transform`}>
              {inner}
            </Link>
          ) : (
            <div key={n.id} className={className}>
              {inner}
            </div>
          );
        })}
      </section>
    </AppShell>
  );
}
