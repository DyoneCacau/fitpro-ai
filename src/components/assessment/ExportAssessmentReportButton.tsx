import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadAssessmentReportPdf, downloadComparativeAssessmentPdf } from "@/lib/assessment-report-pdf";
import type { Sex } from "@/lib/nutrition-calculator";
import type { Assessment } from "@/lib/tracking";

type Props = {
  assessments: Assessment[];
  studentName?: string;
  sex?: Sex;
  age?: number;
  selected?: Assessment;
  before?: Assessment;
  after?: Assessment;
  label?: string;
  className?: string;
  variant?: "latest" | "pair";
};

export function ExportAssessmentReportButton({
  assessments,
  studentName,
  sex,
  age,
  selected,
  before,
  after,
  label,
  className = "",
  variant = "latest",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function exportPdf() {
    setLoading(true);
    try {
      if (variant === "pair" && before && after) {
        await downloadComparativeAssessmentPdf({ before, after, studentName, sex, age });
        return;
      }
      await downloadAssessmentReportPdf({
        assessments,
        studentName,
        sex,
        age,
        selected,
      });
    } finally {
      setLoading(false);
    }
  }

  const disabled =
    loading ||
    (variant === "pair" ? !before || !after : assessments.length === 0);

  return (
    <button
      type="button"
      onClick={() => void exportPdf()}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] font-bold text-primary disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      {label ?? "Exportar PDF"}
    </button>
  );
}
