import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { buildHealthDashboard } from "@/lib/wearables/dashboard";
import { syncAllWearables } from "@/lib/wearables/native-health";
import { WEARABLE_CONNECTIONS_KEY, WEARABLE_ACTIVITIES_KEY } from "@/lib/wearables/wearables";

export const HEALTH_DASHBOARD_KEY = "health-dashboard";

export function useHealthDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [HEALTH_DASHBOARD_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: () => buildHealthDashboard(user!.id),
    staleTime: 60_000,
  });
}

export function useSyncWearables() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => syncAllWearables(user!.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [HEALTH_DASHBOARD_KEY, user?.id] });
      void qc.invalidateQueries({ queryKey: [WEARABLE_CONNECTIONS_KEY, user?.id] });
      void qc.invalidateQueries({ queryKey: [WEARABLE_ACTIVITIES_KEY, user?.id] });
    },
  });
}
