-- Cobrança de alunos + anamnese preenchida pelo aluno

-- ============ BILLING ============
CREATE TABLE IF NOT EXISTS public.billing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount_cents int NOT NULL CHECK (amount_cents > 0),
  billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_plans_personal ON public.billing_plans (personal_id);

CREATE TABLE IF NOT EXISTS public.student_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.billing_plans(id) ON DELETE SET NULL,
  amount_cents int NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancelled')),
  starts_at date NOT NULL DEFAULT CURRENT_DATE,
  next_due_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_subscriptions_personal ON public.student_subscriptions (personal_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_aluno ON public.student_subscriptions (aluno_id);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.student_subscriptions(id) ON DELETE SET NULL,
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents int NOT NULL CHECK (amount_cents > 0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at timestamptz,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_personal_status ON public.invoices (personal_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_aluno ON public.invoices (aluno_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON public.invoices (due_date, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.billing_plans TO service_role;
GRANT ALL ON public.student_subscriptions TO service_role;
GRANT ALL ON public.invoices TO service_role;

ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal gerencia planos de cobrança"
  ON public.billing_plans FOR ALL TO authenticated
  USING (personal_id = auth.uid())
  WITH CHECK (personal_id = auth.uid());

CREATE POLICY "Personal gerencia assinaturas dos alunos"
  ON public.student_subscriptions FOR ALL TO authenticated
  USING (personal_id = auth.uid())
  WITH CHECK (personal_id = auth.uid());

CREATE POLICY "Aluno vê própria assinatura"
  ON public.student_subscriptions FOR SELECT TO authenticated
  USING (aluno_id = auth.uid());

CREATE POLICY "Personal gerencia faturas"
  ON public.invoices FOR ALL TO authenticated
  USING (personal_id = auth.uid())
  WITH CHECK (personal_id = auth.uid());

CREATE POLICY "Aluno vê próprias faturas"
  ON public.invoices FOR SELECT TO authenticated
  USING (aluno_id = auth.uid());

CREATE TRIGGER trg_student_subscriptions_upd
  BEFORE UPDATE ON public.student_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Marca faturas vencidas e notifica profissional + aluno
CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  marked int := 0;
BEGIN
  FOR rec IN
    SELECT id, aluno_id, personal_id, amount_cents, due_date
    FROM public.invoices
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE
  LOOP
    UPDATE public.invoices SET status = 'overdue' WHERE id = rec.id;

    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (
      rec.personal_id,
      'billing_overdue',
      'Cobrança em atraso',
      'Fatura de R$ ' || trim(to_char(rec.amount_cents / 100.0, '999990D00')) ||
        ' venceu em ' || to_char(rec.due_date, 'DD/MM/YYYY') || '.',
      '/financeiro'
    );

    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (
      rec.aluno_id,
      'billing_overdue',
      'Pagamento em atraso',
      'Sua mensalidade venceu em ' || to_char(rec.due_date, 'DD/MM/YYYY') ||
        '. Entre em contato com seu profissional.',
      '/perfil'
    );

    marked := marked + 1;
  END LOOP;
  RETURN marked;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_overdue_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_overdue_invoices() TO service_role;

-- ============ ANAMNESE PELO ALUNO ============
DROP POLICY IF EXISTS "Aluno preenche própria anamnese" ON public.anamnesis;

CREATE POLICY "Aluno preenche própria anamnese"
  ON public.anamnesis FOR INSERT TO authenticated
  WITH CHECK (
    aluno_id = auth.uid()
    AND personal_id = (SELECT p.personal_id FROM public.profiles p WHERE p.id = auth.uid())
    AND personal_id IS NOT NULL
  );

CREATE POLICY "Aluno atualiza própria anamnese"
  ON public.anamnesis FOR UPDATE TO authenticated
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());
