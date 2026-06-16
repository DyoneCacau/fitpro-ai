-- Biblioteca de exercícios do personal (mídia de execução reutilizável)
CREATE TABLE IF NOT EXISTS public.exercise_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  muscle_group text,
  image_path text,
  video_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (personal_id, name)
);

CREATE INDEX IF NOT EXISTS idx_exercise_catalog_personal
  ON public.exercise_catalog (personal_id);

ALTER TABLE public.exercise_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal gerencia catálogo"
  ON public.exercise_catalog FOR ALL TO authenticated
  USING (personal_id = auth.uid())
  WITH CHECK (personal_id = auth.uid());

CREATE POLICY "Aluno lê catálogo do personal"
  ON public.exercise_catalog FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.personal_id = exercise_catalog.personal_id
    )
  );

CREATE TRIGGER trg_exercise_catalog_upd
  BEFORE UPDATE ON public.exercise_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_catalog TO authenticated;
GRANT ALL ON public.exercise_catalog TO service_role;

-- Bucket para fotos/vídeos de execução
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-media',
  'exercise-media',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Read exercise-media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'exercise-media');

CREATE POLICY "Write own exercise-media"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'exercise-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'exercise-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
