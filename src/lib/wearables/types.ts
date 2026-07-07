export type WearableProvider =
  | "strava"
  | "health_connect"
  | "healthkit"
  | "samsung_health";

export type WearableConnection = {
  id: string;
  user_id: string;
  provider: WearableProvider;
  external_user_id: string | null;
  scopes: string[] | null;
  metadata: Record<string, unknown>;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HealthMetricsDaily = {
  id: string;
  user_id: string;
  metric_date: string;
  provider: string;
  steps: number | null;
  active_calories: number | null;
  resting_calories: number | null;
  distance_m: number | null;
  heart_rate_avg: number | null;
  sleep_minutes: number | null;
  source_label: string | null;
};

export type WearableActivity = {
  id: string;
  user_id: string;
  provider: string;
  external_id: string;
  name: string;
  activity_type: string | null;
  started_at: string;
  duration_sec: number | null;
  calories: number | null;
  distance_m: number | null;
};

export type HealthDashboardSummary = {
  date: string;
  steps: number;
  activeCalories: number;
  distanceKm: number;
  heartRateAvg: number | null;
  sleepHours: number | null;
  workoutDaysThisWeek: boolean[];
  mealsCompletedToday: number;
  mealsTotalToday: number;
  recentActivities: WearableActivity[];
  connectedProviders: WearableProvider[];
};
