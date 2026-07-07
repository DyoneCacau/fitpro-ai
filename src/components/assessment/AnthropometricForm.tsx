import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, Loader2 } from "lucide-react";
import {
  buildAssessmentMetrics,
  CIRCUMFERENCE_FIELDS,
  formMapsFromAssessment,
  initFormMaps,
  measurementsFromForm,
  SKINFOLD_FIELDS,
  formatAssessmentNumber,
  formatHeight,
} from "@/lib/anthropometry";
import {
  CompactBlockField,
  CompactMetricField,
  CompactMetricGrid,
  CompactSectionLabel,
  compactInputClass,
  compactTextareaClass,
} from "@/components/forms/CompactFormFields";
import type { Sex } from "@/lib/nutrition-calculator";
import type { Assessment } from "@/lib/tracking";
import { fetchStudentAnamnesisContext } from "@/lib/tracking";

type Props = {
  alunoId: string;
  personalId: string;
  assessment?: Assessment;
  onSubmit: (payload: {
    assessedAt: string;
    weightKg: number | null;
    heightCm: number | null;
    bodyFatPct: number | null;
    leanMassKg: number | null;
    measurements: ReturnType<typeof measurementsFromForm>;
    notes: string | null;
  }) => Promise<void>;
  saving?: boolean;
  onCancel?: () => void;
};

