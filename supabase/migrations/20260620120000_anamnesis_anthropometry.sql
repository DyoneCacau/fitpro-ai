-- Antropometria na anamnese (baseline do exame físico comparativo)

ALTER TABLE public.anamnesis
  ADD COLUMN IF NOT EXISTS body_fat_pct NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS lean_mass_kg NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS measurements JSONB;
