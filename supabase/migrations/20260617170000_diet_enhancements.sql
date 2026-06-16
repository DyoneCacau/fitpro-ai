-- Dieta: modelos, sync anamnese, diário a partir do plano

ALTER TABLE public.diet_plans
  ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.diet_plans
  ALTER COLUMN aluno_id DROP NOT NULL;

ALTER TABLE public.diet_plans DROP CONSTRAINT IF EXISTS diet_plans_template_or_student;
ALTER TABLE public.diet_plans
  ADD CONSTRAINT diet_plans_template_or_student CHECK (
    (is_template = true AND aluno_id IS NULL) OR
    (is_template = false AND aluno_id IS NOT NULL)
  );

ALTER TABLE public.diet_meal_items
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS source_meal_item_id uuid
    REFERENCES public.diet_meal_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_food_logs_source_item
  ON public.food_logs (aluno_id, log_date, source_meal_item_id);

CREATE OR REPLACE FUNCTION public.sync_diet_from_anamnesis(_aluno_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.anamnesis%ROWTYPE;
  plan_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _aluno_id AND p.personal_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Aluno não vinculado';
  END IF;

  SELECT * INTO a
  FROM public.anamnesis
  WHERE aluno_id = _aluno_id
    AND personal_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Anamnese ativa não encontrada. Calcule e salve a anamnese primeiro.';
  END IF;

  SELECT id INTO plan_id
  FROM public.diet_plans
  WHERE aluno_id = _aluno_id
    AND personal_id = auth.uid()
    AND is_active = true
    AND is_template = false
  LIMIT 1;

  IF plan_id IS NULL THEN
    INSERT INTO public.diet_plans (
      aluno_id, personal_id, name, kcal_target, protein_g, carbs_g, fat_g, is_active, is_template
    ) VALUES (
      _aluno_id,
      auth.uid(),
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

CREATE OR REPLACE FUNCTION public.clone_diet_plan(
  _source_plan_id uuid,
  _target_aluno_id uuid DEFAULT NULL,
  _as_template boolean DEFAULT false,
  _template_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src public.diet_plans%ROWTYPE;
  new_plan_id uuid;
  meal_row public.diet_meals%ROWTYPE;
  new_meal_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO src
  FROM public.diet_plans
  WHERE id = _source_plan_id AND personal_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano não encontrado';
  END IF;

  IF _as_template THEN
    IF _target_aluno_id IS NOT NULL THEN
      RAISE EXCEPTION 'Modelo não pode ter aluno vinculado';
    END IF;
  ELSE
    IF _target_aluno_id IS NULL THEN
      RAISE EXCEPTION 'Informe o aluno de destino';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _target_aluno_id AND p.personal_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Aluno não vinculado';
    END IF;
    UPDATE public.diet_plans
    SET is_active = false, updated_at = now()
    WHERE aluno_id = _target_aluno_id
      AND personal_id = auth.uid()
      AND is_active = true
      AND is_template = false;
  END IF;

  INSERT INTO public.diet_plans (
    aluno_id,
    personal_id,
    name,
    kcal_target,
    protein_g,
    carbs_g,
    fat_g,
    notes,
    is_active,
    is_template
  ) VALUES (
    CASE WHEN _as_template THEN NULL ELSE _target_aluno_id END,
    auth.uid(),
    COALESCE(nullif(trim(_template_name), ''), src.name),
    src.kcal_target,
    src.protein_g,
    src.carbs_g,
    src.fat_g,
    src.notes,
    true,
    _as_template
  )
  RETURNING id INTO new_plan_id;

  FOR meal_row IN
    SELECT * FROM public.diet_meals WHERE plan_id = _source_plan_id ORDER BY position, slot
  LOOP
    INSERT INTO public.diet_meals (plan_id, slot, time_label, description, position)
    VALUES (new_plan_id, meal_row.slot, meal_row.time_label, meal_row.description, meal_row.position)
    RETURNING id INTO new_meal_id;

    INSERT INTO public.diet_meal_items (
      meal_id, food, quantity, unit, kcal, protein_g, carbs_g, fat_g, notes, position
    )
    SELECT
      new_meal_id, food, quantity, unit, kcal, protein_g, carbs_g, fat_g, notes, position
    FROM public.diet_meal_items
    WHERE meal_id = meal_row.id
    ORDER BY position;
  END LOOP;

  RETURN new_plan_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_diet_from_anamnesis(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clone_diet_plan(uuid, uuid, boolean, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_diet_from_anamnesis(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.clone_diet_plan(uuid, uuid, boolean, text) FROM PUBLIC, anon;
