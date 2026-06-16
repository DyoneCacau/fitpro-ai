-- Repara vínculo aluno ↔ profissional e expõe listagem confiável

CREATE OR REPLACE FUNCTION public.repair_my_student_link()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT lower(u.email) INTO _email
  FROM auth.users u
  WHERE u.id = auth.uid();

  UPDATE public.profiles p
  SET personal_id = i.personal_id, updated_at = now()
  FROM public.student_invitations i
  WHERE p.id = auth.uid()
    AND p.personal_id IS NULL
    AND i.status IN ('pending', 'accepted')
    AND lower(i.email) = _email;

  UPDATE public.student_invitations i
  SET
    status = 'accepted',
    accepted_at = COALESCE(i.accepted_at, now()),
    accepted_by = auth.uid()
  FROM auth.users u
  WHERE u.id = auth.uid()
    AND lower(i.email) = lower(u.email)
    AND i.status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.personal_id = i.personal_id
    );
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
  SET personal_id = _invite.personal_id, updated_at = now()
  WHERE id = auth.uid();

  UPDATE public.student_invitations
  SET
    status = 'accepted',
    accepted_at = COALESCE(accepted_at, now()),
    accepted_by = auth.uid()
  WHERE id = _invite.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_students()
RETURNS TABLE (
  id uuid,
  full_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT public.has_role(auth.uid(), 'personal') AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas profissionais podem listar alunos';
  END IF;

  UPDATE public.profiles p
  SET personal_id = i.personal_id, updated_at = now()
  FROM public.student_invitations i
  WHERE i.accepted_by = p.id
    AND i.status = 'accepted'
    AND i.personal_id = auth.uid()
    AND (p.personal_id IS NULL OR p.personal_id <> i.personal_id);

  RETURN QUERY
  SELECT p.id, p.full_name, p.created_at
  FROM public.profiles p
  WHERE p.personal_id = auth.uid()
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_my_students()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  PERFORM public.get_my_students();

  SELECT count(*)::integer INTO _count
  FROM public.profiles p
  WHERE p.personal_id = auth.uid();

  RETURN COALESCE(_count, 0);
END;
$$;

-- Corrige vínculos já aceitos sem personal_id
UPDATE public.profiles p
SET personal_id = i.personal_id, updated_at = now()
FROM public.student_invitations i
WHERE i.accepted_by = p.id
  AND i.status = 'accepted'
  AND p.personal_id IS NULL;

GRANT EXECUTE ON FUNCTION public.repair_my_student_link() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_student_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_students() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_my_students() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.repair_my_student_link() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_student_invitation(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_students() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.count_my_students() FROM PUBLIC, anon;
