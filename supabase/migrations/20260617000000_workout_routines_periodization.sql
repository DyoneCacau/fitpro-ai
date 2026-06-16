-- Periodização de treinos estilo MFIT Personal
-- Ref: rotinas com datas, arquivamento automático, biblioteca e clonagem

CREATE TYPE public.routine_level AS ENUM (
  'adaptacao',
  'iniciante',
  'intermediario',
  'avancado'
);

CREATE TYPE public.routine_status AS ENUM (
  'scheduled',
  'active',
  'archived'
);

CREATE TYPE public.routine_schedule AS ENUM (
  'por_letra',
  'por_dia_semana'
);

CREATE TABLE public.workout_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_template boolean NOT NULL DEFAULT false,
          level public.routine_level NOT NULL DEFAULT 'iniciante',
          objective text,
          difficulty text,
          schedule_type public.routine_schedule NOT NULL DEFAULT 'por_letra',
  starts_at date,
  ends_at date,
  auto_archive_on_end boolean NOT NULL DEFAULT true,
  hide_before_start boolean NOT NULL DEFAULT true,
  notes text,
  status public.routine_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_routines_template_no_aluno CHECK (
    (is_template = true AND aluno_id IS NULL)
    OR (is_template = false AND aluno_id IS NOT NULL)
  )
);

CREATE INDEX idx_workout_routines_aluno ON public.workout_routines(aluno_id);
CREATE INDEX idx_workout_routines_personal ON public.workout_routines(personal_id);
CREATE INDEX idx_workout_routines_status ON public.workout_routines(status);

ALTER TABLE public.workouts
  ADD COLUMN routine_id uuid REFERENCES public.workout_routines(id) ON DELETE CASCADE;

-- Treinos de rotina padrão (biblioteca) podem existir sem aluno
ALTER TABLE public.workouts ALTER COLUMN aluno_id DROP NOT NULL;

ALTER TABLE public.workouts ADD CONSTRAINT workouts_aluno_or_template CHECK (
  aluno_id IS NOT NULL
  OR routine_id IS NOT NULL
);

CREATE INDEX idx_workouts_routine ON public.workouts(routine_id);

CREATE TRIGGER trg_workout_routines_upd
  BEFORE UPDATE ON public.workout_routines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rotina padrão para treinos já existentes
INSERT INTO public.workout_routines (personal_id, aluno_id, name, status, auto_archive_on_end, hide_before_start)
SELECT DISTINCT w.personal_id, w.aluno_id, 'Rotina principal', 'active'::public.routine_status, false, false
FROM public.workouts w
WHERE w.personal_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.workout_routines r
    WHERE r.aluno_id = w.aluno_id AND r.personal_id = w.personal_id AND r.is_template = false
  );

UPDATE public.workouts w
SET routine_id = r.id
FROM public.workout_routines r
WHERE w.routine_id IS NULL
  AND w.personal_id = r.personal_id
  AND w.aluno_id = r.aluno_id
  AND r.is_template = false
  AND r.name = 'Rotina principal';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_routines TO authenticated;
GRANT ALL ON public.workout_routines TO service_role;
ALTER TABLE public.workout_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal gerencia rotinas"
  ON public.workout_routines FOR ALL TO authenticated
  USING (personal_id = auth.uid())
  WITH CHECK (personal_id = auth.uid());

CREATE POLICY "Aluno vê rotinas vinculadas"
  ON public.workout_routines FOR SELECT TO authenticated
  USING (
    aluno_id = auth.uid()
    AND is_template = false
    AND status IN ('active', 'archived')
    AND (
      status = 'archived'
      OR (
        (starts_at IS NULL OR starts_at <= CURRENT_DATE)
        AND (ends_at IS NULL OR ends_at >= CURRENT_DATE)
      )
    )
  );

DROP POLICY IF EXISTS "Aluno vê seus treinos" ON public.workouts;

CREATE POLICY "Aluno vê treinos da rotina visível"
  ON public.workouts FOR SELECT TO authenticated
  USING (
    aluno_id = auth.uid()
    AND is_active = true
    AND (
      routine_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.workout_routines r
        WHERE r.id = routine_id
          AND r.aluno_id = auth.uid()
          AND r.status = 'active'
          AND (r.starts_at IS NULL OR r.starts_at <= CURRENT_DATE)
          AND (r.ends_at IS NULL OR r.ends_at >= CURRENT_DATE)
      )
    )
  );

