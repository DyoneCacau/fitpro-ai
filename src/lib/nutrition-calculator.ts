export type Sex = "M" | "F";

export type ActivityLevel =
  | "sedentario"
  | "leve"
  | "moderado"
  | "intenso"
  | "atleta";

export type FitnessGoal =
  | "perda_peso"
  | "ganho_massa"
  | "definicao"
  | "manutencao"
  | "performance";

export interface NutritionInput {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: FitnessGoal;
}

export interface NutritionResult {
  bmr: number;
  tdee: number;
  kcalTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const ACTIVITY_OPTIONS: { id: ActivityLevel; label: string; factor: number }[] = [
  { id: "sedentario", label: "Sedentário", factor: 1.2 },
  { id: "leve", label: "Leve (1–3x/semana)", factor: 1.375 },
  { id: "moderado", label: "Moderado (3–5x/semana)", factor: 1.55 },
  { id: "intenso", label: "Intenso (6–7x/semana)", factor: 1.725 },
  { id: "atleta", label: "Atleta / trabalho físico", factor: 1.9 },
];

export const GOAL_OPTIONS: { id: FitnessGoal; label: string; kcalAdjust: number }[] = [
  { id: "perda_peso", label: "Perda de peso", kcalAdjust: -500 },
  { id: "ganho_massa", label: "Ganho de massa", kcalAdjust: 400 },
  { id: "definicao", label: "Definição / secar", kcalAdjust: -300 },
  { id: "manutencao", label: "Manutenção", kcalAdjust: 0 },
  { id: "performance", label: "Performance", kcalAdjust: 200 },
];

function activityFactor(level: ActivityLevel): number {
  return ACTIVITY_OPTIONS.find((o) => o.id === level)?.factor ?? 1.2;
}

function goalAdjust(goal: FitnessGoal): number {
  return GOAL_OPTIONS.find((o) => o.id === goal)?.kcalAdjust ?? 0;
}

export function calculateBmr(input: Pick<NutritionInput, "sex" | "age" | "weightKg" | "heightCm">): number {
  const { sex, age, weightKg, heightCm } = input;
  if (sex === "M") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function calculateNutritionPlan(input: NutritionInput): NutritionResult {
  const bmr = Math.round(calculateBmr(input));
  const tdee = Math.round(bmr * activityFactor(input.activity));
  const kcalTarget = Math.max(1200, tdee + goalAdjust(input.goal));

  const proteinPerKg =
    input.goal === "ganho_massa" ? 2.0 : input.goal === "definicao" ? 2.2 : 1.8;
  const proteinG = Math.max(Math.round(proteinPerKg * input.weightKg), Math.round((kcalTarget * 0.25) / 4));

  const fatPct =
    input.goal === "perda_peso" || input.goal === "definicao" ? 0.28 : 0.25;
  const fatG = Math.round((kcalTarget * fatPct) / 9);

  const carbsG = Math.max(Math.round((kcalTarget - proteinG * 4 - fatG * 9) / 4), 0);

  return { bmr, tdee, kcalTarget, proteinG, carbsG, fatG };
}

export function getGoalLabel(goal: FitnessGoal): string {
  return GOAL_OPTIONS.find((o) => o.id === goal)?.label ?? goal;
}

export function getActivityLabel(level: ActivityLevel): string {
  return ACTIVITY_OPTIONS.find((o) => o.id === level)?.label ?? level;
}
