-- RPC para criar agendamento (evita falhas de RLS no INSERT)

CREATE OR REPLACE FUNCTION public.create_student_appointment(
  _aluno_id uuid,
  _scheduled_at timestamptz,
  _duration_minutes int DEFAULT 60,
  _kind public.appointment_kind DEFAULT 'treino',
  _notes text DEFAULT NULL,
  _recurrence_days int DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  follow_kind public.appointment_kind;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT public.has_role(auth.uid(), 'personal')
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas profissionais podem agendar';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _aluno_id AND p.personal_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Aluno não vinculado a este profissional';
  END IF;

  IF _recurrence_days IS NOT NULL AND _recurrence_days <= 0 THEN
    RAISE EXCEPTION 'Intervalo de recorrência inválido';
  END IF;

  follow_kind := CASE WHEN _kind = 'treino' THEN 'retorno'::public.appointment_kind ELSE _kind END;

  INSERT INTO public.student_appointments (
    personal_id,
    aluno_id,
    scheduled_at,
    duration_minutes,
    kind,
    status,
    notes,
    recurrence_days
  ) VALUES (
    auth.uid(),
    _aluno_id,
    _scheduled_at,
    COALESCE(_duration_minutes, 60),
    _kind,
    'scheduled',
    NULLIF(trim(_notes), ''),
    _recurrence_days
  )
  RETURNING id INTO new_id;

  INSERT INTO public.student_follow_ups (
    personal_id, aluno_id, interval_days, kind, is_active
  ) VALUES (
    auth.uid(),
    _aluno_id,
    COALESCE(_recurrence_days, 30),
    follow_kind,
    true
  )
  ON CONFLICT (personal_id, aluno_id) DO UPDATE SET
    interval_days = EXCLUDED.interval_days,
    kind = EXCLUDED.kind,
    is_active = true,
    updated_at = now();

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_student_appointment(
  uuid, timestamptz, int, public.appointment_kind, text, int
) TO authenticated;
