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
  substitution_set_id?: string | null;
};

export type DietMealSubstitutionSet = {
  id: string;
  meal_id: string;
  name: string;
  position: number;
};

export type DietMeal = {
  id: string;
  slot: MealSlotId;
  time_label: string | null;
  description: string | null;
  diet_meal_items: DietMealItem[];
  diet_meal_substitution_sets?: DietMealSubstitutionSet[];
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
  "*, diet_meals(*, diet_meal_items(*), diet_meal_substitution_sets(*)), diet_supplements(*), diet_substitutions(*)";

export type DietSubstitution = {
  id: string;
  plan_id: string;
  original_food: string;
  substitute_food: string;
  notes: string | null;
  position: number;
};

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
  diet_substitutions?: DietSubstitution[];
};

export type FoodUnitId = "g" | "un" | "fatia" | "col_sob" | "ml" | "un_md";

export const FOOD_UNIT_OPTIONS: {
  id: FoodUnitId;
  label: string;
  portionLabel: string;
  quantityHint: string;
}[] = [
  { id: "g", label: "Gramas (g)", portionLabel: "Grama", quantityHint: "Quantidade (g)" },
  { id: "un", label: "Unidade", portionLabel: "Unidade", quantityHint: "Quantidade (un)" },
  { id: "fatia", label: "Fatia", portionLabel: "Fatia", quantityHint: "Quantidade (fatias)" },
  { id: "col_sob", label: "Colher sob.", portionLabel: "Colher De Sobremesa", quantityHint: "Quantidade (colheres)" },
  { id: "ml", label: "Mililitro (ml)", portionLabel: "Mililitro", quantityHint: "Quantidade (ml)" },
  { id: "un_md", label: "Un. média", portionLabel: "Unidade média (75g)", quantityHint: "Quantidade (un)" },
];

export function getFoodUnitMeta(unit: string) {
  return FOOD_UNIT_OPTIONS.find((o) => o.id === unit) ?? FOOD_UNIT_OPTIONS[0];
}

export function formatFoodQuantity(quantity: number, unit: FoodUnitId | string = "g"): string {
  const value = Number(quantity);
  const meta = getFoodUnitMeta(unit);
  if (!Number.isFinite(value)) {
    return unit === "g" ? "0g" : `0 ${meta.label.toLowerCase()}`;
  }
  const formatted = value % 1 === 0 ? String(value) : value.toFixed(1);
  if (unit === "g") return `${formatted}g`;
  if (unit === "un" || unit === "un_md") {
    return `${formatted} ${value === 1 ? "unidade" : "unidades"}`;
  }
  if (unit === "fatia") return `${formatted} ${value === 1 ? "fatia" : "fatias"}`;
  if (unit === "col_sob") return `${formatted} ${value === 1 ? "colher" : "colheres"}`;
  if (unit === "ml") return `${formatted}ml`;
  return `${formatted} ${meta.label.toLowerCase()}`;
}

/** Formato de porção: "Mamão (Grama: 150)" */
export function formatFoodItemPortion(item: Pick<DietMealItem, "food" | "quantity" | "unit">): string {
  const meta = getFoodUnitMeta(item.unit || "g");
  const qty = Number(item.quantity);
  const formatted = qty % 1 === 0 ? String(qty) : qty.toFixed(1);
  return `${item.food} (${meta.portionLabel}: ${formatted})`;
}

export function formatFoodItemLine(item: Pick<DietMealItem, "quantity" | "kcal" | "unit">): string {
  const qty = formatFoodQuantity(item.quantity, item.unit || "g");
  const kcal = Number(item.kcal ?? 0);
  return kcal > 0 ? `${qty} · ${Math.round(kcal)} kcal` : qty;
}

export function defaultQuantityForUnit(unit: FoodUnitId): string {
  if (unit === "un" || unit === "un_md" || unit === "fatia" || unit === "col_sob") return "1";
  if (unit === "ml") return "200";
  return "100";
}

