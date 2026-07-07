-- Conjuntos de substituição por refeição

CREATE TABLE public.diet_meal_substitution_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES public.diet_meals(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Substituição 1',
  position int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_diet_meal_substitution_sets_meal ON public.diet_meal_substitution_sets (meal_id, position);

ALTER TABLE public.diet_meal_items
  ADD COLUMN IF NOT EXISTS substitution_set_id uuid REFERENCES public.diet_meal_substitution_sets(id) ON DELETE CASCADE;

CREATE INDEX idx_diet_meal_items_substitution_set ON public.diet_meal_items (substitution_set_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_meal_substitution_sets TO authenticated;
GRANT ALL ON public.diet_meal_substitution_sets TO service_role;

ALTER TABLE public.diet_meal_substitution_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Substitution sets via meal"
  ON public.diet_meal_substitution_sets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diet_meals m
      JOIN public.diet_plans p ON p.id = m.plan_id
      WHERE m.id = meal_id AND (p.aluno_id = auth.uid() OR p.personal_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diet_meals m
      JOIN public.diet_plans p ON p.id = m.plan_id
      WHERE m.id = meal_id AND p.personal_id = auth.uid()
    )
  );

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
  set_row public.diet_meal_substitution_sets%ROWTYPE;
  new_set_id uuid;
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
    aluno_id, personal_id, name, kcal_target, protein_g, carbs_g, fat_g, notes, is_active, is_template
  ) VALUES (
    CASE WHEN _as_template THEN NULL ELSE _target_aluno_id END,
    auth.uid(),
    COALESCE(nullif(trim(_template_name), ''), src.name),
    src.kcal_target, src.protein_g, src.carbs_g, src.fat_g, src.notes,
    true, _as_template
  )
  RETURNING id INTO new_plan_id;

  CREATE TEMP TABLE IF NOT EXISTS _subst_set_map (old_id uuid, new_id uuid) ON COMMIT DROP;
  DELETE FROM _subst_set_map;

  FOR meal_row IN
    SELECT * FROM public.diet_meals WHERE plan_id = _source_plan_id ORDER BY position, slot
  LOOP
    INSERT INTO public.diet_meals (plan_id, slot, time_label, description, position)
    VALUES (new_plan_id, meal_row.slot, meal_row.time_label, meal_row.description, meal_row.position)
    RETURNING id INTO new_meal_id;

    FOR set_row IN
      SELECT * FROM public.diet_meal_substitution_sets WHERE meal_id = meal_row.id ORDER BY position
    LOOP
      INSERT INTO public.diet_meal_substitution_sets (meal_id, name, position)
      VALUES (new_meal_id, set_row.name, set_row.position)
      RETURNING id INTO new_set_id;
      INSERT INTO _subst_set_map (old_id, new_id) VALUES (set_row.id, new_set_id);
    END LOOP;

    INSERT INTO public.diet_meal_items (
      meal_id, food, quantity, unit, kcal, protein_g, carbs_g, fat_g, notes, position, substitution_set_id
    )
    SELECT
      new_meal_id, i.food, i.quantity, i.unit, i.kcal, i.protein_g, i.carbs_g, i.fat_g, i.notes, i.position,
      m.new_id
    FROM public.diet_meal_items i
    LEFT JOIN _subst_set_map m ON m.old_id = i.substitution_set_id
    WHERE i.meal_id = meal_row.id
    ORDER BY i.position;
  END LOOP;

  INSERT INTO public.diet_supplements (plan_id, name, dosage, timing, notes, position)
  SELECT new_plan_id, name, dosage, timing, notes, position
  FROM public.diet_supplements WHERE plan_id = _source_plan_id ORDER BY position;

  INSERT INTO public.diet_substitutions (plan_id, original_food, substitute_food, notes, position)
  SELECT new_plan_id, original_food, substitute_food, notes, position
  FROM public.diet_substitutions WHERE plan_id = _source_plan_id ORDER BY position;

  RETURN new_plan_id;
END;
$$;
