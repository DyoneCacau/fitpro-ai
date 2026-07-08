import { Link } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { useState } from "react";
import { Check, ExternalLink, Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  isProviderConnected,
  useDisconnectWearable,
  useWearableConnections,
} from "@/hooks/use-wearable-connections";
import { useSyncWearables } from "@/hooks/use-health-dashboard";
import {
  disconnectStrava,
  getStravaConnectInfo,
  syncStravaData,
} from "@/lib/api/wearables.functions";
import {
  connectSamsungHealthHint,
  isNativeHealthAvailable,
  requestNativeHealthAccess,
  syncNativeHealthMetrics,
} from "@/lib/wearables/native-health";
import { WEARABLE_PROVIDERS, type ProviderMeta } from "@/lib/wearables/providers";
import type { WearableProvider } from "@/lib/wearables/types";
import { supabase } from "@/integrations/supabase/client";

function platformMatches(meta: ProviderMeta): boolean {
  const platform = Capacitor.getPlatform();
  if (platform === "web") return meta.platforms.includes("web");
  if (platform === "android") return meta.platforms.includes("android");
  if (platform === "ios") return meta.platforms.includes("ios");
  return false;
}

export function WearableConnectPanel() {
  const { user } = useAuth();
  const { data: connections = [], refetch } = useWearableConnections();
  const disconnect = useDisconnectWearable();
  const syncAll = useSyncWearables();
  const [busy, setBusy] = useState<WearableProvider | null>(null);

  const visibleProviders = WEARABLE_PROVIDERS.filter(platformMatches);

  async function connectStrava() {
    setBusy("strava");
    try {
      const { authUrl } = await getStravaConnectInfo();
      window.location.href = authUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao conectar atividades");
      setBusy(null);
    }
  }

  async function connectNative(provider: "health_connect" | "healthkit") {
    if (!user) return;
    setBusy(provider);
    try {
      const ok = await requestNativeHealthAccess();
      if (!ok) {
        toast.error("Permissão de saúde negada ou indisponível.");
        return;
      }

      const { error } = await supabase.from("wearable_connections").upsert(
        {
          user_id: user.id,
          provider,
          metadata: { connected_at: new Date().toISOString() },
          last_sync_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" },
      );
      if (error) throw error;

      await syncNativeHealthMetrics(user.id, 7);
      toast.success("Saúde conectada e sincronizada!");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao conectar saúde nativa");
    } finally {
      setBusy(null);
    }
  }

  async function connectSamsung() {
    if (!user) return;
    setBusy("samsung_health");
    try {
      const healthOk = await isNativeHealthAvailable();
      if (!healthOk) {
        toast.error("Instale o Health Connect e tente novamente.");
        return;
      }
      await requestNativeHealthAccess();
      await connectSamsungHealthHint(user.id);
      await syncNativeHealthMetrics(user.id, 7);
      toast.success("Samsung Health via Health Connect configurado!");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro Samsung Health");
    } finally {
      setBusy(null);
    }
  }

  async function handleDisconnect(provider: WearableProvider) {
    setBusy(provider);
    try {
      if (provider === "strava") {
        await disconnectStrava();
      } else {
        await disconnect.mutateAsync(provider);
      }
      toast.success("Desconectado.");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao desconectar");
    } finally {
      setBusy(null);
    }
  }

  async function handleSync(provider: WearableProvider) {
    setBusy(provider);
    try {
      if (provider === "strava") {
        const r = await syncStravaData({ data: { days: 14 } });
        toast.success(`${r.activitiesImported} atividades importadas.`);
      } else if (user) {
        await syncNativeHealthMetrics(user.id, 7);
        toast.success("Métricas de saúde sincronizadas.");
      }
      await refetch();
      syncAll.mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na sincronização");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground mb-1">Como funciona</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong>Apple Watch</strong> — via Apple Saúde no iPhone (app nativo).
          </li>
          <li>
            <strong>Samsung / Garmin / Fitbit</strong> — via Health Connect no Android.
          </li>
          <li>
            <strong>Corridas e ciclismo</strong> — importa suas atividades e calorias por GPS.
          </li>
          <li>
            Notificações do app aparecem no relógio quando pareado com o celular (push nativo).
          </li>
          <li>
            <Link to="/privacidade-saude" className="text-primary underline">
              Política de dados de saúde
            </Link>
          </li>
        </ul>
      </div>

      {visibleProviders.map((meta) => {
        const connected = isProviderConnected(connections, meta.id);
        const Icon = meta.icon;
        const conn = connections.find((c) => c.provider === meta.id);
        const isBusy = busy === meta.id;

        return (
          <div
            key={meta.id}
            className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="size-12 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center">
                <Icon className="size-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm">{meta.label}</h3>
                  {connected && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <Check className="size-3" /> Conectado
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                {conn?.last_sync_at && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Última sync: {new Date(conn.last_sync_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!connected ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => {
                    if (meta.id === "strava") void connectStrava();
                    else if (meta.id === "samsung_health") void connectSamsung();
                    else if (meta.id === "health_connect" || meta.id === "healthkit")
                      void connectNative(meta.id);
                  }}
                >
                  {isBusy ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                  Conectar
                  {meta.connectMode === "oauth" && <ExternalLink className="size-3.5 ml-1" />}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isBusy}
                    onClick={() => void handleSync(meta.id)}
                  >
                    {isBusy ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                    Sincronizar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => void handleDisconnect(meta.id)}
                  >
                    <Unplug className="size-3.5 mr-1" />
                    Desconectar
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {Capacitor.isNativePlatform() && (
        <p className="text-[10px] text-center text-muted-foreground px-2">
          No Samsung: abra Samsung Health → Configurações → Health Connect → permita compartilhar
          passos, calorias e treinos com o FitPro AI.
        </p>
      )}
    </div>
  );
}
