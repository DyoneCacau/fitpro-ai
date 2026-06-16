-- Suplementos alimentares vinculados ao plano dietético

CREATE TABLE public.diet_supplements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.diet_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text NOT NULL DEFAULT '',
  timing text,
  notes text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_diet_supplements_plan ON public.diet_supplements (plan_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_supplements TO authenticated;
GRANT ALL ON public.diet_supplements TO service_role;

ALTER TABLE public.diet_supplements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplements via plan"
  ON public.diet_supplements FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diet_plans p
      WHERE p.id = plan_id AND (p.aluno_id = auth.uid() OR p.personal_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diet_plans p
      WHERE p.id = plan_id AND p.personal_id = auth.uid()
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

  INSERT INTO public.diet_supplements (plan_id, name, dosage, timing, notes, position)
  SELECT new_plan_id, name, dosage, timing, notes, position
  FROM public.diet_supplements
  WHERE plan_id = _source_plan_id
  ORDER BY position;

  RETURN new_plan_id;
END;
$$;
