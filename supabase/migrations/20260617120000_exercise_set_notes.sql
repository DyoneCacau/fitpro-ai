-- Observação opcional por série (exercícios já possuem coluna note)
ALTER TABLE public.exercise_sets
  ADD COLUMN IF NOT EXISTS note text;

-- Clonar rotina incluindo observações das séries
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
  w public.workouts%ROWTYPE;
  new_workout_id uuid;
  ex public.exercises%ROWTYPE;
  new_exercise_id uuid;
  st public.exercise_sets%ROWTYPE;
  v_status public.routine_status;
BEGIN
  SELECT * INTO src FROM public.workout_routines WHERE id = _source_routine_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rotina não encontrada';
  END IF;

  IF src.personal_id <> auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão para clonar esta rotina';
  END IF;

  v_status := 'active';
  IF COALESCE(_starts_at, src.starts_at) IS NOT NULL
     AND COALESCE(_starts_at, src.starts_at) > CURRENT_DATE
     AND src.hide_before_start THEN
    v_status := 'scheduled';
  END IF;

  INSERT INTO public.workout_routines (
    personal_id, aluno_id, name, is_template, level, objective, difficulty,
    schedule_type, routine_kind, target_sex, starts_at, ends_at,
    auto_archive_on_end, hide_before_start, notes, status
  ) VALUES (
    auth.uid(),
    _target_aluno_id,
    COALESCE(NULLIF(trim(_name), ''), src.name || ' (cópia)'),
    false,
    src.level,
    src.objective,
    src.difficulty,
    src.schedule_type,
    src.routine_kind,
    src.target_sex,
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
          exercise_id, position, target_reps, target_load, set_type, note
        ) VALUES (
          new_exercise_id, st.position, st.target_reps, st.target_load, st.set_type, st.note
        );
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN new_routine_id;
END;
$$;
