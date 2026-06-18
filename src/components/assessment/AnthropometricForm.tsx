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

      <div className="p-4 space-y-5">
        <section className="space-y-3">
          <SectionTitle>Dados gerais</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Data" type="date" value={assessedAt} onChange={setAssessedAt} />
            <Field label="Peso (kg)" value={weight} onChange={setWeight} inputMode="decimal" />
            <Field label="Altura (cm)" value={height} onChange={setHeight} inputMode="decimal" />
            <Field
              label="% Gordura (opcional)"
              value={bodyFat}
              onChange={setBodyFat}
              inputMode="decimal"
              hint="Calculado pelas dobras se vazio"
            />
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>Circunferências (cm)</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {CIRCUMFERENCE_FIELDS.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                value={circumferences[field.key]}
                onChange={(v) => setCircumference(field.key, v)}
                inputMode="decimal"
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>Dobras cutâneas (mm)</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {SKINFOLD_FIELDS.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                value={skinfolds[field.key]}
                onChange={(v) => setSkinfold(field.key, v)}
                inputMode="decimal"
              />
            ))}
          </div>
        </section>

        <section>
          <Field label="Observações" value={notes} onChange={setNotes} multiline />
        </section>

        {(preview.bmi != null || preview.bodyFatPct != null) && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Calculator className="size-4" />
              <p className="text-xs font-bold">Prévia calculada</p>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
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

      <div className="border-t border-border p-4 space-y-3">
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
          className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50"
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{children}</p>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field-input mt-1 min-h-[64px] text-xs"
        />
      ) : (
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field-input mt-1 text-xs"
        />
      )}
      {hint && <span className="text-[9px] text-muted-foreground">{hint}</span>}
    </label>
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
