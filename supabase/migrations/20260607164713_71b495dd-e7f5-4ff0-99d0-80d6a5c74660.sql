
-- Leitura ampla (autenticados)
CREATE POLICY "Read avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "Read post-media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'post-media');
CREATE POLICY "Read food-photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'food-photos');

-- Avaliações: aluno (própria pasta) e profissional do aluno
CREATE POLICY "Read assessment own or personal" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'assessment-photos' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND p.personal_id = auth.uid()
      )
    )
  );

-- Upload/Update/Delete: usuário só na própria pasta (primeira pasta = user id)
CREATE POLICY "Write own folder avatars" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Write own folder post-media" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Write own folder food-photos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Write own folder assessment" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'assessment-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'assessment-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
