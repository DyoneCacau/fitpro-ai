
-- ============ ENUMS ============
CREATE TYPE public.workout_category AS ENUM ('forca','hipertrofia','cardio','funcional','mobilidade');
CREATE TYPE public.set_type AS ENUM ('normal','drop','falha','rest_pause');
CREATE TYPE public.session_status AS ENUM ('em_andamento','concluido','encerrado_auto');
CREATE TYPE public.meal_slot AS ENUM ('cafe','lanche_manha','almoco','lanche_tarde','jantar','ceia');
CREATE TYPE public.post_kind AS ENUM ('treino','dieta','evolucao','livre');

-- ============ UPDATE TRIGGER ============
-- public.update_updated_at_column() já existe

-- ============ WORKOUTS ============
CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  letter text NOT NULL DEFAULT 'A',
  title text NOT NULL,
  muscles text,
  category public.workout_category NOT NULL DEFAULT 'hipertrofia',
  estimated_minutes int DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno vê seus treinos" ON public.workouts FOR SELECT TO authenticated USING (aluno_id = auth.uid());
CREATE POLICY "Personal vê treinos dos alunos" ON public.workouts FOR SELECT TO authenticated USING (personal_id = auth.uid());
CREATE POLICY "Personal cria treinos para alunos" ON public.workouts FOR INSERT TO authenticated WITH CHECK (personal_id = auth.uid());
CREATE POLICY "Personal atualiza treinos" ON public.workouts FOR UPDATE TO authenticated USING (personal_id = auth.uid());
CREATE POLICY "Personal apaga treinos" ON public.workouts FOR DELETE TO authenticated USING (personal_id = auth.uid());
CREATE TRIGGER trg_workouts_upd BEFORE UPDATE ON public.workouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  name text NOT NULL,
  muscle_group text,
  position int NOT NULL DEFAULT 0,
  rest_seconds int DEFAULT 60,
  note text,
  image text,
  video_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso via workout" ON public.exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND (w.aluno_id = auth.uid() OR w.personal_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.personal_id = auth.uid()));

CREATE TABLE public.exercise_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  target_reps text NOT NULL DEFAULT '10',
  target_load numeric,
  set_type public.set_type NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_sets TO authenticated;
GRANT ALL ON public.exercise_sets TO service_role;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sets via exercise" ON public.exercise_sets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exercises e JOIN public.workouts w ON w.id = e.workout_id WHERE e.id = exercise_id AND (w.aluno_id = auth.uid() OR w.personal_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.exercises e JOIN public.workouts w ON w.id = e.workout_id WHERE e.id = exercise_id AND w.personal_id = auth.uid()));

CREATE TABLE public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status public.session_status NOT NULL DEFAULT 'em_andamento',
  total_volume numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno gerencia sessões" ON public.workout_sessions FOR ALL TO authenticated
  USING (aluno_id = auth.uid()) WITH CHECK (aluno_id = auth.uid());
CREATE POLICY "Personal vê sessões" ON public.workout_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.personal_id = auth.uid()));
CREATE TRIGGER trg_ws_upd BEFORE UPDATE ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.set_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_set_id uuid NOT NULL REFERENCES public.exercise_sets(id) ON DELETE CASCADE,
  load numeric NOT NULL DEFAULT 0,
  reps int NOT NULL DEFAULT 0,
  note text,
  done_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.set_logs TO authenticated;
GRANT ALL ON public.set_logs TO service_role;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logs via session" ON public.set_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_sessions s WHERE s.id = session_id AND s.aluno_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions s WHERE s.id = session_id AND s.aluno_id = auth.uid()));
CREATE POLICY "Personal vê logs" ON public.set_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_sessions s JOIN public.workouts w ON w.id = s.workout_id WHERE s.id = session_id AND w.personal_id = auth.uid()));

-- ============ DIETA ============
CREATE TABLE public.diet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT 'Plano Alimentar',
  kcal_target int DEFAULT 2000,
  protein_g int DEFAULT 150,
  carbs_g int DEFAULT 220,
  fat_g int DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_plans TO authenticated;
GRANT ALL ON public.diet_plans TO service_role;
ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno vê dieta" ON public.diet_plans FOR SELECT TO authenticated USING (aluno_id = auth.uid());
CREATE POLICY "Personal gerencia dietas" ON public.diet_plans FOR ALL TO authenticated USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());
CREATE TRIGGER trg_dp_upd BEFORE UPDATE ON public.diet_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.diet_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.diet_plans(id) ON DELETE CASCADE,
  slot public.meal_slot NOT NULL,
  time_label text,
  description text,
  position int DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_meals TO authenticated;
GRANT ALL ON public.diet_meals TO service_role;
ALTER TABLE public.diet_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meals via plan" ON public.diet_meals FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.diet_plans p WHERE p.id = plan_id AND (p.aluno_id = auth.uid() OR p.personal_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.diet_plans p WHERE p.id = plan_id AND p.personal_id = auth.uid()));

