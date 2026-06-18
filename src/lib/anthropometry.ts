import type { Assessment } from "@/lib/tracking";
import type { Sex } from "@/lib/nutrition-calculator";

export type CircumferenceKey =
  | "chest"
  | "waist"
  | "abdomen"
  | "hip"
  | "right_thigh"
  | "left_thigh"
  | "right_arm"
  | "left_arm";

export type SkinfoldKey =
  | "triceps"
  | "mid_axillary"
  | "chest"
  | "abdominal"
  | "suprailiac"
  | "subscapular"
  | "thigh";

export type AnthropometricMeasurements = {
  circumferences?: Partial<Record<CircumferenceKey, number>>;
  skinfolds?: Partial<Record<SkinfoldKey, number>>;
};

export const CIRCUMFERENCE_FIELDS: { key: CircumferenceKey; label: string }[] = [
  { key: "chest", label: "Peitoral" },
  { key: "waist", label: "Cintura" },
  { key: "abdomen", label: "Abdômen" },
  { key: "hip", label: "Quadril" },
  { key: "right_thigh", label: "Coxa direita" },
  { key: "left_thigh", label: "Coxa esquerda" },
  { key: "right_arm", label: "Braço direito contraído" },
  { key: "left_arm", label: "Braço esquerdo contraído" },
];

export const SKINFOLD_FIELDS: { key: SkinfoldKey; label: string }[] = [
  { key: "triceps", label: "Tríceps" },
  { key: "mid_axillary", label: "Axilar média" },
  { key: "chest", label: "Tórax" },
  { key: "abdominal", label: "Abdominal" },
  { key: "suprailiac", label: "Supra-ilíaca" },
  { key: "subscapular", label: "Subescapular" },
  { key: "thigh", label: "Coxa" },
];

export type AssessmentMetrics = {
  assessedAt: string;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  bmiStatus: string | null;
  bodyFatPct: number | null;
  bodyFatStatus: string | null;
  fatMassKg: number | null;
  leanMassKg: number | null;
  leanMassPct: number | null;
  leanMassStatus: string | null;
  waistHipRatio: number | null;
  waistHipRisk: string | null;
  bodyDensity: number | null;
  skinfoldSum: number | null;
  circumferences: Partial<Record<CircumferenceKey, number>>;
  skinfolds: Partial<Record<SkinfoldKey, number>>;
  notes: string | null;
};

export type ComparativeRow = {
  label: string;
  before: string;
  after: string;
  deltaDisplay: string | null;
  delta: number | null;
  lowerIsBetter?: boolean;
};

export type ComparativeSection = {
  title?: string;
  rows: ComparativeRow[];
};

export function parseMeasurements(raw: Assessment["measurements"]): AnthropometricMeasurements {
  if (!raw || typeof raw !== "object") return {};
  return raw as AnthropometricMeasurements;
}

export function computeBmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

export function getBmiStatus(bmi: number): string {
  if (bmi < 18.5) return "Baixo peso";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Sobrepeso";
  return "Obesidade";
}

export function getBodyFatStatus(pct: number, sex: Sex): string {
  if (sex === "M") {
    if (pct < 6) return "Essencial";
    if (pct < 14) return "Atlético";
    if (pct < 18) return "Fitness";
    if (pct < 25) return "Aceitável";
    return "Ruim";
  }
  if (pct < 14) return "Essencial";
  if (pct < 21) return "Atlético";
  if (pct < 25) return "Fitness";
  if (pct < 32) return "Aceitável";
  return "Ruim";
}

export function getLeanMassStatus(pct: number, sex: Sex): string {
  const fatStatus = getBodyFatStatus(100 - pct, sex);
  if (fatStatus === "Ruim" || fatStatus === "Aceitável") return "Ruim";
  if (fatStatus === "Fitness") return "Regular";
  return "Bom";
}

export function getWaistHipRisk(ratio: number, sex: Sex): string {
  if (sex === "M") {
    if (ratio < 0.9) return "Baixo risco";
    if (ratio < 1.0) return "Risco moderado";
    return "Risco muito alto";
  }
  if (ratio < 0.8) return "Baixo risco";
  if (ratio < 0.85) return "Risco moderado";
  return "Risco muito alto";
}

export function sumSkinfolds(skinfolds: Partial<Record<SkinfoldKey, number>>): number | null {
  const values = SKINFOLD_FIELDS.map((f) => skinfolds[f.key]).filter((v) => v != null && !Number.isNaN(v));
  if (values.length === 0) return null;
  if (values.length < SKINFOLD_FIELDS.length) return values.reduce((a, b) => a + b, 0);
  return values.reduce((a, b) => a + (b ?? 0), 0);
}

export function computeBodyDensityJacksonPollock7(sum: number, age: number, sex: Sex): number {
  if (sex === "M") {
    return 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age;
  }
  return 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * age;
}

export function bodyFatFromDensity(density: number): number {
  return 495 / density - 450;
}

export function computeWaistHipRatio(
  circumferences: Partial<Record<CircumferenceKey, number>>,
): number | null {
  const waist = circumferences.waist;
  const hip = circumferences.hip;
  if (waist == null || hip == null || hip === 0) return null;
  return waist / hip;
}

