-- Carga atual que o aluno está executando em cada série.
-- Persistente e editável a qualquer momento pelo aluno, sem alterar o alvo
-- (target_reps / target_load) definido pelo profissional. Serve para acompanhar
-- a progressão de carga ao longo dos treinos.

CREATE TABLE IF NOT EXISTS public.student_set_loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_set_id uuid NOT NULL REFERENCES public.exercise_sets(id) ON DELETE CASCADE,
  load numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, exercise_set_id)
);

CREATE INDEX IF NOT EXISTS idx_student_set_loads_aluno
  ON public.student_set_loads (aluno_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_set_loads TO authenticated;
GRANT ALL ON public.student_set_loads TO service_role;

ALTER TABLE public.student_set_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno gerencia própria carga"
  ON public.student_set_loads FOR ALL TO authenticated
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());

CREATE POLICY "Personal vê carga do aluno"
  ON public.student_set_loads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.exercise_sets es
      JOIN public.exercises e ON e.id = es.exercise_id
      JOIN public.workouts w ON w.id = e.workout_id
      WHERE es.id = student_set_loads.exercise_set_id
        AND w.personal_id = auth.uid()
    )
  );

CREATE TRIGGER trg_student_set_loads_upd
  BEFORE UPDATE ON public.student_set_loads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
