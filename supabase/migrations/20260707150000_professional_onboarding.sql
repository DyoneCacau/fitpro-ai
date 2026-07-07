-- Onboarding do profissional + assinatura SaaS da plataforma

-- ============ CAMPOS DE ONBOARDING NO PERFIL ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_skipped boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_student_range text,
  ADD COLUMN IF NOT EXISTS onboarding_revenue_range text,
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS tour_completed_at timestamptz;

-- ============ ASSINATURA DO PROFISSIONAL (SaaS) ============
CREATE TABLE IF NOT EXISTS public.professional_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'standard'
    CHECK (plan IN ('standard', 'premium', 'pro')),
  status text NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial', 'active', 'past_due', 'canceled')),
  price_cents int NOT NULL DEFAULT 0,
  cardholder_name text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  -- reservado para futura integração de gateway (Stripe/Mercado Pago/etc.)
  gateway text,
  gateway_customer_id text,
  gateway_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professional_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_subscriptions_prof
  ON public.professional_subscriptions (professional_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_subscriptions TO authenticated;
GRANT ALL ON public.professional_subscriptions TO service_role;

ALTER TABLE public.professional_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profissional gerencia própria assinatura" ON public.professional_subscriptions;
CREATE POLICY "Profissional gerencia própria assinatura"
  ON public.professional_subscriptions FOR ALL TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

CREATE TRIGGER trg_professional_subscriptions_upd
  BEFORE UPDATE ON public.professional_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
