import {
  buildAssessmentMetrics,
  buildComparativeSections,
  formatAssessmentDate,
} from "@/lib/anthropometry";
import { resolveAnamnesisComparativePair } from "@/lib/assessment-comparative";
import {
  ComparativeReportTable,
  comparativeTableProps,
} from "@/components/assessment/ComparativeReportTable";
import type { AnamnesisRow } from "@/lib/anamnesis";
import type { Sex } from "@/lib/nutrition-calculator";
import type { Assessment } from "@/lib/tracking";

type Props = {
  anamnesis: AnamnesisRow;
  assessments: Assessment[];
  studentName?: string;
  sex: Sex;
  age?: number;
};

export function AnamnesisComparativePreview({
  anamnesis,
  assessments,
  studentName,
  sex,
  age,
}: Props) {
  const pair = resolveAnamnesisComparativePair(anamnesis, assessments);
  if (!pair) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Cadastre ao menos uma avaliação antropométrica em Acomp. para ver o comparativo aqui e no PDF.
      </p>
    );
  }

  const beforeMetrics = buildAssessmentMetrics(pair.before, { sex, age });
  const afterMetrics = buildAssessmentMetrics(pair.after, { sex, age });
  const sections = buildComparativeSections(beforeMetrics, afterMetrics);
  const beforeDate =
    pair.before.id === "anamnesis-baseline"
      ? "Anamnese"
      : formatAssessmentDate(pair.before.assessed_at);

  return (
    <div className="space-y-2">
      {pair.before.id === "anamnesis-baseline" && (
        <p className="text-[10px] text-muted-foreground text-center">
          Comparativo entre anamnese e última avaliação antropométrica.
        </p>
      )}
      <ComparativeReportTable
        {...comparativeTableProps(pair.before.assessed_at, pair.after.assessed_at, sections, studentName)}
        beforeDate={beforeDate}
      />
    </div>
  );
}
