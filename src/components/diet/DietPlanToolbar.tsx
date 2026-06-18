import { useState } from "react";
import { BookOpen, ChevronDown, Copy, Download, Loader2 } from "lucide-react";
import { downloadDietPlanPdf, type DietPdfScope } from "@/lib/diet-plan-pdf";
import type { DietPlan } from "@/lib/diet";

const EXPORT_OPTIONS: { scope: DietPdfScope; label: string; hint: string }[] = [
  { scope: "full", label: "Plano completo", hint: "Alimentar + suplementos" },
  { scope: "meals", label: "Plano alimentar", hint: "Refeições e substituições" },
  { scope: "supplements", label: "Plano suplementar", hint: "Somente suplementos" },
];

export function DietPlanToolbar({
  plan,
  studentName,
  onApplyTemplate,
  onSaveTemplate,
  savingTemplate,
  showApplyTemplate = true,
  showSaveTemplate = true,
}: {
  plan: DietPlan;
  studentName?: string;
  onApplyTemplate: () => void;
  onSaveTemplate: () => void;
  savingTemplate?: boolean;
  showApplyTemplate?: boolean;
  showSaveTemplate?: boolean;
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const [loadingScope, setLoadingScope] = useState<DietPdfScope | null>(null);

  async function handleExport(scope: DietPdfScope) {
    setLoadingScope(scope);
    try {
      await downloadDietPlanPdf(plan, scope, studentName);
      setExportOpen(false);
    } finally {
      setLoadingScope(null);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExportOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
          <Download className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Exportar PDF</p>
          <p className="text-[10px] text-muted-foreground">Plano completo, alimentar ou suplementar</p>
        </div>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${exportOpen ? "rotate-180" : ""}`}
        />
      </button>

      {exportOpen && (
        <div className="border-t border-border divide-y divide-border bg-background/40">
          {EXPORT_OPTIONS.map((opt) => (
            <button
              key={opt.scope}
              type="button"
              disabled={!!loadingScope}
              onClick={() => void handleExport(opt.scope)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-primary/5 disabled:opacity-50"
            >
              <div>
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.hint}</p>
              </div>
              {loadingScope === opt.scope ? (
                <Loader2 className="size-4 animate-spin text-primary shrink-0" />
              ) : (
                <Download className="size-4 text-primary shrink-0 opacity-60" />
              )}
            </button>
          ))}
        </div>
      )}

      {(showApplyTemplate || showSaveTemplate) && (
      <div className={`border-t border-border ${showApplyTemplate && showSaveTemplate ? "grid grid-cols-2 divide-x divide-border" : ""}`}>
        {showApplyTemplate && (
          <button
            type="button"
            onClick={onApplyTemplate}
            className="flex items-center justify-center gap-2 px-3 py-3 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/20"
          >
            <BookOpen className="size-3.5" />
            Aplicar modelo
          </button>
        )}
        {showSaveTemplate && (
        <button
          type="button"
          onClick={onSaveTemplate}
          disabled={savingTemplate}
          className={`flex items-center justify-center gap-2 px-3 py-3 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/20 disabled:opacity-50 ${!showApplyTemplate ? "w-full" : ""}`}
        >
          {savingTemplate ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Copy className="size-3.5" />
          )}
          Salvar modelo
        </button>
        )}
      </div>
      )}
    </div>
  );
}
