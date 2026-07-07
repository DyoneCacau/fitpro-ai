import { useQuery } from "@tanstack/react-query";
import { fetchUnreadCount } from "@/lib/notifications";

export function useUnreadNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ["unreadNotifs", userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: () => fetchUnreadCount(userId!),
  });
}
