-- Registro diário de refeições realizadas pelo aluno
CREATE TABLE public.diet_meal_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL REFERENCES public.diet_meals(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, meal_id, log_date)
);

CREATE INDEX idx_diet_meal_completions_day
  ON public.diet_meal_completions (aluno_id, log_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_meal_completions TO authenticated;
GRANT ALL ON public.diet_meal_completions TO service_role;

ALTER TABLE public.diet_meal_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno gerencia conclusões de refeição"
  ON public.diet_meal_completions
  FOR ALL
  TO authenticated
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());

CREATE POLICY "Personal vê conclusões de refeição"
  ON public.diet_meal_completions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = diet_meal_completions.aluno_id
        AND p.personal_id = auth.uid()
    )
  );
