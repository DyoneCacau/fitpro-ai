-- Corrige JOIN inválido reintroduzido em 20260618100000 e amplia critério de profissional

CREATE OR REPLACE FUNCTION public.is_professional_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'personal')
    OR public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = _user_id
        AND (
          COALESCE(p.is_personal_trainer, false)
          OR COALESCE(p.is_nutritionist, false)
        )
    );
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

  IF NOT public.is_professional_user(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas profissionais podem listar alunos';
  END IF;

  UPDATE public.profiles p
  SET personal_id = i.personal_id, updated_at = now()
  FROM public.student_invitations i
  WHERE i.accepted_by = p.id
    AND i.status = 'accepted'
    AND i.personal_id = auth.uid()
    AND (p.personal_id IS NULL OR p.personal_id <> i.personal_id);

  UPDATE public.profiles p
  SET personal_id = matched.personal_id, updated_at = now()
  FROM (
    SELECT i.personal_id, u.id AS user_id
    FROM public.student_invitations i
    INNER JOIN auth.users u ON lower(i.email) = lower(u.email)
    WHERE i.personal_id = auth.uid()
      AND i.status = 'accepted'
  ) matched
  WHERE p.id = matched.user_id
    AND (p.personal_id IS NULL OR p.personal_id <> matched.personal_id);

  RETURN QUERY
  SELECT DISTINCT ON (p.id) p.id, p.full_name, p.created_at
  FROM public.profiles p
  LEFT JOIN public.student_invitations i
    ON i.accepted_by = p.id
    AND i.personal_id = auth.uid()
    AND i.status = 'accepted'
  WHERE p.personal_id = auth.uid() OR i.id IS NOT NULL
  ORDER BY p.id, p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_profile(_aluno_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  created_at timestamptz,
  personal_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT public.is_professional_user(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas profissionais podem abrir alunos';
  END IF;

  PERFORM public.get_my_students();

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.created_at,
    COALESCE(p.personal_id, auth.uid()) AS personal_id
  FROM public.profiles p
  WHERE p.id = _aluno_id
    AND (
      p.personal_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.student_invitations i
        WHERE i.accepted_by = p.id
          AND i.personal_id = auth.uid()
          AND i.status = 'accepted'
      )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_professional_user(uuid) TO authenticated;
