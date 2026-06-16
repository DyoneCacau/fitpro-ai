-- Vincula alunos aceitos mesmo sem accepted_by preenchido

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
  SET personal_id = i.personal_id, updated_at = now()
  FROM public.student_invitations i
  JOIN auth.users u ON u.id = p.id
  WHERE i.personal_id = auth.uid()
    AND i.status = 'accepted'
    AND lower(i.email) = lower(u.email)
    AND p.personal_id IS NULL;

  RETURN QUERY
  SELECT p.id, p.full_name, p.created_at
  FROM public.profiles p
  WHERE p.personal_id = auth.uid()
  ORDER BY p.created_at DESC;
END;
$$;
