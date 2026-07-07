import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { syncDietFromAnamnesis } from "@/lib/diet";
import {
  DEFAULT_ANAMNESIS_FORM,
  parseOptionalBodyFat,
  parseOptionalInt,
  parseOptionalNumber,
  type AnamnesisFormState,
  type SmokingStatus,
  type StressLevel,
  type TrainingExperience,
} from "@/lib/anamnesis-form";
import {
  buildAssessmentMetrics,
  initFormMaps,
  measurementsFromForm,
  parseMeasurements,
} from "@/lib/anthropometry";
import { createNotification } from "@/lib/notifications";
import type { ActivityLevel, FitnessGoal, NutritionResult, Sex } from "@/lib/nutrition-calculator";

export type AnamnesisRow = {
  id: string;
  aluno_id: string;
  personal_id: string;
  assessed_at: string;
  sex: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  activity_level: string;
  goal: string;
  bmr: number;
  tdee: number;
  kcal_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  restrictions: string | null;
  clinical_notes: string | null;
  occupation: string | null;
  sleep_hours: number | null;
  stress_level: string | null;
  medical_history: string | null;
  medications: string | null;
  injuries: string | null;
  surgeries: string | null;
  family_history: string | null;
  smoking: string | null;
  alcohol_use: string | null;
  training_experience: string | null;
  training_days_per_week: number | null;
  training_location: string | null;
  training_history: string | null;
  pain_or_limitations: string | null;
  meals_per_day: number | null;
  supplements_used: string | null;
  food_preferences: string | null;
  digestion_notes: string | null;
  main_motivation: string | null;
  expectations: string | null;
  weekly_availability: string | null;
  par_q_cleared: boolean | null;
  par_q_notes: string | null;
  body_fat_pct: number | null;
  lean_mass_kg: number | null;
  measurements: unknown;
  is_active: boolean;
};

export type AnamnesisContext = {
  sex: string;
  age: number;
  height_cm: number;
  weight_kg: number;
};

export type SaveAnamnesisInput = {
  alunoId: string;
  form: AnamnesisFormState;
  age: number;
  weightKg: number;
  heightCm: number;
  nutrition: NutritionResult;
};

function formatSupabaseError(error: PostgrestError | Error): string {
  if ("message" in error) {
    const parts = [error.message];
    if ("details" in error && error.details) parts.push(error.details);
    if ("hint" in error && error.hint) parts.push(error.hint);
    return parts.join(" — ");
  }
  return String(error);
}

function trimOrNull(value: string | undefined | null): string | null {
  const t = value?.trim();
  return t ? t : null;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error(formatSupabaseError(error ?? new Error("Não autenticado")));
  return data.user.id;
}

export function anamnesisRowToForm(row: AnamnesisRow): AnamnesisFormState {
  const maps = initFormMaps();
  const parsed = parseMeasurements(row.measurements);
  for (const field of Object.keys(maps.circumferences) as (keyof typeof maps.circumferences)[]) {
    const value = parsed.circumferences?.[field];
    if (value != null) maps.circumferences[field] = String(value);
  }
  for (const field of Object.keys(maps.skinfolds) as (keyof typeof maps.skinfolds)[]) {
    const value = parsed.skinfolds?.[field];
    if (value != null) maps.skinfolds[field] = String(value);
  }

  return {
    sex: row.sex as Sex,
    age: String(row.age),
    weightKg: String(row.weight_kg),
    heightCm: String(row.height_cm),
    bodyFatPct: row.body_fat_pct != null ? String(row.body_fat_pct) : "",
    circumferences: maps.circumferences,
    skinfolds: maps.skinfolds,
    activity: row.activity_level as ActivityLevel,
    goal: row.goal as FitnessGoal,
    occupation: row.occupation ?? "",
    sleepHours: row.sleep_hours != null ? String(row.sleep_hours) : "",
    stressLevel: (row.stress_level as StressLevel) ?? "moderado",
    weeklyAvailability: row.weekly_availability ?? "",
    medicalHistory: row.medical_history ?? "",
    medications: row.medications ?? "",
    injuries: row.injuries ?? "",
    surgeries: row.surgeries ?? "",
    familyHistory: row.family_history ?? "",
    smoking: (row.smoking as SmokingStatus) ?? "nao",
    alcoholUse: row.alcohol_use ?? "",
    painOrLimitations: row.pain_or_limitations ?? "",
    parQCleared: row.par_q_cleared ?? true,
    parQNotes: row.par_q_notes ?? "",
    trainingExperience: (row.training_experience as TrainingExperience) ?? "iniciante",
    trainingDaysPerWeek: row.training_days_per_week != null ? String(row.training_days_per_week) : "",
    trainingLocation: row.training_location ?? "",
    trainingHistory: row.training_history ?? "",
    mealsPerDay: row.meals_per_day != null ? String(row.meals_per_day) : "",
    restrictions: row.restrictions ?? "",
    supplementsUsed: row.supplements_used ?? "",
    foodPreferences: row.food_preferences ?? "",
    digestionNotes: row.digestion_notes ?? "",
    mainMotivation: row.main_motivation ?? "",
    expectations: row.expectations ?? "",
    clinicalNotes: row.clinical_notes ?? "",
  };
}

function buildAnthropometryPayload(form: AnamnesisFormState, input: SaveAnamnesisInput) {
  const measurements = measurementsFromForm(form.circumferences, form.skinfolds);
  const metrics = buildAssessmentMetrics(
    {
      id: "preview",
      assessed_at: new Date().toISOString().slice(0, 10),
      weight_kg: input.weightKg,
      height_cm: input.heightCm,
      body_fat_pct: parseOptionalBodyFat(form.bodyFatPct),
      lean_mass_kg: null,
      measurements,
      photos: null,
      notes: null,
    },
    { sex: form.sex, age: input.age },
  );

  const hasMeasurements =
    (measurements.circumferences && Object.keys(measurements.circumferences).length > 0) ||
    (measurements.skinfolds && Object.keys(measurements.skinfolds).length > 0);

  return {
    body_fat_pct: metrics.bodyFatPct,
    lean_mass_kg: metrics.leanMassKg,
    measurements: hasMeasurements ? measurements : null,
  };
}

