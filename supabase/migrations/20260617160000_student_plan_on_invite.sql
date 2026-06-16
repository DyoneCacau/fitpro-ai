-- Plano de retorno/reavaliação definido no convite do aluno

ALTER TABLE public.student_invitations
  ADD COLUMN IF NOT EXISTS follow_up_interval_days int NOT NULL DEFAULT 30
    CHECK (follow_up_interval_days > 0),
  ADD COLUMN IF NOT EXISTS follow_up_kind public.appointment_kind NOT NULL DEFAULT 'retorno';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS follow_up_interval_days int
    CHECK (follow_up_interval_days IS NULL OR follow_up_interval_days > 0),
  ADD COLUMN IF NOT EXISTS follow_up_kind public.appointment_kind;

CREATE OR REPLACE FUNCTION public.sync_student_follow_up_plan(
  _personal_id uuid,
  _aluno_id uuid,
  _interval_days int,
  _kind public.appointment_kind DEFAULT 'retorno'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _interval_days IS NULL OR _interval_days <= 0 THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET
    follow_up_interval_days = _interval_days,
    follow_up_kind = _kind,
    updated_at = now()
  WHERE id = _aluno_id AND personal_id = _personal_id;

  INSERT INTO public.student_follow_ups (
    personal_id, aluno_id, interval_days, kind, is_active
  ) VALUES (
    _personal_id, _aluno_id, _interval_days, _kind, true
  )
  ON CONFLICT (personal_id, aluno_id) DO UPDATE SET
    interval_days = EXCLUDED.interval_days,
    kind = EXCLUDED.kind,
    is_active = true,
    updated_at = now();
END;
$$;

DROP FUNCTION IF EXISTS public.create_student_invitation(text, text);

CREATE OR REPLACE FUNCTION public.create_student_invitation(
  _email text,
  _full_name text DEFAULT NULL,
  _follow_up_interval_days int DEFAULT 30,
  _follow_up_kind public.appointment_kind DEFAULT 'retorno'
)
RETURNS TABLE (
  invitation_id uuid,
  token text,
  invite_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _normalized_email text := lower(trim(_email));
  _token text;
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT public.has_role(auth.uid(), 'personal')
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas profissionais podem convidar alunos';
  END IF;

  IF _normalized_email IS NULL OR _normalized_email = '' THEN
    RAISE EXCEPTION 'E-mail é obrigatório';
  END IF;

  IF _follow_up_interval_days IS NULL OR _follow_up_interval_days <= 0 THEN
    RAISE EXCEPTION 'Selecione a periodicidade do plano';
  END IF;

  IF _follow_up_kind NOT IN ('retorno', 'avaliacao') THEN
    RAISE EXCEPTION 'Tipo de acompanhamento inválido';
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users u WHERE lower(u.email) = _normalized_email
  ) THEN
    RAISE EXCEPTION 'Este e-mail já possui conta. Peça para o aluno fazer login.';
  END IF;

  UPDATE public.student_invitations
  SET status = 'cancelled'
  WHERE personal_id = auth.uid()
    AND lower(email) = _normalized_email
    AND status = 'pending';

  INSERT INTO public.student_invitations (
    personal_id, email, full_name, follow_up_interval_days, follow_up_kind
  )
  VALUES (
    auth.uid(),
    _normalized_email,
    nullif(trim(_full_name), ''),
    _follow_up_interval_days,
    _follow_up_kind
  )
  RETURNING id, student_invitations.token INTO _id, _token;

  invitation_id := _id;
  token := _token;
  invite_url := '/convite/' || _token;
  RETURN NEXT;
END;
$$;

DROP FUNCTION IF EXISTS public.get_invitation_public(text);

CREATE OR REPLACE FUNCTION public.get_invitation_public(_token text)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  personal_name text,
  is_personal_trainer boolean,
  is_nutritionist boolean,
  status text,
  expires_at timestamptz,
  follow_up_interval_days int,
  follow_up_kind public.appointment_kind
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.email,
    i.full_name,
    p.full_name AS personal_name,
    p.is_personal_trainer,
    p.is_nutritionist,
    i.status,
    i.expires_at,
    i.follow_up_interval_days,
    i.follow_up_kind
  FROM public.student_invitations i
  JOIN public.profiles p ON p.id = i.personal_id
  WHERE i.token = _token;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _invite public.student_invitations%ROWTYPE;
  _personal_id uuid;
  _is_pt boolean := false;
  _is_nutri boolean := false;
  _full_name text;
  _registry_type public.professional_registry;
  _registry_number text;
BEGIN
  IF NEW.raw_user_meta_data->>'invitation_token' IS NOT NULL THEN
    SELECT * INTO _invite
    FROM public.student_invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND status = 'pending'
      AND expires_at > now();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Convite inválido ou expirado';
    END IF;

    IF lower(_invite.email) <> lower(NEW.email) THEN
      RAISE EXCEPTION 'O e-mail deve ser o mesmo do convite';
    END IF;

    _personal_id := _invite.personal_id;
    _role := 'aluno';
  ELSE
    _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'aluno');

    IF _role = 'aluno' THEN
      RAISE EXCEPTION 'Alunos só podem entrar por convite do profissional';
    END IF;

    IF _role = 'personal' THEN
      _is_pt := COALESCE((NEW.raw_user_meta_data->>'is_personal_trainer')::boolean, false);
      _is_nutri := COALESCE((NEW.raw_user_meta_data->>'is_nutritionist')::boolean, false);

      IF NOT _is_pt AND NOT _is_nutri THEN
        RAISE EXCEPTION 'Selecione ao menos uma especialidade profissional';
      END IF;

      _registry_type := (NEW.raw_user_meta_data->>'registry_type')::public.professional_registry;
      _registry_number := nullif(trim(NEW.raw_user_meta_data->>'registry_number'), '');

      IF _registry_type IS NULL OR _registry_number IS NULL THEN
        RAISE EXCEPTION 'Informe CREF ou CRN no cadastro profissional';
      END IF;
    END IF;
  END IF;

  _full_name := COALESCE(
    nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    _invite.full_name,
    NEW.email
  );

  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    personal_id,
    is_personal_trainer,
    is_nutritionist,
    registry_type,
    registry_number,
    follow_up_interval_days,
    follow_up_kind
  )
  VALUES (
    NEW.id,
    _full_name,
    NEW.raw_user_meta_data->>'phone',
    _personal_id,
    _is_pt,
    _is_nutri,
    _registry_type,
    _registry_number,
    CASE WHEN _invite.id IS NOT NULL THEN _invite.follow_up_interval_days ELSE NULL END,
    CASE WHEN _invite.id IS NOT NULL THEN _invite.follow_up_kind ELSE NULL END
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _invite.id IS NOT NULL THEN
    UPDATE public.student_invitations
    SET
      status = 'accepted',
      accepted_at = now(),
      accepted_by = NEW.id
    WHERE id = _invite.id;

    PERFORM public.sync_student_follow_up_plan(
      _invite.personal_id,
      NEW.id,
      _invite.follow_up_interval_days,
      _invite.follow_up_kind
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_student_invitation(_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite public.student_invitations%ROWTYPE;
  _email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para concluir o convite';
  END IF;

  SELECT lower(u.email) INTO _email
  FROM auth.users u
  WHERE u.id = auth.uid();

  SELECT * INTO _invite
  FROM public.student_invitations
  WHERE token = _token
    AND status IN ('pending', 'accepted');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido';
  END IF;

  IF lower(_invite.email) <> _email THEN
    RAISE EXCEPTION 'O e-mail da conta deve ser o mesmo do convite';
  END IF;

  UPDATE public.profiles
  SET
    personal_id = _invite.personal_id,
    follow_up_interval_days = _invite.follow_up_interval_days,
    follow_up_kind = _invite.follow_up_kind,
    updated_at = now()
  WHERE id = auth.uid();

  PERFORM public.sync_student_follow_up_plan(
    _invite.personal_id,
    auth.uid(),
    _invite.follow_up_interval_days,
    _invite.follow_up_kind
  );

  UPDATE public.student_invitations
  SET
    status = 'accepted',
    accepted_at = COALESCE(accepted_at, now()),
    accepted_by = auth.uid()
  WHERE id = _invite.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_student_follow_up_plan(
  _aluno_id uuid,
  _interval_days int,
  _kind public.appointment_kind DEFAULT 'retorno'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT public.has_role(auth.uid(), 'personal')
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF _interval_days IS NULL OR _interval_days <= 0 THEN
    RAISE EXCEPTION 'Periodicidade inválida';
  END IF;

  IF _kind NOT IN ('retorno', 'avaliacao') THEN
    RAISE EXCEPTION 'Tipo de acompanhamento inválido';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _aluno_id AND p.personal_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Aluno não vinculado';
  END IF;

  PERFORM public.sync_student_follow_up_plan(
    auth.uid(),
    _aluno_id,
    _interval_days,
    _kind
  );
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
  resolved_recurrence int;
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

  resolved_recurrence := _recurrence_days;

  IF resolved_recurrence IS NULL AND _kind IN ('retorno', 'avaliacao') THEN
    SELECT fu.interval_days INTO resolved_recurrence
    FROM public.student_follow_ups fu
    WHERE fu.personal_id = auth.uid()
      AND fu.aluno_id = _aluno_id
      AND fu.is_active = true;

    IF resolved_recurrence IS NULL THEN
      SELECT p.follow_up_interval_days INTO resolved_recurrence
      FROM public.profiles p
      WHERE p.id = _aluno_id AND p.personal_id = auth.uid();
    END IF;
  END IF;

  IF resolved_recurrence IS NOT NULL AND resolved_recurrence <= 0 THEN
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
    resolved_recurrence
  )
  RETURNING id INTO new_id;

  IF resolved_recurrence IS NOT NULL THEN
    PERFORM public.sync_student_follow_up_plan(
      auth.uid(),
      _aluno_id,
      resolved_recurrence,
      follow_kind
    );
  END IF;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_student_follow_up_plan(uuid, uuid, int, public.appointment_kind) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_student_follow_up_plan(uuid, int, public.appointment_kind) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_invitation(text, text, int, public.appointment_kind) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_public(text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.create_student_invitation(text, text, int, public.appointment_kind) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_student_follow_up_plan(uuid, uuid, int, public.appointment_kind) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_student_follow_up_plan(uuid, int, public.appointment_kind) FROM PUBLIC, anon;