export function buildAssessmentMetrics(
  assessment: Assessment,
  options?: { sex?: Sex; age?: number },
): AssessmentMetrics {
  const parsed = parseMeasurements(assessment.measurements);
  const circumferences = parsed.circumferences ?? {};
  const skinfolds = parsed.skinfolds ?? {};
  const weight = assessment.weight_kg != null ? Number(assessment.weight_kg) : null;
  const height = assessment.height_cm != null ? Number(assessment.height_cm) : null;

  let bodyFatPct = assessment.body_fat_pct != null ? Number(assessment.body_fat_pct) : null;
  const skinfoldSum = sumSkinfolds(skinfolds);
  let bodyDensity: number | null = null;

  if (
    bodyFatPct == null &&
    skinfoldSum != null &&
    skinfoldSum > 0 &&
    options?.sex &&
    options?.age
  ) {
    bodyDensity = computeBodyDensityJacksonPollock7(skinfoldSum, options.age, options.sex);
    bodyFatPct = Math.max(0, Math.min(60, bodyFatFromDensity(bodyDensity)));
  }

  let fatMassKg: number | null = null;
  let leanMassKg =
    assessment.lean_mass_kg != null ? Number(assessment.lean_mass_kg) : null;

  if (weight != null && bodyFatPct != null) {
    fatMassKg = (weight * bodyFatPct) / 100;
    if (leanMassKg == null) leanMassKg = weight - fatMassKg;
  }

  const leanMassPct =
    weight != null && leanMassKg != null && weight > 0 ? (leanMassKg / weight) * 100 : null;

  const bmi = weight != null && height != null ? computeBmi(weight, height) : null;
  const waistHipRatio = computeWaistHipRatio(circumferences);
  const sex = options?.sex ?? "M";

  return {
    assessedAt: assessment.assessed_at,
    weightKg: weight,
    heightCm: height,
    bmi,
    bmiStatus: bmi != null ? getBmiStatus(bmi) : null,
    bodyFatPct,
    bodyFatStatus: bodyFatPct != null ? getBodyFatStatus(bodyFatPct, sex) : null,
    fatMassKg,
    leanMassKg,
    leanMassPct,
    leanMassStatus: leanMassPct != null ? getLeanMassStatus(leanMassPct, sex) : null,
    waistHipRatio,
    waistHipRisk: waistHipRatio != null ? getWaistHipRisk(waistHipRatio, sex) : null,
    bodyDensity,
    skinfoldSum,
    circumferences,
    skinfolds,
    notes: assessment.notes,
  };
}

export function formatAssessmentNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatHeight(heightCm: number | null): string {
  if (heightCm == null) return "—";
  return `${formatAssessmentNumber(heightCm / 100, 2)} m`;
}

