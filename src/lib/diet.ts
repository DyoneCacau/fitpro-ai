import {
  Coffee,
  Cookie,
  Moon,
  Sun,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const MEAL_SLOTS = [
  { id: "cafe", label: "Café da manhã", icon: Coffee, time: "07:00" },
  { id: "lanche_manha", label: "Lanche da manhã", icon: Cookie, time: "10:00" },
  { id: "almoco", label: "Almoço", icon: UtensilsCrossed, time: "12:30" },
  { id: "lanche_tarde", label: "Lanche da tarde", icon: Cookie, time: "16:00" },
  { id: "jantar", label: "Jantar", icon: Sun, time: "19:30" },
  { id: "ceia", label: "Ceia", icon: Moon, time: "22:00" },
] as const;

export type MealSlotId = (typeof MEAL_SLOTS)[number]["id"];

export type MealSlotMeta = {
  id: MealSlotId;
  label: string;
  icon: LucideIcon;
  time: string;
};

export type DietMealItem = {
  id: string;
  food: string;
  quantity: number;
  unit: string;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  notes: string | null;
  position: number | null;
};

export type DietMeal = {
  id: string;
  slot: MealSlotId;
  time_label: string | null;
  description: string | null;
  diet_meal_items: DietMealItem[];
};

export type DietSupplement = {
  id: string;
  plan_id: string;
  name: string;
  dosage: string;
  timing: string | null;
  notes: string | null;
  position: number;
};

export const SUPPLEMENT_TIMING_SUGGESTIONS = [
  "Ao acordar",
  "Café da manhã",
  "Pré-treino",
  "Pós-treino",
  "Almoço",
  "Jantar",
  "Antes de dormir",
] as const;

export const DIET_PLAN_SELECT =
  "*, diet_meals(*, diet_meal_items(*)), diet_supplements(*)";

export type DietPlan = {
  id: string;
  aluno_id: string | null;
  personal_id: string | null;
  name: string;
  kcal_target: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  notes: string | null;
  is_active: boolean;
  is_template: boolean;
  diet_meals?: DietMeal[];
  diet_supplements?: DietSupplement[];
};

export function formatFoodQuantity(quantity: number): string {
  const value = Number(quantity);
  if (!Number.isFinite(value)) return "0g";
  return `${value % 1 === 0 ? value : value.toFixed(1)}g`;
}

export function formatFoodItemLine(item: Pick<DietMealItem, "quantity" | "kcal">): string {
  const qty = formatFoodQuantity(item.quantity);
  const kcal = Number(item.kcal ?? 0);
  return kcal > 0 ? `${qty} · ${Math.round(kcal)} kcal` : qty;
}

export function hasItemMacros(item: Pick<DietMealItem, "kcal" | "protein_g" | "carbs_g" | "fat_g">): boolean {
  return (
    Number(item.kcal ?? 0) > 0 ||
    Number(item.protein_g ?? 0) > 0 ||
    Number(item.carbs_g ?? 0) > 0 ||
    Number(item.fat_g ?? 0) > 0
  );
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function sumMealItems(items: DietMealItem[]) {
  return items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + Number(item.kcal ?? 0),
      protein: acc.protein + Number(item.protein_g ?? 0),
      carbs: acc.carbs + Number(item.carbs_g ?? 0),
      fat: acc.fat + Number(item.fat_g ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function sumPlanMeals(meals: DietMeal[]) {
  return meals.reduce(
    (acc, meal) => {
      const t = sumMealItems(meal.diet_meal_items ?? []);
      return {
        kcal: acc.kcal + t.kcal,
        protein: acc.protein + t.protein,
        carbs: acc.carbs + t.carbs,
        fat: acc.fat + t.fat,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export async function ensureDietPlan(input: {
  personalId: string;
  alunoId?: string | null;
  isTemplate: boolean;
  targets?: {
    kcal_target?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  };
  existingPlanId?: string | null;
}): Promise<string> {
  if (input.existingPlanId) return input.existingPlanId;

  const row: Record<string, unknown> = {
    aluno_id: input.isTemplate ? null : input.alunoId,
    personal_id: input.personalId,
    name: input.isTemplate ? "Modelo alimentar" : "Plano Alimentar",
    kcal_target: input.targets?.kcal_target ?? 2000,
    protein_g: input.targets?.protein_g ?? 150,
    carbs_g: input.targets?.carbs_g ?? 200,
    fat_g: input.targets?.fat_g ?? 60,
    is_active: true,
  };
  if (input.isTemplate) row.is_template = true;

  const { data, error } = await supabase.from("diet_plans").insert(row).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function ensureDietMeal(planId: string, slot: MealSlotId, position: number) {
  const { data: existing, error: findError } = await supabase
    .from("diet_meals")
    .select("id, slot, time_label, description")
    .eq("plan_id", planId)
    .eq("slot", slot)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("diet_meals")
    .insert({
      plan_id: planId,
      slot,
      position,
      time_label: getMealSlotMeta(slot).time,
    })
    .select("id, slot, time_label, description")
    .single();
  if (error) throw error;
  return data;
}

export async function removeDietMeal(mealId: string) {
  const { error } = await supabase.from("diet_meals").delete().eq("id", mealId);
  if (error) throw error;
}

export async function activateDietMealSlot(input: {
  personalId: string;
  alunoId?: string | null;
  isTemplate: boolean;
  slot: MealSlotId;
  plan?: DietPlan | null;
  anamnesisTargets?: {
    kcal_target: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null;
}): Promise<string> {
  const planId = await ensureDietPlan({
    personalId: input.personalId,
    alunoId: input.alunoId,
    isTemplate: input.isTemplate,
    existingPlanId: input.plan?.id,
    targets: input.anamnesisTargets ?? undefined,
  });
  const position = (input.plan?.diet_meals?.length ?? 0) + 1;
  const meal = await ensureDietMeal(planId, input.slot, position);
  return meal.id as string;
}

export async function fetchStudentDietPlan(personalId: string, alunoId: string) {
  const { data, error } = await supabase
    .from("diet_plans")
    .select(DIET_PLAN_SELECT)
    .eq("aluno_id", alunoId)
    .eq("personal_id", personalId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  const plan = data as DietPlan | null;
  if (!plan || plan.is_template) return null;
  return plan;
}

export async function fetchDietPlanById(planId: string, personalId: string) {
  const { data, error } = await supabase
    .from("diet_plans")
    .select(DIET_PLAN_SELECT)
    .eq("id", planId)
    .eq("personal_id", personalId)
    .maybeSingle();
  if (error) throw error;
  return data as DietPlan | null;
}

export async function fetchStudentActiveDietPlan(alunoId: string) {
  const { data, error } = await supabase
    .from("diet_plans")
    .select(DIET_PLAN_SELECT)
    .eq("aluno_id", alunoId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  const plan = data as DietPlan | null;
  if (!plan || plan.is_template) return null;
  return plan;
}

export async function fetchDietTemplates(personalId: string) {
  const { data, error } = await supabase
    .from("diet_plans")
    .select("id, name, kcal_target, protein_g, carbs_g, fat_g, notes, created_at, updated_at")
    .eq("personal_id", personalId)
    .eq("is_template", true)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DietPlan[];
}

export async function syncDietFromAnamnesis(alunoId: string) {
  const { data, error } = await supabase.rpc("sync_diet_from_anamnesis", {
    _aluno_id: alunoId,
  });
  if (error) throw error;
  return data as string;
}

export async function cloneDietPlan(input: {
  sourcePlanId: string;
  targetAlunoId?: string;
  asTemplate?: boolean;
  templateName?: string;
}) {
  const { data, error } = await supabase.rpc("clone_diet_plan", {
    _source_plan_id: input.sourcePlanId,
    _target_aluno_id: input.targetAlunoId ?? null,
    _as_template: input.asTemplate ?? false,
    _template_name: input.templateName ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function createEmptyDietTemplate(personalId: string, name: string) {
  const { data, error } = await supabase
    .from("diet_plans")
    .insert({
      personal_id: personalId,
      name,
      is_template: true,
      is_active: true,
      kcal_target: 2000,
      protein_g: 150,
      carbs_g: 200,
      fat_g: 60,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteDietTemplate(planId: string) {
  const { error } = await supabase.from("diet_plans").delete().eq("id", planId).eq("is_template", true);
  if (error) throw error;
}

export async function updateMealDescription(mealId: string, description: string | null) {
  const { error } = await supabase
    .from("diet_meals")
    .update({ description: description?.trim() || null })
    .eq("id", mealId);
  if (error) throw error;
}

export async function addDietSupplement(input: {
  planId: string;
  name: string;
  dosage: string;
  timing?: string | null;
  notes?: string | null;
  position: number;
}) {
  const { error } = await supabase.from("diet_supplements").insert({
    plan_id: input.planId,
    name: input.name.trim(),
    dosage: input.dosage.trim(),
    timing: input.timing?.trim() || null,
    notes: input.notes?.trim() || null,
    position: input.position,
  });
  if (error) throw error;
}

export async function removeDietSupplement(supplementId: string) {
  const { error } = await supabase.from("diet_supplements").delete().eq("id", supplementId);
  if (error) throw error;
}

export function sortSupplements(supplements: DietSupplement[] | undefined): DietSupplement[] {
  return [...(supplements ?? [])].sort((a, b) => a.position - b.position);
}

export async function logFoodFromPlanItem(
  alunoId: string,
  slot: MealSlotId,
  item: DietMealItem,
  logDate = todayIsoDate(),
) {
  const { error } = await supabase.from("food_logs").insert({
    aluno_id: alunoId,
    log_date: logDate,
    slot,
    food: item.food,
    quantity: item.quantity,
    unit: item.unit,
    kcal: item.kcal ?? 0,
    protein_g: item.protein_g ?? 0,
    carbs_g: item.carbs_g ?? 0,
    fat_g: item.fat_g ?? 0,
    source_meal_item_id: item.id,
  });
  if (error) throw error;
}

export async function logMealFromPlan(
  alunoId: string,
  slot: MealSlotId,
  items: DietMealItem[],
  logDate = todayIsoDate(),
) {
  if (items.length === 0) return;
  const { error } = await supabase.from("food_logs").insert(
    items.map((item) => ({
      aluno_id: alunoId,
      log_date: logDate,
      slot,
      food: item.food,
      quantity: item.quantity,
      unit: item.unit,
      kcal: item.kcal ?? 0,
      protein_g: item.protein_g ?? 0,
      carbs_g: item.carbs_g ?? 0,
      fat_g: item.fat_g ?? 0,
      source_meal_item_id: item.id,
    })),
  );
  if (error) throw error;
}

export function getMealSlotMeta(slot: MealSlotId): MealSlotMeta {
  return MEAL_SLOTS.find((s) => s.id === slot)!;
}

export function getDietErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Erro ao salvar dieta";
}
