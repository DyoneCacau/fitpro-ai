-- Registro profissional (CREF/CRN) + anamnese com metas calculadas

CREATE TYPE public.professional_registry AS ENUM ('cref', 'crn');
CREATE TYPE public.fitness_goal AS ENUM (
  'perda_peso',
  'ganho_massa',
  'definicao',
  'manutencao',
  'performance'
);
CREATE TYPE public.activity_level AS ENUM (
  'sedentario',
  'leve',
  'moderado',
  'intenso',
  'atleta'
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registry_type public.professional_registry,
  ADD COLUMN IF NOT EXISTS registry_number TEXT;

CREATE TABLE public.anamnesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  sex TEXT NOT NULL CHECK (sex IN ('M', 'F')),
  age INT NOT NULL CHECK (age > 0 AND age < 120),
  weight_kg NUMERIC(6, 2) NOT NULL CHECK (weight_kg > 0),
  height_cm NUMERIC(6, 2) NOT NULL CHECK (height_cm > 0),
  activity_level public.activity_level NOT NULL,
  goal public.fitness_goal NOT NULL,
  bmr NUMERIC(8, 2) NOT NULL,
  tdee NUMERIC(8, 2) NOT NULL,
  kcal_target INT NOT NULL,
  protein_g INT NOT NULL,
  carbs_g INT NOT NULL,
  fat_g INT NOT NULL,
  restrictions TEXT,
  clinical_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX anamnesis_active_student_idx
  ON public.anamnesis (aluno_id, personal_id)
  WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anamnesis TO authenticated;
GRANT ALL ON public.anamnesis TO service_role;
ALTER TABLE public.anamnesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno vê própria anamnese"
  ON public.anamnesis FOR SELECT TO authenticated
  USING (aluno_id = auth.uid());

CREATE POLICY "Personal gerencia anamnese dos alunos"
  ON public.anamnesis FOR ALL TO authenticated
  USING (personal_id = auth.uid())
  WITH CHECK (personal_id = auth.uid());

CREATE POLICY "Admin vê anamnese"
  ON public.anamnesis FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_anamnesis_updated_at
  BEFORE UPDATE ON public.anamnesis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _invite public.student_invitations%ROWTYPE;
  _personal_id UUID;
  _is_pt BOOLEAN := false;
  _is_nutri BOOLEAN := false;
  _full_name TEXT;
  _registry_type public.professional_registry;
  _registry_number TEXT;
BEGIN
  IF NEW.raw_user_meta_data->>'invitation_token' IS NOT NULL THEN
    SELECT * INTO _invite
    FROM public.student_invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND status = 'pending'
      AND expires_at > now();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Convite inválido ou expirado';
    END IF;

    IF lower(_invite.email) <> lower(NEW.email) THEN
      RAISE EXCEPTION 'O e-mail deve ser o mesmo do convite';
    END IF;

    _personal_id := _invite.personal_id;
    _role := 'aluno';
  ELSE
    _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'aluno');

    IF _role = 'aluno' THEN
      RAISE EXCEPTION 'Alunos só podem entrar por convite do profissional';
    END IF;

    IF _role = 'personal' THEN
      _is_pt := COALESCE((NEW.raw_user_meta_data->>'is_personal_trainer')::boolean, false);
      _is_nutri := COALESCE((NEW.raw_user_meta_data->>'is_nutritionist')::boolean, false);

      IF NOT _is_pt AND NOT _is_nutri THEN
        RAISE EXCEPTION 'Selecione ao menos uma especialidade profissional';
      END IF;

      _registry_type := (NEW.raw_user_meta_data->>'registry_type')::public.professional_registry;
      _registry_number := nullif(trim(NEW.raw_user_meta_data->>'registry_number'), '');

      IF _registry_type IS NULL OR _registry_number IS NULL THEN
        RAISE EXCEPTION 'Informe CREF ou CRN no cadastro profissional';
      END IF;
    END IF;
  END IF;

  _full_name := COALESCE(
    nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    _invite.full_name,
    NEW.email
  );

  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    personal_id,
    is_personal_trainer,
    is_nutritionist,
    registry_type,
    registry_number
  )
  VALUES (
    NEW.id,
    _full_name,
    NEW.raw_user_meta_data->>'phone',
    _personal_id,
    _is_pt,
    _is_nutri,
    _registry_type,
    _registry_number
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _invite.id IS NOT NULL THEN
    UPDATE public.student_invitations
    SET
      status = 'accepted',
      accepted_at = now(),
      accepted_by = NEW.id
    WHERE id = _invite.id;
  END IF;

  RETURN NEW;
END;
$$;
