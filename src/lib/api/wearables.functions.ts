import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function getStravaConfig() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const appUrl = process.env.APP_URL ?? process.env.VITE_APP_URL ?? "http://localhost:8080";
  if (!clientId || !clientSecret) {
    throw new Error(
      "Strava não configurado. Defina STRAVA_CLIENT_ID e STRAVA_CLIENT_SECRET no .env",
    );
  }
  return { clientId, clientSecret, appUrl };
}

type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: { id: number; firstname?: string; lastname?: string };
};

type StravaActivity = {
  id: number;
  name: string;
  type: string;
  start_date: string;
  elapsed_time: number;
  calories?: number;
  distance: number;
};

async function refreshStravaToken(
  supabase: Awaited<ReturnType<typeof import("@supabase/supabase-js").createClient>>,
  userId: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error("Falha ao renovar token Strava");

  const data = (await res.json()) as StravaTokenResponse;
  await supabase
    .from("wearable_connections")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: new Date(data.expires_at * 1000).toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "strava");

  return data.access_token;
}

export const getStravaConnectInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { clientId, appUrl } = getStravaConfig();
    const redirectUri = `${appUrl}/integracoes/strava/callback`;
    const state = context.userId;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      approval_prompt: "auto",
      scope: "read,activity:read_all",
      state,
    });
    return {
      authUrl: `https://www.strava.com/oauth/authorize?${params.toString()}`,
      redirectUri,
    };
  });

export const exchangeStravaCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ code: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    const { clientId, clientSecret, appUrl } = getStravaConfig();
    const redirectUri = `${appUrl}/integracoes/strava/callback`;

    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: data.code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Strava OAuth falhou: ${err}`);
    }

    const tokenData = (await res.json()) as StravaTokenResponse;
    const { supabase, userId } = context;

    const { error } = await supabase.from("wearable_connections").upsert(
      {
        user_id: userId,
        provider: "strava",
        external_user_id: String(tokenData.athlete.id),
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
        scopes: ["read", "activity:read_all"],
        metadata: {
          athlete_name: [tokenData.athlete.firstname, tokenData.athlete.lastname]
            .filter(Boolean)
            .join(" "),
        },
        last_sync_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );

    if (error) throw error;
    return { ok: true as const };
  });

export const syncStravaData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ days: z.number().min(1).max(30).default(14) }))
  .handler(async ({ context, data }) => {
    const { clientId, clientSecret } = getStravaConfig();
    const { supabase, userId } = context;

    const { data: conn, error: connErr } = await supabase
      .from("wearable_connections")
      .select("access_token, refresh_token, token_expires_at")
      .eq("user_id", userId)
      .eq("provider", "strava")
      .maybeSingle();

    if (connErr) throw connErr;
    if (!conn?.access_token) throw new Error("Strava não conectado");

    let accessToken = conn.access_token;
    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
    if (expiresAt < Date.now() + 60_000 && conn.refresh_token) {
      accessToken = await refreshStravaToken(
        supabase,
        userId,
        conn.refresh_token,
        clientId,
        clientSecret,
      );
    }

    const after = Math.floor((Date.now() - data.days * 86_400_000) / 1000);
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) throw new Error("Falha ao buscar atividades Strava");

    const activities = (await res.json()) as StravaActivity[];
    if (activities.length === 0) {
      await supabase
        .from("wearable_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("provider", "strava");
      return { activitiesImported: 0 };
    }

    const rows = activities.map((a) => ({
      user_id: userId,
      provider: "strava",
      external_id: String(a.id),
      name: a.name,
      activity_type: a.type,
      started_at: a.start_date,
      duration_sec: a.elapsed_time,
      calories: a.calories ?? null,
      distance_m: a.distance,
      raw_data: a as unknown as import("@/integrations/supabase/types").Json,
    }));

    const { error: upsertErr } = await supabase
      .from("wearable_activities")
      .upsert(rows, { onConflict: "user_id,provider,external_id" });

    if (upsertErr) throw upsertErr;

    // Agregar calorias do dia a partir das atividades Strava
    const byDate = new Map<string, { calories: number; distance: number }>();
    for (const a of activities) {
      const date = a.start_date.slice(0, 10);
      const prev = byDate.get(date) ?? { calories: 0, distance: 0 };
      byDate.set(date, {
        calories: prev.calories + (a.calories ?? 0),
        distance: prev.distance + a.distance,
      });
    }

    for (const [metric_date, agg] of byDate) {
      await supabase.from("health_metrics_daily").upsert(
        {
          user_id: userId,
          metric_date,
          provider: "strava",
          active_calories: agg.calories,
          distance_m: agg.distance,
          source_label: "Strava",
        },
        { onConflict: "user_id,metric_date,provider" },
      );
    }

    await supabase
      .from("wearable_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("provider", "strava");

    return { activitiesImported: activities.length };
  });

export const disconnectStrava = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("wearable_connections")
      .delete()
      .eq("user_id", context.userId)
      .eq("provider", "strava");
    if (error) throw error;
    return { ok: true as const };
  });
