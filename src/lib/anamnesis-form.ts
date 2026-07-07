import type { ActivityLevel, FitnessGoal, Sex } from "@/lib/nutrition-calculator";
import {
  initFormMaps,
  type CircumferenceKey,
  type SkinfoldKey,
} from "@/lib/anthropometry";

export type StressLevel = "baixo" | "moderado" | "alto" | "muito_alto";
export type SmokingStatus = "nao" | "ex" | "sim";
export type TrainingExperience = "iniciante" | "intermediario" | "avancado" | "atleta";

export type AnamnesisFormState = {
  sex: Sex;
  age: string;
  weightKg: string;
  heightCm: string;
  bodyFatPct: string;
  circumferences: Record<CircumferenceKey, string>;
  skinfolds: Record<SkinfoldKey, string>;
  activity: ActivityLevel;
  goal: FitnessGoal;
  occupation: string;
  sleepHours: string;
  stressLevel: StressLevel;
  weeklyAvailability: string;
  medicalHistory: string;
  medications: string;
  injuries: string;
  surgeries: string;
  familyHistory: string;
  smoking: SmokingStatus;
  alcoholUse: string;
  painOrLimitations: string;
  parQCleared: boolean;
  parQNotes: string;
  trainingExperience: TrainingExperience;
  trainingDaysPerWeek: string;
  trainingLocation: string;
  trainingHistory: string;
  mealsPerDay: string;
  restrictions: string;
  supplementsUsed: string;
  foodPreferences: string;
  digestionNotes: string;
  mainMotivation: string;
  expectations: string;
  clinicalNotes: string;
};

export const DEFAULT_ANAMNESIS_FORM: AnamnesisFormState = {
  sex: "M",
  age: "",
  weightKg: "",
  heightCm: "",
  bodyFatPct: "",
  ...initFormMaps(),
  activity: "moderado",
  goal: "manutencao",
  occupation: "",
  sleepHours: "",
  stressLevel: "moderado",
  weeklyAvailability: "",
  medicalHistory: "",
  medications: "",
  injuries: "",
  surgeries: "",
  familyHistory: "",
  smoking: "nao",
  alcoholUse: "",
  painOrLimitations: "",
  parQCleared: true,
  parQNotes: "",
  trainingExperience: "iniciante",
  trainingDaysPerWeek: "",
  trainingLocation: "",
  trainingHistory: "",
  mealsPerDay: "",
  restrictions: "",
  supplementsUsed: "",
  foodPreferences: "",
  digestionNotes: "",
  mainMotivation: "",
  expectations: "",
  clinicalNotes: "",
};

export const STRESS_OPTIONS: { id: StressLevel; label: string }[] = [
  { id: "baixo", label: "Baixo" },
  { id: "moderado", label: "Moderado" },
  { id: "alto", label: "Alto" },
  { id: "muito_alto", label: "Muito alto" },
];

export const SMOKING_OPTIONS: { id: SmokingStatus; label: string }[] = [
  { id: "nao", label: "Não fumo" },
  { id: "ex", label: "Ex-fumante" },
  { id: "sim", label: "Fumo" },
];

export const TRAINING_EXPERIENCE_OPTIONS: { id: TrainingExperience; label: string }[] = [
  { id: "iniciante", label: "Iniciante" },
  { id: "intermediario", label: "Intermediário" },
  { id: "avancado", label: "Avançado" },
  { id: "atleta", label: "Atleta" },
];

export function parseAnamnesisMetrics(form: AnamnesisFormState) {
  const age = Number(form.age);
  const weightKg = Number(form.weightKg.replace(",", "."));
  const heightCm = Number(form.heightCm.replace(",", "."));
  if (!Number.isFinite(age) || age <= 0) return null;
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  return { age, weightKg, heightCm };
}

export function parseOptionalNumber(value: string): number | null {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseOptionalBodyFat(value: string): number | null {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 60 ? n : null;
}

export function parseOptionalInt(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
