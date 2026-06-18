import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadDietPlanPdf, type DietPdfScope } from "@/lib/diet-plan-pdf";
import type { DietPlan } from "@/lib/diet";

export function ExportDietPlanButton({
  plan,
  scope = "full",
  studentName,
  label,
  className = "",
}: {
  plan: DietPlan;
  scope?: DietPdfScope;
  studentName?: string;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function exportPdf() {
    setLoading(true);
    try {
      await downloadDietPlanPdf(plan, scope, studentName);
    } finally {
      setLoading(false);
    }
  }

  const defaultLabel =
    scope === "meals"
      ? "Exportar plano alimentar (PDF)"
      : scope === "supplements"
        ? "Exportar plano suplementar (PDF)"
        : "Exportar plano completo (PDF)";

  return (
    <button
      type="button"
      onClick={() => void exportPdf()}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      {label ?? defaultLabel}
    </button>
  );
}
