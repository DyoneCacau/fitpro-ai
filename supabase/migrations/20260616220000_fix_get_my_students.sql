-- Corrige erro SQL em get_my_students (JOIN inválido com alias da tabela alvo)

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
    AND p.personal_id IS NULL;

  RETURN QUERY
  SELECT p.id, p.full_name, p.created_at
  FROM public.profiles p
  WHERE p.personal_id = auth.uid()
  ORDER BY p.created_at DESC;
END;
$$;
