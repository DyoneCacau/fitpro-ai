import { sortAssessmentsOldestFirst } from "@/lib/anthropometry";
import type { AnamnesisRow } from "@/lib/anamnesis";
import type { Assessment } from "@/lib/tracking";

/** Compara a avaliação selecionada (ou a mais recente) com a imediatamente anterior. */
export function pickComparativePair(assessments: Assessment[], selected?: Assessment) {
  const sorted = sortAssessmentsOldestFirst(assessments);
  if (sorted.length < 2) return null;

  const after = selected ?? sorted[sorted.length - 1];
  const afterIndex = sorted.findIndex((a) => a.id === after.id);
  if (afterIndex <= 0) return null;

  return { before: sorted[afterIndex - 1], after };
}

/** Penúltima vs última avaliação — ideal para exportação. */
export function pickLatestComparativePair(assessments: Assessment[]) {
  const sorted = sortAssessmentsOldestFirst(assessments);
  if (sorted.length < 2) return null;
  return {
    before: sorted[sorted.length - 2],
    after: sorted[sorted.length - 1],
  };
}

/** Anamnese × última avaliação, ou penúltima × última quando houver histórico. */
export function resolveAnamnesisComparativePair(
  anamnesis: AnamnesisRow,
  assessments: Assessment[],
): { before: Assessment; after: Assessment } | null {
  if (assessments.length >= 2) {
    return pickLatestComparativePair(assessments);
  }

  if (assessments.length === 1) {
    const after = sortAssessmentsOldestFirst(assessments)[0];
    const before: Assessment = {
      id: "anamnesis-baseline",
      assessed_at: anamnesis.assessed_at,
      weight_kg: Number(anamnesis.weight_kg),
      height_cm: Number(anamnesis.height_cm),
      body_fat_pct: null,
      lean_mass_kg: null,
      measurements: null,
      photos: null,
      notes: null,
    };
    return { before, after };
  }

  return null;
}
