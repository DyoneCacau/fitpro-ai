import { format, startOfWeek, addDays, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type {
  HealthMetricsDaily,
  WearableActivity,
  WearableConnection,
  WearableProvider,
} from "./types";

export const WEARABLE_CONNECTIONS_KEY = "wearable-connections";
export const HEALTH_METRICS_KEY = "health-metrics";
export const WEARABLE_ACTIVITIES_KEY = "wearable-activities";

export async function fetchWearableConnections(userId: string): Promise<WearableConnection[]> {
  const { data, error } = await supabase
    .from("wearable_connections")
    .select(
      "id, user_id, provider, external_user_id, scopes, metadata, last_sync_at, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as WearableConnection[];
}

export async function disconnectWearable(
  userId: string,
  provider: WearableProvider,
): Promise<void> {
  const { error } = await supabase
    .from("wearable_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) throw error;
}

export async function upsertHealthMetricsDaily(
  userId: string,
  row: Omit<HealthMetricsDaily, "id" | "user_id"> & { provider: string; metric_date: string },
): Promise<void> {
  const { error } = await supabase.from("health_metrics_daily").upsert(
    {
      user_id: userId,
      metric_date: row.metric_date,
      provider: row.provider,
      steps: row.steps,
      active_calories: row.active_calories,
      resting_calories: row.resting_calories,
      distance_m: row.distance_m,
      heart_rate_avg: row.heart_rate_avg,
      sleep_minutes: row.sleep_minutes,
      source_label: row.source_label,
    },
    { onConflict: "user_id,metric_date,provider" },
  );

  if (error) throw error;
}

export async function fetchHealthMetricsRange(
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<HealthMetricsDaily[]> {
  const { data, error } = await supabase
    .from("health_metrics_daily")
    .select("*")
    .eq("user_id", userId)
    .gte("metric_date", fromDate)
    .lte("metric_date", toDate)
    .order("metric_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as HealthMetricsDaily[];
}

export async function fetchTodayAggregatedMetrics(userId: string): Promise<{
  steps: number;
  activeCalories: number;
  distanceM: number;
  heartRateAvg: number | null;
  sleepMinutes: number | null;
}> {
  const today = format(new Date(), "yyyy-MM-dd");
  const rows = await fetchHealthMetricsRange(userId, today, today);

  return {
    steps: rows.reduce((s, r) => s + (r.steps ?? 0), 0),
    activeCalories: rows.reduce((s, r) => s + Number(r.active_calories ?? 0), 0),
    distanceM: rows.reduce((s, r) => s + Number(r.distance_m ?? 0), 0),
    heartRateAvg: rows.find((r) => r.heart_rate_avg != null)?.heart_rate_avg ?? null,
    sleepMinutes: rows.find((r) => r.sleep_minutes != null)?.sleep_minutes ?? null,
  };
}

export async function upsertWearableActivities(
  userId: string,
  activities: Omit<WearableActivity, "id" | "user_id">[],
): Promise<void> {
  if (activities.length === 0) return;

  const { error } = await supabase.from("wearable_activities").upsert(
    activities.map((a) => ({
      user_id: userId,
      provider: a.provider,
      external_id: a.external_id,
      name: a.name,
      activity_type: a.activity_type,
      started_at: a.started_at,
      duration_sec: a.duration_sec,
      calories: a.calories,
      distance_m: a.distance_m,
    })),
    { onConflict: "user_id,provider,external_id" },
  );

  if (error) throw error;
}

export async function fetchRecentActivities(
  userId: string,
  limit = 5,
): Promise<WearableActivity[]> {
  const { data, error } = await supabase
    .from("wearable_activities")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as WearableActivity[];
}

export async function fetchWorkoutDaysThisWeek(userId: string): Promise<boolean[]> {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("started_at, status")
    .eq("aluno_id", userId)
    .gte("started_at", weekStart.toISOString())
    .lte("started_at", addDays(weekEnd, 1).toISOString());

  if (error) throw error;

  const days = Array.from({ length: 7 }, () => false);
  for (const session of data ?? []) {
    if (session.status !== "concluido" && session.status !== "em_andamento") continue;
    const d = new Date(session.started_at);
    const idx = (d.getDay() + 6) % 7;
    days[idx] = true;
  }
  return days;
}

export async function saveDeviceToken(
  userId: string,
  platform: "android" | "ios" | "web",
  token: string,
): Promise<void> {
  const { error } = await supabase.from("device_tokens").upsert(
    { user_id: userId, platform, token },
    { onConflict: "user_id,platform,token" },
  );
  if (error) throw error;
}

export function getStravaAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export async function markConnectionSynced(userId: string, provider: WearableProvider): Promise<void> {
  const { error } = await supabase
    .from("wearable_connections")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) throw error;
}

export function last7DaysRange(): { from: string; to: string } {
  const to = format(new Date(), "yyyy-MM-dd");
  const from = format(subDays(new Date(), 6), "yyyy-MM-dd");
  return { from, to };
}
