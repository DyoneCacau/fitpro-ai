-- Corrige recursão infinita: políticas RLS não podem consultar profiles diretamente

CREATE OR REPLACE FUNCTION public.get_profile_personal_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT personal_id FROM public.profiles WHERE id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.student_linked_to_personal(
  _aluno_id uuid,
  _personal_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = _aluno_id
        AND p.personal_id = COALESCE(_personal_id, auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.student_invitations i
      WHERE i.accepted_by = _aluno_id
        AND i.personal_id = COALESCE(_personal_id, auth.uid())
        AND i.status = 'accepted'
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_personal_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_linked_to_personal(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Aluno vê perfil do profissional vinculado" ON public.profiles;

CREATE POLICY "Aluno vê perfil do profissional vinculado"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = public.get_profile_personal_id(auth.uid()));

DROP POLICY IF EXISTS "Personal gerencia avaliações" ON public.assessments;

CREATE POLICY "Personal gerencia avaliações"
  ON public.assessments
  FOR ALL
  TO authenticated
  USING (
    personal_id = auth.uid()
    OR public.student_linked_to_personal(aluno_id)
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    personal_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Personal gerencia anamnese dos alunos" ON public.anamnesis;

CREATE POLICY "Personal gerencia anamnese dos alunos"
  ON public.anamnesis
  FOR ALL
  TO authenticated
  USING (
    personal_id = auth.uid()
    OR public.student_linked_to_personal(aluno_id)
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    personal_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Personal gerencia dietas" ON public.diet_plans;

CREATE POLICY "Personal gerencia dietas"
  ON public.diet_plans
  FOR ALL
  TO authenticated
  USING (
    personal_id = auth.uid()
    OR (
      aluno_id IS NOT NULL
      AND public.student_linked_to_personal(aluno_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    personal_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.sync_diet_from_anamnesis(_aluno_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.anamnesis%ROWTYPE;
  plan_id uuid;
  actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT (
    public.has_role(actor_id, 'admin')
    OR public.student_linked_to_personal(_aluno_id, actor_id)
  ) THEN
    RAISE EXCEPTION 'Aluno não vinculado ao profissional logado';
  END IF;

  SELECT * INTO a
  FROM public.anamnesis
  WHERE aluno_id = _aluno_id
    AND personal_id = actor_id
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Anamnese ativa não encontrada. Salve a anamnese primeiro.';
  END IF;

  SELECT id INTO plan_id
  FROM public.diet_plans
  WHERE aluno_id = _aluno_id
    AND personal_id = actor_id
    AND is_active = true
    AND is_template = false
  LIMIT 1;

  IF plan_id IS NULL THEN
    INSERT INTO public.diet_plans (
      aluno_id, personal_id, name, kcal_target, protein_g, carbs_g, fat_g, is_active, is_template
    ) VALUES (
      _aluno_id,
      actor_id,
      'Plano Alimentar',
      a.kcal_target,
      a.protein_g,
      a.carbs_g,
      a.fat_g,
      true,
      false
    )
    RETURNING id INTO plan_id;
  ELSE
    UPDATE public.diet_plans
    SET
      kcal_target = a.kcal_target,
      protein_g = a.protein_g,
      carbs_g = a.carbs_g,
      fat_g = a.fat_g,
      updated_at = now()
    WHERE id = plan_id;
  END IF;

  RETURN plan_id;
END;
$$;
