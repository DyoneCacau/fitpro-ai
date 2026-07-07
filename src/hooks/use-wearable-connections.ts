import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  WEARABLE_CONNECTIONS_KEY,
  disconnectWearable,
  fetchWearableConnections,
} from "@/lib/wearables/wearables";
import type { WearableProvider } from "@/lib/wearables/types";

export function useWearableConnections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [WEARABLE_CONNECTIONS_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchWearableConnections(user!.id),
  });
}

export function useDisconnectWearable() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (provider: WearableProvider) => disconnectWearable(user!.id, provider),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [WEARABLE_CONNECTIONS_KEY, user?.id] });
    },
  });
}

export function isProviderConnected(
  connections: { provider: string }[] | undefined,
  provider: WearableProvider,
): boolean {
  return (connections ?? []).some((c) => c.provider === provider);
}
