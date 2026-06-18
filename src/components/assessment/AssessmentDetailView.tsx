import { Scale } from "lucide-react";
import {
  buildAssessmentMetrics,
  CIRCUMFERENCE_FIELDS,
  SKINFOLD_FIELDS,
  assessmentOrdinal,
  formatAssessmentDate,
  formatAssessmentNumber,
  formatHeight,
  sortAssessmentsOldestFirst,
  type AssessmentMetrics,
} from "@/lib/anthropometry";
import type { Sex } from "@/lib/nutrition-calculator";
import type { Assessment } from "@/lib/tracking";

type Props = {
  assessment: Assessment;
  assessments: Assessment[];
  sex?: Sex;
  age?: number;
  onClose?: () => void;
};

export function AssessmentDetailView({ assessment, assessments, sex = "M", age, onClose }: Props) {
  const metrics = buildAssessmentMetrics(assessment, { sex, age });
  const sorted = sortAssessmentsOldestFirst(assessments);
  const index = sorted.findIndex((a) => a.id === assessment.id);
  const title = index >= 0 ? assessmentOrdinal(sorted.length, index) : "Avaliação Física";

  return (
    <div className="rounded-t-3xl bg-card border-t border-border max-h-[85vh] overflow-y-auto">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold">{title}</p>
            <p className="text-xs text-muted-foreground">{formatAssessmentDate(metrics.assessedAt)}</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="text-sm font-bold text-primary">
              Fechar
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-5 pb-8">
        <SummaryHeader metrics={metrics} />

        <DetailSection title="Detalhamento">
          <DetailRow label="Peso" value={metrics.weightKg != null ? `${formatAssessmentNumber(metrics.weightKg)} kg` : "—"} />
          <DetailRow label="Altura" value={formatHeight(metrics.heightCm)} />
          <DetailRow
            label="IMC"
            value={metrics.bmi != null ? `${formatAssessmentNumber(metrics.bmi)} kg/m²` : "—"}
            badge={metrics.bmiStatus}
          />
          <DetailRow
            label="% Massa Gorda"
            value={metrics.bodyFatPct != null ? `${formatAssessmentNumber(metrics.bodyFatPct)}%` : "—"}
            badge={metrics.bodyFatStatus}
            badgeTone="warning"
          />
          <DetailRow
            label="% Massa Magra"
            value={metrics.leanMassPct != null ? `${formatAssessmentNumber(metrics.leanMassPct)}%` : "—"}
            badge={metrics.leanMassStatus}
          />
          <DetailRow
            label="Massa Gorda (kg)"
            value={metrics.fatMassKg != null ? `${formatAssessmentNumber(metrics.fatMassKg)} kg` : "—"}
            badge={metrics.bodyFatStatus}
            badgeTone="warning"
          />
          <DetailRow
            label="Massa Magra (kg)"
            value={metrics.leanMassKg != null ? `${formatAssessmentNumber(metrics.leanMassKg)} kg` : "—"}
          />
          <DetailRow
            label="Razão cintura/quadril"
            value={metrics.waistHipRatio != null ? formatAssessmentNumber(metrics.waistHipRatio) : "—"}
            badge={metrics.waistHipRisk}
            badgeTone="warning"
          />
          {metrics.bodyDensity != null && (
            <DetailRow label="Densidade corporal" value={formatAssessmentNumber(metrics.bodyDensity)} />
          )}
          {metrics.skinfoldSum != null && (
            <DetailRow label="Soma de dobras" value={`${formatAssessmentNumber(metrics.skinfoldSum)} mm`} />
          )}
        </DetailSection>

        {hasCircumferences(metrics) && (
          <DetailSection title="Circunferências">
            {CIRCUMFERENCE_FIELDS.map((field) => {
              const value = metrics.circumferences[field.key];
              if (value == null) return null;
              return (
                <DetailRow
                  key={field.key}
                  label={field.label}
                  value={`${formatAssessmentNumber(value)} cm`}
                />
              );
            })}
          </DetailSection>
        )}

        {hasSkinfolds(metrics) && (
          <DetailSection title="Dobras Cutâneas">
            {SKINFOLD_FIELDS.map((field) => {
              const value = metrics.skinfolds[field.key];
              if (value == null) return null;
              return (
                <DetailRow
                  key={field.key}
                  label={field.label}
                  value={`${formatAssessmentNumber(value)} mm`}
                />
              );
            })}
          </DetailSection>
        )}

        {metrics.notes?.trim() && (
          <DetailSection title="Observações">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap px-1">{metrics.notes}</p>
          </DetailSection>
        )}
      </div>
    </div>
  );
}

function SummaryHeader({ metrics }: { metrics: AssessmentMetrics }) {
  const leanPct = metrics.leanMassPct ?? 0;
  const fatPct = metrics.bodyFatPct ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Scale className="size-7" />
        </div>
        <div className="flex-1 space-y-2">
          <Bar label="Massa Magra" pct={leanPct} tone="primary" />
          <Bar label="Massa Gorda" pct={fatPct} tone="danger" />
        </div>
      </div>
    </div>
  );
}

function Bar({ label, pct, tone }: { label: string; pct: number; tone: "primary" | "danger" }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold mb-1">
        <span>{label}</span>
        <span>{formatAssessmentNumber(pct)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${tone === "primary" ? "bg-primary" : "bg-destructive/70"}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-bold mb-2">{title}</p>
      <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  badge,
  badgeTone = "neutral",
}: {
  label: string;
  value: string;
  badge?: string | null;
  badgeTone?: "neutral" | "warning";
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-card">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-bold">{value}</span>
        {badge && (
          <span
            className={`block mt-0.5 text-[10px] font-bold ${
              badgeTone === "warning" ? "text-destructive" : "text-primary"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function hasCircumferences(metrics: AssessmentMetrics) {
  return CIRCUMFERENCE_FIELDS.some((f) => metrics.circumferences[f.key] != null);
}

function hasSkinfolds(metrics: AssessmentMetrics) {
  return SKINFOLD_FIELDS.some((f) => metrics.skinfolds[f.key] != null);
}