CREATE TABLE public.diet_meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES public.diet_meals(id) ON DELETE CASCADE,
  food text NOT NULL,
  quantity numeric NOT NULL DEFAULT 100,
  unit text NOT NULL DEFAULT 'g',
  kcal numeric DEFAULT 0,
  protein_g numeric DEFAULT 0,
  carbs_g numeric DEFAULT 0,
  fat_g numeric DEFAULT 0,
  position int DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_meal_items TO authenticated;
GRANT ALL ON public.diet_meal_items TO service_role;
ALTER TABLE public.diet_meal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items via meal" ON public.diet_meal_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.diet_meals m JOIN public.diet_plans p ON p.id = m.plan_id WHERE m.id = meal_id AND (p.aluno_id = auth.uid() OR p.personal_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.diet_meals m JOIN public.diet_plans p ON p.id = m.plan_id WHERE m.id = meal_id AND p.personal_id = auth.uid()));

CREATE TABLE public.food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  slot public.meal_slot NOT NULL,
  food text NOT NULL,
  quantity numeric NOT NULL DEFAULT 100,
  unit text NOT NULL DEFAULT 'g',
  kcal numeric DEFAULT 0,
  protein_g numeric DEFAULT 0,
  carbs_g numeric DEFAULT 0,
  fat_g numeric DEFAULT 0,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_logs TO authenticated;
GRANT ALL ON public.food_logs TO service_role;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno gerencia food log" ON public.food_logs FOR ALL TO authenticated USING (aluno_id = auth.uid()) WITH CHECK (aluno_id = auth.uid());
CREATE POLICY "Personal vê food log" ON public.food_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = aluno_id AND p.personal_id = auth.uid()));

-- ============ ANTROPOMETRIA ============
CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assessed_at date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  weight_kg numeric,
  height_cm numeric,
  body_fat_pct numeric,
  lean_mass_kg numeric,
  measurements jsonb DEFAULT '{}'::jsonb,
  photos jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno vê suas avaliações" ON public.assessments FOR SELECT TO authenticated USING (aluno_id = auth.uid());
CREATE POLICY "Personal gerencia avaliações" ON public.assessments FOR ALL TO authenticated USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());
CREATE POLICY "Aluno cria autoavaliação" ON public.assessments FOR INSERT TO authenticated WITH CHECK (aluno_id = auth.uid());

-- ============ FEED SOCIAL ============
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text,
  photo_url text,
  kind public.post_kind NOT NULL DEFAULT 'livre',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
-- Helper para escopo do feed
CREATE OR REPLACE FUNCTION public.can_see_feed(_personal_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _personal_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.personal_id = _personal_id);
$$;
CREATE POLICY "Feed do profissional" ON public.posts FOR SELECT TO authenticated USING (public.can_see_feed(personal_id));
CREATE POLICY "Aluno posta" ON public.posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND public.can_see_feed(personal_id));
CREATE POLICY "Autor edita" ON public.posts FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Autor apaga" ON public.posts FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE TABLE public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes do feed" ON public.post_likes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.can_see_feed(p.personal_id)));
CREATE POLICY "Curtir" ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.can_see_feed(p.personal_id)));
CREATE POLICY "Descurtir" ON public.post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver comentários" ON public.post_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.can_see_feed(p.personal_id)));
CREATE POLICY "Comentar" ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.can_see_feed(p.personal_id)));
CREATE POLICY "Apagar próprio comentário" ON public.post_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Próprias notificações" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ AUTO-ENCERRAR TREINOS ============
CREATE OR REPLACE FUNCTION public.auto_close_stale_sessions()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec RECORD;
  closed int := 0;
  vol numeric;
  personal uuid;
BEGIN
  FOR rec IN
    SELECT s.id, s.aluno_id, s.workout_id, w.title, w.personal_id
    FROM public.workout_sessions s
    JOIN public.workouts w ON w.id = s.workout_id
    WHERE s.status = 'em_andamento'
      AND (s.started_at AT TIME ZONE 'America/Sao_Paulo')::date <
          (now() AT TIME ZONE 'America/Sao_Paulo')::date
  LOOP
    SELECT COALESCE(SUM(load * reps), 0) INTO vol FROM public.set_logs WHERE session_id = rec.id;
    UPDATE public.workout_sessions
      SET status = 'encerrado_auto', finished_at = now(), total_volume = vol
      WHERE id = rec.id;

    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (rec.aluno_id, 'workout_auto_close',
            'Treino encerrado automaticamente',
            'Seu treino "' || rec.title || '" foi finalizado sozinho ao virar o dia.',
            '/treinos');

    IF rec.personal_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link)
      VALUES (rec.personal_id, 'workout_auto_close',
              'Aluno não finalizou o treino',
              'A sessão de treino do aluno foi encerrada automaticamente.',
              '/feed');
    END IF;

    closed := closed + 1;
  END LOOP;
  RETURN closed;
END;
$$;

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
