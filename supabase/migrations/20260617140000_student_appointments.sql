-- Agendamentos e retornos recorrentes (personal ↔ aluno)

CREATE TYPE public.appointment_kind AS ENUM (
  'treino',
  'retorno',
  'avaliacao',
  'consulta'
);

CREATE TYPE public.appointment_status AS ENUM (
  'scheduled',
  'completed',
  'cancelled'
);

CREATE TABLE public.student_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  kind public.appointment_kind NOT NULL DEFAULT 'treino',
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  notes text,
  recurrence_days int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_appointments_recurrence_positive
    CHECK (recurrence_days IS NULL OR recurrence_days > 0)
);

CREATE INDEX idx_student_appointments_personal_date
  ON public.student_appointments (personal_id, scheduled_at);

CREATE INDEX idx_student_appointments_aluno
  ON public.student_appointments (aluno_id);

ALTER TABLE public.student_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal gerencia agendamentos"
  ON public.student_appointments FOR ALL TO authenticated
  USING (personal_id = auth.uid())
  WITH CHECK (
    personal_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = aluno_id AND p.personal_id = auth.uid()
    )
  );

CREATE POLICY "Aluno vê seus agendamentos"
  ON public.student_appointments FOR SELECT TO authenticated
  USING (aluno_id = auth.uid());

CREATE TRIGGER trg_student_appointments_upd
  BEFORE UPDATE ON public.student_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_appointments TO authenticated;
GRANT ALL ON public.student_appointments TO service_role;

-- Retornos recorrentes (ex.: reavaliação a cada 30 dias)
CREATE TABLE public.student_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interval_days int NOT NULL DEFAULT 30,
  kind public.appointment_kind NOT NULL DEFAULT 'retorno',
  last_visit_at timestamptz,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (personal_id, aluno_id),
  CONSTRAINT student_follow_ups_interval_positive CHECK (interval_days > 0)
);

ALTER TABLE public.student_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal gerencia retornos"
  ON public.student_follow_ups FOR ALL TO authenticated
  USING (personal_id = auth.uid())
  WITH CHECK (
    personal_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = aluno_id AND p.personal_id = auth.uid()
    )
  );

CREATE TRIGGER trg_student_follow_ups_upd
  BEFORE UPDATE ON public.student_follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_follow_ups TO authenticated;
GRANT ALL ON public.student_follow_ups TO service_role;

-- Marca agendamento concluído e gera próximo se recorrente
CREATE OR REPLACE FUNCTION public.complete_appointment(_appointment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ap public.student_appointments%ROWTYPE;
  next_id uuid;
BEGIN
  SELECT * INTO ap FROM public.student_appointments WHERE id = _appointment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado';
  END IF;
  IF ap.personal_id <> auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.student_appointments
  SET status = 'completed', updated_at = now()
  WHERE id = _appointment_id;

  UPDATE public.student_follow_ups
  SET last_visit_at = ap.scheduled_at, updated_at = now()
  WHERE personal_id = ap.personal_id AND aluno_id = ap.aluno_id;

  IF ap.recurrence_days IS NOT NULL THEN
    INSERT INTO public.student_appointments (
      personal_id, aluno_id, scheduled_at, duration_minutes, kind, status, notes, recurrence_days
    ) VALUES (
      ap.personal_id,
      ap.aluno_id,
      ap.scheduled_at + (ap.recurrence_days || ' days')::interval,
      ap.duration_minutes,
      ap.kind,
      'scheduled',
      ap.notes,
      ap.recurrence_days
    )
    RETURNING id INTO next_id;
  END IF;

  RETURN next_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_appointment(uuid) TO authenticated;
