import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { syncDietFromAnamnesis } from "@/lib/diet";
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
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: FitnessGoal;
  restrictions?: string | null;
  clinicalNotes?: string | null;
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

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error(formatSupabaseError(error ?? new Error("Não autenticado")));
  return data.user.id;
}

export async function fetchStudentAnamnesis(alunoId: string): Promise<AnamnesisRow | null> {
  const personalId = await requireUserId();

  const { data, error } = await supabase
    .from("anamnesis")
    .select("*")
    .eq("aluno_id", alunoId)
    .eq("personal_id", personalId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(formatSupabaseError(error));
  return (data as AnamnesisRow | null) ?? null;
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

export async function saveStudentAnamnesis(input: SaveAnamnesisInput): Promise<void> {
  const personalId = await requireUserId();
  const { nutrition } = input;

  const payload = {
    aluno_id: input.alunoId,
    personal_id: personalId,
    sex: input.sex,
    age: input.age,
    weight_kg: input.weightKg,
    height_cm: input.heightCm,
    activity_level: input.activity,
    goal: input.goal,
    bmr: nutrition.bmr,
    tdee: nutrition.tdee,
    kcal_target: nutrition.kcalTarget,
    protein_g: nutrition.proteinG,
    carbs_g: nutrition.carbsG,
    fat_g: nutrition.fatG,
    restrictions: input.restrictions?.trim() || null,
    clinical_notes: input.clinicalNotes?.trim() || null,
    is_active: true,
  };

  const { data: existing, error: findError } = await supabase
    .from("anamnesis")
    .select("id")
    .eq("aluno_id", input.alunoId)
    .eq("personal_id", personalId)
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