CREATE OR REPLACE FUNCTION public.refresh_workout_routine_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.workout_routines
  SET status = 'archived', updated_at = now()
  WHERE status = 'active'
    AND auto_archive_on_end = true
    AND ends_at IS NOT NULL
    AND ends_at < CURRENT_DATE
    AND is_template = false;

  UPDATE public.workout_routines
  SET status = 'active', updated_at = now()
  WHERE status = 'scheduled'
    AND starts_at IS NOT NULL
    AND starts_at <= CURRENT_DATE
    AND is_template = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_workout_routine_statuses() TO authenticated;

CREATE OR REPLACE FUNCTION public.clone_workout_routine(
  _source_routine_id uuid,
  _target_aluno_id uuid,
  _name text DEFAULT NULL,
  _starts_at date DEFAULT NULL,
  _ends_at date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src public.workout_routines%ROWTYPE;
  new_routine_id uuid;
  w record;
  new_workout_id uuid;
  ex record;
  new_exercise_id uuid;
  st record;
  v_status public.routine_status;
BEGIN
  SELECT * INTO src FROM public.workout_routines WHERE id = _source_routine_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rotina não encontrada';
  END IF;

  IF src.personal_id <> auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão para clonar esta rotina';
  END IF;

  IF NOT src.is_template AND src.aluno_id IS DISTINCT FROM _target_aluno_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _target_aluno_id AND p.personal_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Aluno não vinculado a este profissional';
    END IF;
  END IF;

  v_status := 'active';
  IF COALESCE(_starts_at, src.starts_at) IS NOT NULL
     AND COALESCE(_starts_at, src.starts_at) > CURRENT_DATE
     AND src.hide_before_start THEN
    v_status := 'scheduled';
  END IF;

  INSERT INTO public.workout_routines (
    personal_id, aluno_id, name, is_template, level, objective, difficulty,
    schedule_type, starts_at, ends_at, auto_archive_on_end, hide_before_start,
    notes, status
  ) VALUES (
    auth.uid(),
    _target_aluno_id,
    COALESCE(NULLIF(trim(_name), ''), src.name || ' (cópia)'),
    false,
    src.level,
    src.objective,
    src.difficulty,
    src.schedule_type,
    COALESCE(_starts_at, src.starts_at),
    COALESCE(_ends_at, src.ends_at),
    src.auto_archive_on_end,
    src.hide_before_start,
    src.notes,
    v_status
  )
  RETURNING id INTO new_routine_id;

  FOR w IN
    SELECT * FROM public.workouts
    WHERE routine_id = _source_routine_id
    ORDER BY letter
  LOOP
    INSERT INTO public.workouts (
      aluno_id, personal_id, routine_id, letter, title, muscles,
      category, estimated_minutes, is_active
    ) VALUES (
      _target_aluno_id, auth.uid(), new_routine_id, w.letter, w.title, w.muscles,
      w.category, w.estimated_minutes, w.is_active
    )
    RETURNING id INTO new_workout_id;

    FOR ex IN
      SELECT * FROM public.exercises WHERE workout_id = w.id ORDER BY position
    LOOP
      INSERT INTO public.exercises (
        workout_id, name, muscle_group, position, rest_seconds, note, image, video_url
      ) VALUES (
        new_workout_id, ex.name, ex.muscle_group, ex.position, ex.rest_seconds,
        ex.note, ex.image, ex.video_url
      )
      RETURNING id INTO new_exercise_id;

      FOR st IN
        SELECT * FROM public.exercise_sets WHERE exercise_id = ex.id ORDER BY position
      LOOP
        INSERT INTO public.exercise_sets (
          exercise_id, position, target_reps, target_load, set_type
        ) VALUES (
          new_exercise_id, st.position, st.target_reps, st.target_load, st.set_type
        );
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN new_routine_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clone_workout_routine(uuid, uuid, text, date, date) TO authenticated;
