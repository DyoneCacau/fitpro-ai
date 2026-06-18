-- Carrega ficha do aluno + reforça reparo de vínculos convite ↔ aluno

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

  -- Convite aceito com accepted_by
  UPDATE public.profiles p
  SET personal_id = i.personal_id, updated_at = now()
  FROM public.student_invitations i
  WHERE i.accepted_by = p.id
    AND i.status = 'accepted'
    AND i.personal_id = auth.uid()
    AND (p.personal_id IS NULL OR p.personal_id <> i.personal_id);

  -- Convite aceito pelo e-mail (accepted_by pode estar vazio)
  UPDATE public.profiles p
  SET personal_id = i.personal_id, updated_at = now()
  FROM public.student_invitations i
  INNER JOIN auth.users u ON u.id = p.id AND lower(u.email) = lower(i.email)
  WHERE i.personal_id = auth.uid()
    AND i.status = 'accepted'
    AND (p.personal_id IS NULL OR p.personal_id <> i.personal_id);

  RETURN QUERY
  SELECT p.id, p.full_name, p.created_at
  FROM public.profiles p
  WHERE p.personal_id = auth.uid()
  ORDER BY p.created_at DESC;
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

  IF NOT public.has_role(auth.uid(), 'personal') AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas profissionais podem abrir alunos';
  END IF;

  PERFORM public.get_my_students();

  RETURN QUERY
  SELECT p.id, p.full_name, p.created_at, p.personal_id
  FROM public.profiles p
  WHERE p.id = _aluno_id
    AND (
      p.personal_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_profile(uuid) TO authenticated;
