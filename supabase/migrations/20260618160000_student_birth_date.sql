-- Dados completos no cadastro do aluno (convite)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date date;

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
  _phone text;
  _birth_date date;
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

    _full_name := nullif(trim(NEW.raw_user_meta_data->>'full_name'), '');
    _phone := nullif(trim(NEW.raw_user_meta_data->>'phone'), '');

    IF _full_name IS NULL THEN
      RAISE EXCEPTION 'Informe o nome completo';
    END IF;

    IF _phone IS NULL THEN
      RAISE EXCEPTION 'Informe o telefone';
    END IF;

    BEGIN
      _birth_date := nullif(trim(NEW.raw_user_meta_data->>'birth_date'), '')::date;
    EXCEPTION
      WHEN others THEN
        RAISE EXCEPTION 'Data de nascimento inválida';
    END;

    IF _birth_date IS NULL THEN
      RAISE EXCEPTION 'Informe a data de nascimento';
    END IF;

    IF _birth_date > CURRENT_DATE THEN
      RAISE EXCEPTION 'Data de nascimento não pode ser no futuro';
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

    _full_name := COALESCE(
      nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      NEW.email
    );
    _phone := nullif(trim(NEW.raw_user_meta_data->>'phone'), '');

    BEGIN
      _birth_date := nullif(trim(NEW.raw_user_meta_data->>'birth_date'), '')::date;
    EXCEPTION
      WHEN others THEN
        _birth_date := NULL;
    END;
  END IF;

  IF _full_name IS NULL THEN
    _full_name := COALESCE(_invite.full_name, NEW.email);
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    birth_date,
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
    _phone,
    _birth_date,
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