export function getMealMainItems(meal: DietMeal): DietMealItem[] {
  return (meal.diet_meal_items ?? [])
    .filter((i) => !i.substitution_set_id)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export function getMealSubstitutionGroups(meal: DietMeal): { set: DietMealSubstitutionSet; items: DietMealItem[] }[] {
  const sets = [...(meal.diet_meal_substitution_sets ?? [])].sort((a, b) => a.position - b.position);
  return sets.map((set) => ({
    set,
    items: (meal.diet_meal_items ?? [])
      .filter((i) => i.substitution_set_id === set.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  }));
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

export async function fetchMealCompletions(alunoId: string, logDate = todayIsoDate()) {
  const { data, error } = await supabase
    .from("diet_meal_completions")
    .select("meal_id")
    .eq("aluno_id", alunoId)
    .eq("log_date", logDate);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.meal_id as string));
}

export async function setMealCompletion(
  alunoId: string,
  mealId: string,
  completed: boolean,
  logDate = todayIsoDate(),
) {
  if (completed) {
    const { error } = await supabase.from("diet_meal_completions").upsert(
      {
        aluno_id: alunoId,
        meal_id: mealId,
        log_date: logDate,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "aluno_id,meal_id,log_date" },
    );
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("diet_meal_completions")
    .delete()
    .eq("aluno_id", alunoId)
    .eq("meal_id", mealId)
    .eq("log_date", logDate);
  if (error) throw error;
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
  return (data ?? []) as unknown as DietPlan[];
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
    _target_aluno_id: input.targetAlunoId ?? undefined,
    _as_template: input.asTemplate ?? false,
    _template_name: input.templateName ?? undefined,
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

export function sortSubstitutions(items: DietSubstitution[] | undefined): DietSubstitution[] {
  return [...(items ?? [])].sort((a, b) => a.position - b.position);
}

export async function addDietSubstitution(input: {
  planId: string;
  originalFood: string;
  substituteFood: string;
  notes?: string | null;
  position: number;
}) {
  const { error } = await supabase.from("diet_substitutions").insert({
    plan_id: input.planId,
    original_food: input.originalFood.trim(),
    substitute_food: input.substituteFood.trim(),
    notes: input.notes?.trim() || null,
    position: input.position,
  });
  if (error) throw error;
}

export async function removeDietSubstitution(id: string) {
  const { error } = await supabase.from("diet_substitutions").delete().eq("id", id);
  if (error) throw error;
}

export async function createMealSubstitutionSet(mealId: string, name: string, position: number) {
  const { data, error } = await supabase
    .from("diet_meal_substitution_sets")
    .insert({ meal_id: mealId, name, position })
    .select("id, meal_id, name, position")
    .single();
  if (error) throw error;
  return data as DietMealSubstitutionSet;
}

export async function removeMealSubstitutionSet(setId: string) {
  const { error } = await supabase.from("diet_meal_substitution_sets").delete().eq("id", setId);
  if (error) throw error;
}

export type ShoppingListItem = { food: string; quantity: number; unit: string };

export function buildShoppingList(plan: DietPlan): ShoppingListItem[] {
  const map = new Map<string, ShoppingListItem>();
  for (const meal of plan.diet_meals ?? []) {
    for (const item of getMealMainItems(meal as DietMeal)) {
      const key = `${item.food.toLowerCase()}|${item.unit}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += Number(item.quantity) || 0;
      } else {
        map.set(key, {
          food: item.food,
          quantity: Number(item.quantity) || 0,
          unit: item.unit || "g",
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.food.localeCompare(b.food, "pt-BR"));
}

export type RecipeFromPlan = {
  id: string;
  title: string;
  time: string;
  content: string;
};

export function buildRecipesFromPlan(plan: DietPlan): RecipeFromPlan[] {
  return (plan.diet_meals ?? [])
    .filter((m) => m.description?.trim())
    .map((m) => {
      const meta = getMealSlotMeta(m.slot);
      return {
        id: m.id,
        title: meta.label,
        time: m.time_label ?? meta.time,
        content: m.description!.trim(),
      };
    });
}

export const WEEK_DAYS = [
  { id: 0, short: "Dom", label: "Domingo" },
  { id: 1, short: "Seg", label: "Segunda" },
  { id: 2, short: "Ter", label: "Terça" },
  { id: 3, short: "Qua", label: "Quarta" },
  { id: 4, short: "Qui", label: "Quinta" },
  { id: 5, short: "Sex", label: "Sexta" },
  { id: 6, short: "Sab", label: "Sábado" },
] as const;

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