export function AnthropometricForm({
  alunoId,
  personalId,
  assessment,
  onSubmit,
  saving,
  onCancel,
}: Props) {
  const isEditing = !!assessment;
  const today = new Date().toISOString().slice(0, 10);
  const [assessedAt, setAssessedAt] = useState(assessment?.assessed_at.slice(0, 10) ?? today);
  const [weight, setWeight] = useState(
    assessment?.weight_kg != null ? String(assessment.weight_kg) : "",
  );
  const [height, setHeight] = useState(
    assessment?.height_cm != null ? String(assessment.height_cm) : "",
  );
  const [bodyFat, setBodyFat] = useState(
    assessment?.body_fat_pct != null ? String(assessment.body_fat_pct) : "",
  );
  const [notes, setNotes] = useState(assessment?.notes ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [{ circumferences, skinfolds }, setMaps] = useState(() =>
    assessment ? formMapsFromAssessment(assessment) : initFormMaps(),
  );

  const { data: anamnesis } = useQuery({
    queryKey: ["anamnesisContext", alunoId],
    queryFn: () => fetchStudentAnamnesisContext(alunoId, personalId),
  });

  useEffect(() => {
    if (!anamnesis?.height_cm) return;
    setHeight((current) => current || String(anamnesis.height_cm));
  }, [anamnesis?.height_cm]);

  useEffect(() => {
    if (!anamnesis?.weight_kg) return;
    setWeight((current) => current || String(anamnesis.weight_kg));
  }, [anamnesis?.weight_kg]);

  const sex = (anamnesis?.sex as Sex | undefined) ?? "M";
  const age = anamnesis?.age ?? undefined;

  const preview = useMemo(() => {
    const measurements = measurementsFromForm(circumferences, skinfolds);
    return buildAssessmentMetrics(
      {
        id: "preview",
        assessed_at: assessedAt,
        weight_kg: weight ? Number(weight.replace(",", ".")) : null,
        height_cm: height ? Number(height.replace(",", ".")) : null,
        body_fat_pct: bodyFat ? Number(bodyFat.replace(",", ".")) : null,
        lean_mass_kg: null,
        measurements,
        photos: null,
        notes: null,
      },
      { sex, age },
    );
  }, [assessedAt, weight, height, bodyFat, circumferences, skinfolds, sex, age]);

  function setCircumference(key: keyof typeof circumferences, value: string) {
    setMaps((prev) => ({ ...prev, circumferences: { ...prev.circumferences, [key]: value } }));
  }

  function setSkinfold(key: keyof typeof skinfolds, value: string) {
    setMaps((prev) => ({ ...prev, skinfolds: { ...prev.skinfolds, [key]: value } }));
  }

  function parseDecimal(value: string): number | null {
    const trimmed = value.trim().replace(",", ".");
    if (!trimmed) return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);

    const weightNum = parseDecimal(weight);
    const heightNum = parseDecimal(height);

    if (weightNum == null || heightNum == null) {
      setSaveError("Informe peso e altura válidos para salvar a avaliação.");
      return;
    }

    const measurements = measurementsFromForm(circumferences, skinfolds);
    const metrics = buildAssessmentMetrics(
      {
        id: "preview",
        assessed_at: assessedAt,
        weight_kg: weightNum,
        height_cm: heightNum,
        body_fat_pct: bodyFat ? parseDecimal(bodyFat) : null,
        lean_mass_kg: null,
        measurements,
        photos: null,
        notes: null,
      },
      { sex, age },
    );

    try {
      await onSubmit({
        assessedAt,
        weightKg: weightNum,
        heightCm: heightNum,
        bodyFatPct: metrics.bodyFatPct,
        leanMassKg: metrics.leanMassKg,
        measurements,
        notes: notes.trim() || null,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Não foi possível salvar a avaliação.");
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "TEXTAREA" || tag === "BUTTON") return;
        e.preventDefault();
      }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border bg-primary/5">
        <p className="text-sm font-bold">
          {isEditing ? "Editar avaliação antropométrica" : "Nova avaliação antropométrica"}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {isEditing
            ? "Corrija os dados e clique em Salvar alterações. Enter nos campos não envia o formulário."
            : "Preencha os campos como no Dietbox. Use o botão abaixo para salvar — Enter não envia."}
        </p>
      </div>

      <div className="p-3 space-y-3">
        <CompactSectionLabel>Dados gerais</CompactSectionLabel>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0 sm:grid-cols-4">
          <CompactBlockField label="Data">
            <input
              type="date"
              value={assessedAt}
              onChange={(e) => setAssessedAt(e.target.value)}
              className={`${compactInputClass} text-left`}
            />
          </CompactBlockField>
          <CompactBlockField label="Peso (kg)">
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
              className={compactInputClass}
            />
          </CompactBlockField>
          <CompactBlockField label="Altura (cm)">
            <input
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              inputMode="decimal"
              className={compactInputClass}
            />
          </CompactBlockField>
          <CompactBlockField label="% Gordura" hint="Calc. pelas dobras">
            <input
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              inputMode="decimal"
              placeholder="—"
              className={compactInputClass}
            />
          </CompactBlockField>
        </div>

        <CompactSectionLabel>Circunferências (cm)</CompactSectionLabel>
        <CompactMetricGrid>
          {CIRCUMFERENCE_FIELDS.map((field) => (
            <CompactMetricField key={field.key} label={field.label}>
              <input
                value={circumferences[field.key]}
                onChange={(e) => setCircumference(field.key, e.target.value)}
                inputMode="decimal"
                className={compactInputClass}
              />
            </CompactMetricField>
          ))}
        </CompactMetricGrid>

        <CompactSectionLabel>Dobras cutâneas (mm)</CompactSectionLabel>
        <CompactMetricGrid>
          {SKINFOLD_FIELDS.map((field) => (
            <CompactMetricField key={field.key} label={field.label}>
              <input
                value={skinfolds[field.key]}
                onChange={(e) => setSkinfold(field.key, e.target.value)}
                inputMode="decimal"
                className={compactInputClass}
              />
            </CompactMetricField>
          ))}
        </CompactMetricGrid>

        <CompactBlockField label="Observações">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={compactTextareaClass}
          />
        </CompactBlockField>

        {(preview.bmi != null || preview.bodyFatPct != null) && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 space-y-1">
            <div className="flex items-center gap-1.5 text-primary">
              <Calculator className="size-3.5" />
              <p className="text-[10px] font-bold">Prévia</p>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
              {preview.bmi != null && (
                <PreviewRow label="IMC" value={`${formatAssessmentNumber(preview.bmi)} · ${preview.bmiStatus}`} />
              )}
              {preview.bodyFatPct != null && (
                <PreviewRow label="% Gordura" value={`${formatAssessmentNumber(preview.bodyFatPct)}%`} />
              )}
              {preview.fatMassKg != null && (
                <PreviewRow label="Massa gorda" value={`${formatAssessmentNumber(preview.fatMassKg)} kg`} />
              )}
              {preview.leanMassKg != null && (
                <PreviewRow label="Massa magra" value={`${formatAssessmentNumber(preview.leanMassKg)} kg`} />
              )}
              {preview.leanMassPct != null && (
                <PreviewRow label="% Massa magra" value={`${formatAssessmentNumber(preview.leanMassPct)}%`} />
              )}
              {preview.waistHipRatio != null && (
                <PreviewRow
                  label="Cintura/quadril"
                  value={`${formatAssessmentNumber(preview.waistHipRatio)} · ${preview.waistHipRisk}`}
                />
              )}
              {preview.bodyDensity != null && (
                <PreviewRow label="Densidade corporal" value={formatAssessmentNumber(preview.bodyDensity)} />
              )}
              {preview.skinfoldSum != null && (
                <PreviewRow label="Soma dobras" value={`${formatAssessmentNumber(preview.skinfoldSum)} mm`} />
              )}
              {preview.heightCm != null && (
                <PreviewRow label="Altura" value={formatHeight(preview.heightCm)} />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 space-y-2">
        {saveError && (
          <p className="text-xs text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            {saveError}
          </p>
        )}
        <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-primary text-primary-foreground py-2 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Salvando…
            </span>
          ) : isEditing ? (
            "Salvar alterações"
          ) : (
            "Registrar avaliação"
          )}
        </button>
        </div>
      </div>
    </form>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}