function buildPayload(input: SaveAnamnesisInput, personalId: string) {
  const { form, nutrition } = input;
  const anthropometry = buildAnthropometryPayload(form, input);
  return {
    aluno_id: input.alunoId,
    personal_id: personalId,
    sex: form.sex,
    age: input.age,
    weight_kg: input.weightKg,
    height_cm: input.heightCm,
    activity_level: form.activity,
    goal: form.goal,
    bmr: nutrition.bmr,
    tdee: nutrition.tdee,
    kcal_target: nutrition.kcalTarget,
    protein_g: nutrition.proteinG,
    carbs_g: nutrition.carbsG,
    fat_g: nutrition.fatG,
    restrictions: trimOrNull(form.restrictions),
    clinical_notes: trimOrNull(form.clinicalNotes),
    occupation: trimOrNull(form.occupation),
    sleep_hours: parseOptionalNumber(form.sleepHours),
    stress_level: form.stressLevel,
    medical_history: trimOrNull(form.medicalHistory),
    medications: trimOrNull(form.medications),
    injuries: trimOrNull(form.injuries),
    surgeries: trimOrNull(form.surgeries),
    family_history: trimOrNull(form.familyHistory),
    smoking: form.smoking,
    alcohol_use: trimOrNull(form.alcoholUse),
    training_experience: form.trainingExperience,
    training_days_per_week: parseOptionalInt(form.trainingDaysPerWeek),
    training_location: trimOrNull(form.trainingLocation),
    training_history: trimOrNull(form.trainingHistory),
    pain_or_limitations: trimOrNull(form.painOrLimitations),
    meals_per_day: parseOptionalInt(form.mealsPerDay),
    supplements_used: trimOrNull(form.supplementsUsed),
    food_preferences: trimOrNull(form.foodPreferences),
    digestion_notes: trimOrNull(form.digestionNotes),
    main_motivation: trimOrNull(form.mainMotivation),
    expectations: trimOrNull(form.expectations),
    weekly_availability: trimOrNull(form.weeklyAvailability),
    par_q_cleared: form.parQCleared,
    par_q_notes: trimOrNull(form.parQNotes),
    body_fat_pct: anthropometry.body_fat_pct,
    lean_mass_kg: anthropometry.lean_mass_kg,
    measurements: anthropometry.measurements,
    is_active: true,
  };
}

export async function fetchStudentAnamnesis(alunoId: string): Promise<AnamnesisRow | null> {
  const userId = await requireUserId();

  const { data: asProfessional, error: proError } = await supabase
    .from("anamnesis")
    .select("*")
    .eq("aluno_id", alunoId)
    .eq("personal_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (proError) throw new Error(formatSupabaseError(proError));
  if (asProfessional) return asProfessional as AnamnesisRow;

  if (userId === alunoId) {
    const { data, error } = await supabase
      .from("anamnesis")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(formatSupabaseError(error));
    return (data as AnamnesisRow | null) ?? null;
  }

  return null;
}

export async function fetchStudentAnamnesisContext(
  alunoId: string,
  _personalId?: string,
): Promise<AnamnesisContext | null> {
  const row = await fetchStudentAnamnesis(alunoId);
  if (!row) return null;
  return {
    sex: row.sex,
    age: row.age,
    height_cm: Number(row.height_cm),
    weight_kg: Number(row.weight_kg),
  };
}

async function upsertAnamnesis(payload: ReturnType<typeof buildPayload>) {
  const { data: existing, error: findError } = await supabase
    .from("anamnesis")
    .select("id")
    .eq("aluno_id", payload.aluno_id)
    .eq("personal_id", payload.personal_id)
    .eq("is_active", true)
    .maybeSingle();

  if (findError) throw new Error(formatSupabaseError(findError));

  if (existing?.id) {
    const { error } = await supabase.from("anamnesis").update(payload).eq("id", existing.id);
    if (error) throw new Error(formatSupabaseError(error));
  } else {
    const { error } = await supabase.from("anamnesis").insert(payload);
    if (error) throw new Error(formatSupabaseError(error));
  }
}

export async function saveStudentAnamnesis(input: SaveAnamnesisInput): Promise<void> {
  const personalId = await requireUserId();
  const payload = buildPayload(input, personalId);
  await upsertAnamnesis(payload);

  try {
    await syncDietFromAnamnesis(input.alunoId);
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? `Anamnese salva, mas o plano alimentar não foi atualizado: ${err.message}`
        : "Anamnese salva, mas o plano alimentar não foi atualizado.",
    );
  }
}

export async function saveAnamnesisAsStudent(input: Omit<SaveAnamnesisInput, "alunoId">): Promise<void> {
  const userId = await requireUserId();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, personal_id")
    .eq("id", userId)
    .single();
  if (profileError || !profile?.personal_id) {
    throw new Error("Vínculo com profissional não encontrado.");
  }

  const payload = buildPayload(
    { ...input, alunoId: profile.id },
    profile.personal_id,
  );
  await upsertAnamnesis(payload);

  await createNotification(
    profile.personal_id,
    "anamnesis_completed",
    "Anamnese preenchida",
    "Seu aluno completou o formulário de anamnese.",
    `/alunos/${profile.id}`,
  );
}

export { DEFAULT_ANAMNESIS_FORM };
