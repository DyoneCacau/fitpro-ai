-- Painel gerencial SaaS: profissionais que pagam a plataforma

-- Status blocked
DO $$
BEGIN
  ALTER TABLE public.professional_subscriptions
    DROP CONSTRAINT IF EXISTS professional_subscriptions_status_check;
  ALTER TABLE public.professional_subscriptions
    ADD CONSTRAINT professional_subscriptions_status_check
    CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'blocked'));
EXCEPTION WHEN others THEN
  NULL;
END $$;

ALTER TABLE public.professional_subscriptions
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Histórico de pagamentos SaaS
CREATE TABLE IF NOT EXISTS public.professional_subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents int NOT NULL CHECK (amount_cents >= 0),
  plan text NOT NULL DEFAULT 'standard',
  paid_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL DEFAULT 'external'
    CHECK (method IN ('external', 'pix', 'transfer', 'cash', 'other', 'card', 'boleto')),
  notes text,
  period_start timestamptz,
  period_end timestamptz,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  gateway_payment_id text,
  gateway_status text,
  payment_type text CHECK (payment_type IS NULL OR payment_type IN ('card', 'pix', 'boleto')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psp_professional
  ON public.professional_subscription_payments (professional_id, paid_at DESC);

ALTER TABLE public.professional_subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia pagamentos SaaS" ON public.professional_subscription_payments;
CREATE POLICY "Admin gerencia pagamentos SaaS"
  ON public.professional_subscription_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_subscription_payments TO authenticated;
GRANT ALL ON public.professional_subscription_payments TO service_role;

CREATE OR REPLACE FUNCTION public.plan_student_limit(_plan text, _status text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _status = 'trial' THEN 5
    WHEN _plan = 'standard' THEN 15
    WHEN _plan = 'premium' THEN 40
    WHEN _plan = 'pro' THEN NULL
    ELSE 5
  END;
$$;

CREATE OR REPLACE FUNCTION public.count_professional_students(_professional_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.profiles p
  WHERE p.personal_id = _professional_id;
$$;

-- Lista profissionais (exclui admins)
CREATE OR REPLACE FUNCTION public.admin_list_professionals()
RETURNS TABLE (
  professional_id uuid,
  full_name text,
  email text,
  plan text,
  status text,
  price_cents int,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  student_count int,
  student_limit int,
  created_at timestamptz,
  activated_at timestamptz,
  days_until_expiry int,
  is_expiring_soon boolean,
  is_overdue boolean,
  last_payment_at timestamptz,
  last_payment_amount_cents int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id,
    p.full_name,
    u.email::text,
    COALESCE(ps.plan, 'standard'),
    COALESCE(ps.status, 'trial'),
    COALESCE(ps.price_cents, 0),
    ps.trial_ends_at,
    ps.current_period_end,
    public.count_professional_students(ur.user_id),
    public.plan_student_limit(COALESCE(ps.plan, 'standard'), COALESCE(ps.status, 'trial')),
    COALESCE(ps.created_at, p.created_at),
    ps.activated_at,
    CASE
      WHEN COALESCE(ps.status, 'trial') = 'trial' AND ps.trial_ends_at IS NOT NULL
        THEN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (ps.trial_ends_at - now())) / 86400))::int
      WHEN ps.current_period_end IS NOT NULL
        THEN CEIL(EXTRACT(EPOCH FROM (ps.current_period_end - now())) / 86400)::int
      ELSE NULL
    END,
    CASE
      WHEN COALESCE(ps.status, 'trial') = 'trial' AND ps.trial_ends_at IS NOT NULL
        THEN ps.trial_ends_at <= now() + interval '3 days' AND ps.trial_ends_at >= now()
      WHEN COALESCE(ps.status, 'trial') = 'active' AND ps.current_period_end IS NOT NULL
        THEN ps.current_period_end <= now() + interval '7 days' AND ps.current_period_end >= now()
      ELSE false
    END,
    CASE
      WHEN COALESCE(ps.status, 'trial') = 'active' AND ps.current_period_end IS NOT NULL
        THEN ps.current_period_end < now()
      WHEN COALESCE(ps.status, 'trial') = 'past_due' THEN true
      ELSE false
    END,
    lp.paid_at,
    lp.amount_cents
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  LEFT JOIN public.professional_subscriptions ps ON ps.professional_id = ur.user_id
  LEFT JOIN LATERAL (
    SELECT pp.paid_at, pp.amount_cents
    FROM public.professional_subscription_payments pp
    WHERE pp.professional_id = ur.user_id
    ORDER BY pp.paid_at DESC
    LIMIT 1
  ) lp ON true
  WHERE ur.role = 'personal'
    AND NOT public.has_role(ur.user_id, 'admin')
  ORDER BY
    CASE COALESCE(ps.status, 'trial')
      WHEN 'past_due' THEN 0
      WHEN 'blocked' THEN 1
      WHEN 'trial' THEN 2
      WHEN 'active' THEN 3
      ELSE 4
    END,
    p.full_name NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_record_manual_payment(
  _professional_id uuid,
  _plan text DEFAULT 'standard',
  _amount_cents int DEFAULT NULL,
  _method text DEFAULT 'external',
  _notes text DEFAULT NULL,
  _extend_days int DEFAULT 30
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _price int;
  _period_start timestamptz := now();
  _period_end timestamptz;
  _payment_id uuid;
  _days int := GREATEST(COALESCE(_extend_days, 30), 1);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;
  IF public.has_role(_professional_id, 'admin') THEN
    RAISE EXCEPTION 'Administradores não entram no fluxo de assinatura';
  END IF;
  IF _plan NOT IN ('standard', 'premium', 'pro') THEN
    RAISE EXCEPTION 'Plano inválido';
  END IF;
  IF _method NOT IN ('external', 'pix', 'transfer', 'cash', 'other', 'card', 'boleto') THEN
    RAISE EXCEPTION 'Método inválido';
  END IF;

  _price := CASE _plan
    WHEN 'standard' THEN 4990
    WHEN 'premium' THEN 7990
    WHEN 'pro' THEN 12990
    ELSE 4990
  END;

  IF _amount_cents IS NULL THEN
    _amount_cents := _price;
  END IF;

  _period_end := _period_start + (_days || ' days')::interval;

  INSERT INTO public.professional_subscriptions (
    professional_id, plan, status, price_cents,
    trial_ends_at, current_period_end, activated_at, activated_by
  ) VALUES (
    _professional_id, _plan, 'active', _price,
    NULL, _period_end, now(), auth.uid()
  )
  ON CONFLICT (professional_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = 'active',
    price_cents = EXCLUDED.price_cents,
    current_period_end = EXCLUDED.current_period_end,
    activated_at = now(),
    activated_by = auth.uid(),
    updated_at = now();

  INSERT INTO public.professional_subscription_payments (
    professional_id, amount_cents, plan, paid_at, method, notes,
    period_start, period_end, recorded_by, gateway_status
  ) VALUES (
    _professional_id, _amount_cents, _plan, now(), _method, _notes,
    _period_start, _period_end, auth.uid(), 'manual'
  )
  RETURNING id INTO _payment_id;

  RETURN _payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_activate_subscription(
  _professional_id uuid,
  _plan text DEFAULT 'standard'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_record_manual_payment(_professional_id, _plan, NULL, 'external', 'Ativação admin', 30);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_cancel_subscription(_professional_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;
  UPDATE public.professional_subscriptions
  SET status = 'canceled', updated_at = now()
  WHERE professional_id = _professional_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_block_professional(_professional_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;
  INSERT INTO public.professional_subscriptions (
    professional_id, plan, status, price_cents
  ) VALUES (
    _professional_id, 'standard', 'blocked', 0
  )
  ON CONFLICT (professional_id) DO UPDATE SET
    status = 'blocked',
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_change_plan(
  _professional_id uuid,
  _plan text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _price int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;
  IF _plan NOT IN ('standard', 'premium', 'pro') THEN
    RAISE EXCEPTION 'Plano inválido';
  END IF;
  _price := CASE _plan
    WHEN 'standard' THEN 4990
    WHEN 'premium' THEN 7990
    WHEN 'pro' THEN 12990
    ELSE 4990
  END;
  UPDATE public.professional_subscriptions
  SET plan = _plan, price_cents = _price, updated_at = now()
  WHERE professional_id = _professional_id;
  IF NOT FOUND THEN
    INSERT INTO public.professional_subscriptions (
      professional_id, plan, status, price_cents
    ) VALUES (
      _professional_id, _plan, 'past_due', _price
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_subscription_payments(
  _professional_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  professional_id uuid,
  professional_name text,
  professional_email text,
  amount_cents int,
  plan text,
  paid_at timestamptz,
  method text,
  notes text,
  period_start timestamptz,
  period_end timestamptz,
  gateway_payment_id text,
  gateway_status text,
  payment_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;

  RETURN QUERY
  SELECT
    pay.id,
    pay.professional_id,
    p.full_name,
    u.email::text,
    pay.amount_cents,
    pay.plan,
    pay.paid_at,
    pay.method,
    pay.notes,
    pay.period_start,
    pay.period_end,
    pay.gateway_payment_id,
    pay.gateway_status,
    pay.payment_type
  FROM public.professional_subscription_payments pay
  LEFT JOIN public.profiles p ON p.id = pay.professional_id
  LEFT JOIN auth.users u ON u.id = pay.professional_id
  WHERE _professional_id IS NULL OR pay.professional_id = _professional_id
  ORDER BY pay.paid_at DESC
  LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_professionals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_manual_payment(uuid, text, int, text, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activate_subscription(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_block_professional(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_plan(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_subscription_payments(uuid) TO authenticated;

-- Garante role admin para o dono da plataforma
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'dyonecacau@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
