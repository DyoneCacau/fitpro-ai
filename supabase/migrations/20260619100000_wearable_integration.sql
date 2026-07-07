-- Integração com wearables: conexões OAuth, métricas diárias, atividades e tokens push

CREATE TABLE public.wearable_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('strava', 'health_connect', 'healthkit', 'samsung_health')),
  external_user_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE TABLE public.health_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  provider text NOT NULL,
  steps integer,
  active_calories numeric(10, 2),
  resting_calories numeric(10, 2),
  distance_m numeric(12, 2),
  heart_rate_avg numeric(6, 2),
  sleep_minutes integer,
  source_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, metric_date, provider)
);

CREATE INDEX idx_health_metrics_daily_user_date
  ON public.health_metrics_daily (user_id, metric_date DESC);

CREATE TABLE public.wearable_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  name text NOT NULL,
  activity_type text,
  started_at timestamptz NOT NULL,
  duration_sec integer,
  calories numeric(10, 2),
  distance_m numeric(12, 2),
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, external_id)
);

CREATE INDEX idx_wearable_activities_user_started
  ON public.wearable_activities (user_id, started_at DESC);

CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, token)
);

CREATE INDEX idx_device_tokens_user ON public.device_tokens (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wearable_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_metrics_daily TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wearable_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.wearable_connections TO service_role;
GRANT ALL ON public.health_metrics_daily TO service_role;
GRANT ALL ON public.wearable_activities TO service_role;
GRANT ALL ON public.device_tokens TO service_role;

ALTER TABLE public.wearable_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario gerencia conexoes wearable"
  ON public.wearable_connections FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Personal ve conexoes de alunos"
  ON public.wearable_connections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = wearable_connections.user_id AND p.personal_id = auth.uid()
    )
  );

CREATE POLICY "Usuario gerencia metricas diarias"
  ON public.health_metrics_daily FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Personal ve metricas de alunos"
  ON public.health_metrics_daily FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = health_metrics_daily.user_id AND p.personal_id = auth.uid()
    )
  );

CREATE POLICY "Usuario gerencia atividades wearable"
  ON public.wearable_activities FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Personal ve atividades de alunos"
  ON public.wearable_activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = wearable_activities.user_id AND p.personal_id = auth.uid()
    )
  );

CREATE POLICY "Usuario gerencia tokens de dispositivo"
  ON public.device_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER wearable_connections_updated_at
  BEFORE UPDATE ON public.wearable_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER health_metrics_daily_updated_at
  BEFORE UPDATE ON public.health_metrics_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