export function formatAssessmentDate(dateStr: string): string {
  return new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`).toLocaleDateString("pt-BR");
}

export function assessmentOrdinal(total: number, indexFromOldest: number): string {
  const n = indexFromOldest + 1;
  return `${n}ª Avaliação Física`;
}

export function sortAssessmentsOldestFirst(assessments: Assessment[]): Assessment[] {
  return [...assessments].sort(
    (a, b) => new Date(a.assessed_at).getTime() - new Date(b.assessed_at).getTime(),
  );
}

function formatComparativeCell(
  before: number | null,
  after: number | null,
  format: (v: number) => string,
  deltaSuffix = "",
): Pick<ComparativeRow, "before" | "after" | "deltaDisplay" | "delta"> {
  const beforeStr = before != null ? format(before) : "—";
  if (after == null) {
    return { before: beforeStr, after: "—", deltaDisplay: null, delta: null };
  }
  const afterStr = format(after);
  if (before == null || after === before) {
    return {
      before: beforeStr,
      after: afterStr,
      deltaDisplay: null,
      delta: before != null ? 0 : null,
    };
  }
  const delta = after - before;
  const sign = delta > 0 ? "+" : "";
  const deltaDisplay = `(${sign}${formatAssessmentNumber(delta)}${deltaSuffix})`;
  return { before: beforeStr, after: afterStr, deltaDisplay, delta };
}

function bodyCompositionRows(
  before: AssessmentMetrics,
  after: AssessmentMetrics,
): ComparativeRow[] {
  return [
    {
      label: "Data",
      before: formatAssessmentDate(before.assessedAt),
      after: formatAssessmentDate(after.assessedAt),
      deltaDisplay: null,
      delta: null,
    },
    {
      label: "Altura",
      ...formatComparativeCell(before.heightCm, after.heightCm, (v) => formatHeight(v)),
    },
    {
      label: "Peso",
      lowerIsBetter: true,
      ...formatComparativeCell(before.weightKg, after.weightKg, (v) => `${formatAssessmentNumber(v)} kg`),
    },
    {
      label: "IMC",
      lowerIsBetter: true,
      ...formatComparativeCell(before.bmi, after.bmi, (v) => formatAssessmentNumber(v)),
    },
    {
      label: "Massa Gorda",
      lowerIsBetter: true,
      ...formatComparativeCell(before.fatMassKg, after.fatMassKg, (v) => `${formatAssessmentNumber(v)} kg`),
    },
    {
      label: "% Massa Gorda",
      lowerIsBetter: true,
      ...formatComparativeCell(
        before.bodyFatPct,
        after.bodyFatPct,
        (v) => `${formatAssessmentNumber(v)}%`,
        "%",
      ),
    },
    {
      label: "Massa Magra",
      ...formatComparativeCell(before.leanMassKg, after.leanMassKg, (v) => `${formatAssessmentNumber(v)} kg`),
    },
    {
      label: "% Massa Magra",
      ...formatComparativeCell(
        before.leanMassPct,
        after.leanMassPct,
        (v) => `${formatAssessmentNumber(v)}%`,
        "%",
      ),
    },
    {
      label: "Razão Cintura/Quadril",
      lowerIsBetter: true,
      ...formatComparativeCell(before.waistHipRatio, after.waistHipRatio, (v) => formatAssessmentNumber(v)),
    },
    {
      label: "Densidade Corporal",
      ...formatComparativeCell(before.bodyDensity, after.bodyDensity, (v) => formatAssessmentNumber(v)),
    },
    {
      label: "Soma de Dobras",
      lowerIsBetter: true,
      ...formatComparativeCell(
        before.skinfoldSum,
        after.skinfoldSum,
        (v) => `${formatAssessmentNumber(v)} mm`,
      ),
    },
  ];
}

export function buildComparativeSections(
  before: AssessmentMetrics,
  after: AssessmentMetrics,
): ComparativeSection[] {
  const circumferenceRows: ComparativeRow[] = [];
  for (const field of CIRCUMFERENCE_FIELDS) {
    const b = before.circumferences[field.key] ?? null;
    const a = after.circumferences[field.key] ?? null;
    if (b == null && a == null) continue;
    circumferenceRows.push({
      label: field.label,
      ...formatComparativeCell(b, a, (v) => `${formatAssessmentNumber(v)} cm`),
    });
  }

  const skinfoldRows: ComparativeRow[] = [];
  for (const field of SKINFOLD_FIELDS) {
    const b = before.skinfolds[field.key] ?? null;
    const a = after.skinfolds[field.key] ?? null;
    if (b == null && a == null) continue;
    skinfoldRows.push({
      label: field.label,
      lowerIsBetter: true,
      ...formatComparativeCell(b, a, (v) => `${formatAssessmentNumber(v)} mm`),
    });
  }

  const sections: ComparativeSection[] = [{ rows: bodyCompositionRows(before, after) }];
  if (circumferenceRows.length > 0) {
    sections.push({ title: "Circunferências", rows: circumferenceRows });
  }
  if (skinfoldRows.length > 0) {
    sections.push({ title: "Dobras Cutâneas", rows: skinfoldRows });
  }
  return sections;
}

export function buildComparativeRows(
  before: AssessmentMetrics,
  after: AssessmentMetrics,
): ComparativeRow[] {
  return buildComparativeSections(before, after).flatMap((section) => section.rows);
}

export function emptyMeasurementsForm(): AnthropometricMeasurements {
  return { circumferences: {}, skinfolds: {} };
}

export function measurementsFromForm(
  circumferences: Record<string, string>,
  skinfolds: Record<string, string>,
): AnthropometricMeasurements {
  const c: Partial<Record<CircumferenceKey, number>> = {};
  const s: Partial<Record<SkinfoldKey, number>> = {};

  for (const field of CIRCUMFERENCE_FIELDS) {
    const v = circumferences[field.key]?.trim();
    if (v) c[field.key] = Number(v.replace(",", "."));
  }
  for (const field of SKINFOLD_FIELDS) {
    const v = skinfolds[field.key]?.trim();
    if (v) s[field.key] = Number(v.replace(",", "."));
  }

  return {
    circumferences: Object.keys(c).length ? c : undefined,
    skinfolds: Object.keys(s).length ? s : undefined,
  };
}

export function initFormMaps(): {
  circumferences: Record<CircumferenceKey, string>;
  skinfolds: Record<SkinfoldKey, string>;
} {
  const circumferences = {} as Record<CircumferenceKey, string>;
  const skinfolds = {} as Record<SkinfoldKey, string>;
  for (const f of CIRCUMFERENCE_FIELDS) circumferences[f.key] = "";
  for (const f of SKINFOLD_FIELDS) skinfolds[f.key] = "";
  return { circumferences, skinfolds };
}

export function formMapsFromAssessment(assessment: Assessment): {
  circumferences: Record<CircumferenceKey, string>;
  skinfolds: Record<SkinfoldKey, string>;
} {
  const maps = initFormMaps();
  const parsed = parseMeasurements(assessment.measurements);

  for (const field of CIRCUMFERENCE_FIELDS) {
    const value = parsed.circumferences?.[field.key];
    if (value != null) maps.circumferences[field.key] = String(value);
  }
  for (const field of SKINFOLD_FIELDS) {
    const value = parsed.skinfolds?.[field.key];
    if (value != null) maps.skinfolds[field.key] = String(value);
  }

  return maps;
}
