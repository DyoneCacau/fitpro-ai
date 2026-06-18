import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { AnamnesisRow } from "@/lib/anamnesis";
import { downloadAnamnesisPdf } from "@/lib/anamnesis-pdf";
import type { Sex } from "@/lib/nutrition-calculator";
import type { Assessment } from "@/lib/tracking";

export function ExportAnamnesisPdfButton({
  anamnesis,
  assessments = [],
  studentName,
  sex,
  age,
  label = "Exportar PDF",
  className = "",
}: {
  anamnesis: AnamnesisRow | null | undefined;
  assessments?: Assessment[];
  studentName?: string;
  sex?: Sex;
  age?: number;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function exportPdf() {
    if (!anamnesis) return;
    setLoading(true);
    try {
      await downloadAnamnesisPdf({
        anamnesis,
        assessments,
        studentName,
        sex,
        age,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void exportPdf()}
      disabled={loading || !anamnesis}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] font-bold text-primary disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      {label}
    </button>
  );
}
