import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { fetchUserProfile, PROFILE_QUERY_KEY, resolveAvatarUrl } from "@/lib/profile";

export function useDisplayName(fallback = "Atleta") {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: [PROFILE_QUERY_KEY, user?.id],
    enabled: !!user?.id,
    refetchOnMount: "always",
    queryFn: () => fetchUserProfile(user!.id),
  });

  const { data: avatarUrl } = useQuery({
    queryKey: [PROFILE_QUERY_KEY, user?.id, "avatar", profile?.avatar_url],
    enabled: !!profile?.avatar_url,
    queryFn: () => resolveAvatarUrl(profile!.avatar_url),
  });

  const name =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email ||
    fallback;

  const firstName = name.split(/\s+/)[0] || name;
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return { name, firstName, initials, avatarUrl: avatarUrl ?? null, profile, isLoading };
}
