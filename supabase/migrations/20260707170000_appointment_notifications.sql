-- Notifica o aluno quando o profissional agenda uma consulta/retorno.
-- A inserção em notifications é feita dentro de funções SECURITY DEFINER,
-- pois o RLS de notifications só permite user_id = auth.uid().

CREATE OR REPLACE FUNCTION public.appointment_kind_label(_kind public.appointment_kind)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _kind
    WHEN 'treino' THEN 'Treino'
    WHEN 'retorno' THEN 'Retorno'
    WHEN 'avaliacao' THEN 'Avaliação'
    WHEN 'consulta' THEN 'Consulta'
    ELSE 'Sessão'
  END;
$$;

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
  when_label text;
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

  -- Notifica o aluno sobre o novo agendamento
  when_label := to_char(
    _scheduled_at AT TIME ZONE 'America/Sao_Paulo',
    'DD/MM/YYYY "às" HH24:MI'
  );

  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (
    _aluno_id,
    'appointment_scheduled',
    'Novo agendamento: ' || public.appointment_kind_label(_kind),
    'Seu profissional agendou para ' || when_label
      || COALESCE(' — ' || NULLIF(trim(_notes), ''), ''),
    '/agenda'
  );

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_student_appointment(
  uuid, timestamptz, int, public.appointment_kind, text, int
) TO authenticated;

-- Ao concluir um agendamento recorrente, avisa o aluno da próxima sessão gerada
CREATE OR REPLACE FUNCTION public.complete_appointment(_appointment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ap public.student_appointments%ROWTYPE;
  next_id uuid;
  next_at timestamptz;
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
    next_at := ap.scheduled_at + (ap.recurrence_days || ' days')::interval;

    INSERT INTO public.student_appointments (
      personal_id, aluno_id, scheduled_at, duration_minutes, kind, status, notes, recurrence_days
    ) VALUES (
      ap.personal_id,
      ap.aluno_id,
      next_at,
      ap.duration_minutes,
      ap.kind,
      'scheduled',
      ap.notes,
      ap.recurrence_days
    )
    RETURNING id INTO next_id;

    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (
      ap.aluno_id,
      'appointment_scheduled',
      'Próximo ' || lower(public.appointment_kind_label(ap.kind)) || ' agendado',
      'Sua próxima sessão foi marcada para '
        || to_char(next_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI'),
      '/agenda'
    );
  END IF;

  RETURN next_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_appointment(uuid) TO authenticated;
