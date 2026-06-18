-- Profissionais e admins podem gerir avaliações dos alunos vinculados

DROP POLICY IF EXISTS "Personal gerencia avaliações" ON public.assessments;

CREATE POLICY "Personal gerencia avaliações"
  ON public.assessments
  FOR ALL
  TO authenticated
  USING (
    personal_id = auth.uid()
    OR (
      public.is_professional_user(auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = assessments.aluno_id
          AND p.personal_id = auth.uid()
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    personal_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
