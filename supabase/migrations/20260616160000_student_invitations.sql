-- Especialidades do profissional + convites de alunos + RLS de vínculo

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_personal_trainer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_nutritionist BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE public.student_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX student_invitations_pending_email_idx
  ON public.student_invitations (personal_id, lower(email))
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.student_invitations TO authenticated;
GRANT ALL ON public.student_invitations TO service_role;
ALTER TABLE public.student_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal vê seus convites"
  ON public.student_invitations FOR SELECT TO authenticated
  USING (personal_id = auth.uid());

CREATE POLICY "Personal cancela convites pendentes"
  ON public.student_invitations FOR UPDATE TO authenticated
  USING (personal_id = auth.uid() AND status = 'pending')
  WITH CHECK (personal_id = auth.uid());

CREATE POLICY "Admin vê todos os convites"
  ON public.student_invitations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Aluno pode ver o perfil do profissional vinculado
CREATE POLICY "Aluno vê perfil do profissional vinculado"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = (
      SELECT p.personal_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Profissional atualiza especialidades no próprio perfil
CREATE POLICY "Personal atualiza especialidades"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id AND public.has_role(auth.uid(), 'personal'))
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.create_student_invitation(
  _email TEXT,
  _full_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  invitation_id UUID,
  token TEXT,
  invite_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _normalized_email TEXT := lower(trim(_email));
  _token TEXT;
  _id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT public.has_role(auth.uid(), 'personal') THEN
    RAISE EXCEPTION 'Apenas profissionais podem convidar alunos';
  END IF;

  IF _normalized_email IS NULL OR _normalized_email = '' THEN
    RAISE EXCEPTION 'E-mail é obrigatório';
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

  INSERT INTO public.student_invitations (personal_id, email, full_name)
  VALUES (auth.uid(), _normalized_email, nullif(trim(_full_name), ''))
  RETURNING id, student_invitations.token INTO _id, _token;

  invitation_id := _id;
  token := _token;
  invite_url := '/convite/' || _token;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invitation_public(_token TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  personal_name TEXT,
  is_personal_trainer BOOLEAN,
  is_nutritionist BOOLEAN,
  status TEXT,
  expires_at TIMESTAMPTZ
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
    i.expires_at
  FROM public.student_invitations i
  JOIN public.profiles p ON p.id = i.personal_id
  WHERE i.token = _token;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _invite public.student_invitations%ROWTYPE;
  _personal_id UUID;
  _is_pt BOOLEAN := false;
  _is_nutri BOOLEAN := false;
  _full_name TEXT;
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
    is_nutritionist
  )
  VALUES (
    NEW.id,
    _full_name,
    NEW.raw_user_meta_data->>'phone',
    _personal_id,
    _is_pt,
    _is_nutri
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _invite.id IS NOT NULL THEN
    UPDATE public.student_invitations
    SET
      status = 'accepted',
      accepted_at = now(),
      accepted_by = NEW.id
    WHERE id = _invite.id;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_student_invitation(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_public(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_primary_role(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_student_invitation(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_invitation_public(TEXT) FROM PUBLIC;
