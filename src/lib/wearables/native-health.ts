import { Capacitor } from "@capacitor/core";
import { format, subDays } from "date-fns";
import type { WearableProvider } from "./types";
import {
  markConnectionSynced,
  upsertHealthMetricsDaily,
  upsertWearableActivities,
} from "./wearables";

type HealthPlugin = typeof import("@capgo/capacitor-health").Health;

async function getHealthPlugin(): Promise<HealthPlugin | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import("@capgo/capacitor-health");
    const availability = await mod.Health.isAvailable();
    if (!availability.available) return null;
    return mod.Health;
  } catch {
    return null;
  }
}

export async function requestNativeHealthAccess(): Promise<boolean> {
  const Health = await getHealthPlugin();
  if (!Health) return false;

  await Health.requestAuthorization({
    read: ["steps", "calories", "distance", "heartRate", "sleep"],
    write: [],
  });

  const auth = await Health.checkAuthorization({
    read: ["steps", "calories", "distance", "heartRate", "sleep"],
    write: [],
  });

  return auth.readAuthorized.length > 0;
}

function nativeProvider(): WearableProvider {
  return Capacitor.getPlatform() === "ios" ? "healthkit" : "health_connect";
}

async function sumSamples(
  Health: HealthPlugin,
  dataType: "steps" | "calories" | "distance" | "heartRate" | "sleep",
  startDate: string,
  endDate: string,
): Promise<number> {
  const { samples } = await Health.readSamples({
    dataType,
    startDate,
    endDate,
    limit: 500,
  });

  if (dataType === "heartRate") {
    if (samples.length === 0) return 0;
    const total = samples.reduce((s, x) => s + Number(x.value ?? 0), 0);
    return total / samples.length;
  }

  return samples.reduce((s, x) => s + Number(x.value ?? 0), 0);
}

export async function syncNativeHealthMetrics(userId: string, days = 7): Promise<void> {
  const Health = await getHealthPlugin();
  if (!Health) return;

  const provider = nativeProvider();
  const end = new Date();
  const start = subDays(end, days);

  for (let i = 0; i <= days; i++) {
    const dayStart = subDays(end, i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const isoStart = dayStart.toISOString();
    const isoEnd = dayEnd.toISOString();

    const [steps, calories, distanceM, heartRate, sleepSamples] = await Promise.all([
      sumSamples(Health, "steps", isoStart, isoEnd),
      sumSamples(Health, "calories", isoStart, isoEnd),
      sumSamples(Health, "distance", isoStart, isoEnd),
      sumSamples(Health, "heartRate", isoStart, isoEnd),
      Health.readSamples({ dataType: "sleep", startDate: isoStart, endDate: isoEnd, limit: 50 }),
    ]);

    const sleepMinutes = sleepSamples.samples.reduce(
      (s, x) => s + Number(x.value ?? 0) / 60,
      0,
    );

    await upsertHealthMetricsDaily(userId, {
      metric_date: format(dayStart, "yyyy-MM-dd"),
      provider,
      steps: Math.round(steps),
      active_calories: Math.round(calories * 100) / 100,
      resting_calories: null,
      distance_m: Math.round(distanceM * 100) / 100,
      heart_rate_avg: heartRate > 0 ? Math.round(heartRate * 10) / 10 : null,
      sleep_minutes: sleepMinutes > 0 ? Math.round(sleepMinutes) : null,
      source_label: Capacitor.getPlatform() === "ios" ? "Apple Saúde" : "Health Connect",
    });
  }

  await markConnectionSynced(userId, provider);
}

export async function isNativeHealthAvailable(): Promise<boolean> {
  const Health = await getHealthPlugin();
  return Health != null;
}

export async function connectSamsungHealthHint(userId: string): Promise<void> {
  // Samsung Health sincroniza via Health Connect — registramos a intenção de uso
  const provider: WearableProvider = "samsung_health";
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.from("wearable_connections").upsert(
    {
      user_id: userId,
      provider,
      metadata: { via: "health_connect", note: "Conecte Samsung Health ao Health Connect" },
      last_sync_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw error;
}

export async function syncStravaActivitiesFromServer(userId: string): Promise<number> {
  const { syncStravaData } = await import("@/lib/api/wearables.functions");
  const result = await syncStravaData({ data: { days: 14 } });
  return result.activitiesImported;
}

export async function syncAllWearables(userId: string): Promise<{
  native: boolean;
  stravaActivities: number;
}> {
  let native = false;
  if (await isNativeHealthAvailable()) {
    await syncNativeHealthMetrics(userId, 7);
    native = true;
  }

  let stravaActivities = 0;
  try {
    stravaActivities = await syncStravaActivitiesFromServer(userId);
  } catch {
    // Strava não conectado ou credenciais ausentes
  }

  return { native, stravaActivities };
}

// Re-export for strava sync from server response handling
export { upsertWearableActivities };
