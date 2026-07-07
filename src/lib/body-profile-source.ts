import { buildAssessmentMetrics } from "@/lib/anthropometry";
import type { AnamnesisRow } from "@/lib/anamnesis";
import { buildBodyProfile, type BodyProfileModel } from "@/lib/body-profile";
import type { Sex } from "@/lib/nutrition-calculator";
import type { Assessment } from "@/lib/tracking";

export function resolveBodyProfileInput(input: {
  sex: Sex;
  age?: number;
  anamnesis?: AnamnesisRow | null;
  assessments?: Assessment[];
  liveMetrics?: ReturnType<typeof buildAssessmentMetrics> | null;
  injuries?: string | null;
  painOrLimitations?: string | null;
}): BodyProfileModel | null {
  const latestAssessment = input.assessments?.[0] ?? null;
  const anamnesis = input.anamnesis;

  const source =
    input.liveMetrics != null
      ? {
          id: "live",
          assessed_at: new Date().toISOString().slice(0, 10),
          weight_kg: input.liveMetrics.weightKg,
          height_cm: input.liveMetrics.heightCm,
          body_fat_pct: input.liveMetrics.bodyFatPct,
          lean_mass_kg: input.liveMetrics.leanMassKg,
          measurements: {
            circumferences: input.liveMetrics.circumferences,
            skinfolds: input.liveMetrics.skinfolds,
          },
          photos: null,
          notes: null,
        }
      : latestAssessment ??
        (anamnesis
          ? {
              id: "anamnesis-baseline",
              assessed_at: anamnesis.assessed_at,
              weight_kg: Number(anamnesis.weight_kg),
              height_cm: Number(anamnesis.height_cm),
              body_fat_pct: anamnesis.body_fat_pct != null ? Number(anamnesis.body_fat_pct) : null,
              lean_mass_kg: anamnesis.lean_mass_kg != null ? Number(anamnesis.lean_mass_kg) : null,
              measurements: anamnesis.measurements ?? null,
              photos: null,
              notes: null,
            }
          : null);

  if (!source?.weight_kg || !source.height_cm) return null;

  const sex = (input.sex ?? anamnesis?.sex ?? "M") as Sex;
  const age = input.age ?? anamnesis?.age;
  const metrics = buildAssessmentMetrics(source as Assessment, { sex, age });

  return buildBodyProfile({
    sex,
    metrics,
    injuries: input.injuries ?? anamnesis?.injuries,
    painOrLimitations: input.painOrLimitations ?? anamnesis?.pain_or_limitations,
  });
}

export function bodyProfileSourceLabel(input: {
  assessments?: Assessment[];
  fromLive?: boolean;
}): string {
  if (input.fromLive) return "Prévia dos dados atuais";
  const latest = input.assessments?.[0];
  if (latest) {
    return `Última avaliação · ${new Date(latest.assessed_at.includes("T") ? latest.assessed_at : `${latest.assessed_at}T12:00:00`).toLocaleDateString("pt-BR")}`;
  }
  return "Dados da anamnese";
}
