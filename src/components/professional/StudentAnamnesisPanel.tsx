import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Calculator, Loader2, Save, Send } from "lucide-react";
import { AnamnesisFormSections } from "@/components/anamnesis/AnamnesisFormSections";
import { ExportAnamnesisPdfButton } from "@/components/assessment/ExportAnamnesisPdfButton";
import { AnamnesisComparativePreview } from "@/components/assessment/AnamnesisComparativePreview";
import { BodyProfileMap } from "@/components/assessment/BodyProfileMap";
import {
  anamnesisRowToForm,
  DEFAULT_ANAMNESIS_FORM,
  fetchStudentAnamnesis,
  saveStudentAnamnesis,
} from "@/lib/anamnesis";
import { bodyProfileSourceLabel, resolveBodyProfileInput } from "@/lib/body-profile-source";
import { parseAnamnesisMetrics, parseOptionalBodyFat, type AnamnesisFormState } from "@/lib/anamnesis-form";
import { fetchStudentAssessments } from "@/lib/tracking";
import { buildAssessmentMetrics, measurementsFromForm, type CircumferenceKey, type SkinfoldKey } from "@/lib/anthropometry";
import { calculateNutritionPlan } from "@/lib/nutrition-calculator";
import { notifyAnamnesisRequest } from "@/lib/notifications";
import { useDisplayName } from "@/hooks/use-display-name";

interface Props {
  alunoId: string;
  personalId: string;
  studentName?: string;
}

export function StudentAnamnesisPanel({ alunoId, personalId, studentName }: Props) {
  const qc = useQueryClient();
  const { firstName } = useDisplayName("Profissional");
  const [form, setForm] = useState<AnamnesisFormState>(DEFAULT_ANAMNESIS_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [tab, setTab] = useState<"form" | "comparativo">("form");

  const { data: existing, isLoading } = useQuery({
    queryKey: ["anamnesis", alunoId],
    queryFn: () => fetchStudentAnamnesis(alunoId),
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ["proAssessments", alunoId],
    queryFn: () => fetchStudentAssessments(alunoId),
  });

  useEffect(() => {
    if (existing) setForm(anamnesisRowToForm(existing));
  }, [existing]);

  const parsed = useMemo(() => parseAnamnesisMetrics(form), [form]);

  const preview = useMemo(() => {
    if (!parsed) return null;
    return calculateNutritionPlan({
      sex: form.sex,
      age: parsed.age,
      weightKg: parsed.weightKg,
      heightCm: parsed.heightCm,
      activity: form.activity,
      goal: form.goal,
    });
  }, [form.sex, form.activity, form.goal, parsed]);

  const anthropometryPreview = useMemo(() => {
    if (!parsed) return null;
    return buildAssessmentMetrics(
      {
        id: "preview",
        assessed_at: new Date().toISOString().slice(0, 10),
        weight_kg: parsed.weightKg,
        height_cm: parsed.heightCm,
        body_fat_pct: parseOptionalBodyFat(form.bodyFatPct),
        lean_mass_kg: null,
        measurements: measurementsFromForm(form.circumferences, form.skinfolds),
        photos: null,
        notes: null,
      },
      { sex: form.sex, age: parsed.age },
    );
  }, [form, parsed]);

  const bodyProfile = useMemo(() => {
    if (!parsed || !anthropometryPreview) return null;
    return resolveBodyProfileInput({
      sex: form.sex,
      age: parsed.age,
      anamnesis: existing ?? null,
      assessments,
      liveMetrics: anthropometryPreview,
      injuries: form.injuries,
      painOrLimitations: form.painOrLimitations,
    });
  }, [form, parsed, anthropometryPreview, existing, assessments]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setValidationError(null);
      if (!parsed || !preview) {
        throw new Error("Preencha idade, peso e altura com valores válidos.");
      }

      await saveStudentAnamnesis({
        alunoId,
        form,
        age: parsed.age,
        weightKg: parsed.weightKg,
        heightCm: parsed.heightCm,
        nutrition: preview,
      });
    },
    onSuccess: () => {
      setValidationError(null);
      void qc.invalidateQueries({ queryKey: ["anamnesis", alunoId] });
      void qc.invalidateQueries({ queryKey: ["anamnesisContext", alunoId] });
      void qc.invalidateQueries({ queryKey: ["studentDietPlan", alunoId] });
    },
    onError: (err: Error) => setValidationError(err.message),
  });

  const requestFill = useMutation({
    mutationFn: () => notifyAnamnesisRequest(alunoId, firstName),
  });

  function updateField<K extends keyof AnamnesisFormState>(key: K, value: AnamnesisFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
  }

  function updateCircumference(key: CircumferenceKey, value: string) {
    setForm((prev) => ({
      ...prev,
      circumferences: { ...prev.circumferences, [key]: value },
    }));
    setValidationError(null);
  }

  function updateSkinfold(key: SkinfoldKey, value: string) {
    setForm((prev) => ({
      ...prev,
      skinfolds: { ...prev.skinfolds, [key]: value },
    }));
    setValidationError(null);
  }

  if (isLoading) {
    return <Loader2 className="size-6 animate-spin text-primary mx-auto mt-8" />;
  }

  const saveError = validationError ?? (saveMutation.error instanceof Error ? saveMutation.error.message : null);
  const savedOk = saveMutation.isSuccess && !saveMutation.isPending && !saveMutation.isError;

  return (
    <div className="space-y-4">
      {bodyProfile && (
        <BodyProfileMap
          profile={bodyProfile}
          bmr={preview?.bmr}
          sourceLabel={bodyProfileSourceLabel({
            assessments,
            fromLive: true,
          })}
        />
      )}

      <div className="flex gap-2 rounded-xl border border-border bg-card p-1">
        <TabButton active={tab === "form"} onClick={() => setTab("form")}>
          Anamnese
        </TabButton>
        <TabButton
          active={tab === "comparativo"}
          onClick={() => setTab("comparativo")}
          disabled={!existing}
        >
          Comparativo
        </TabButton>
      </div>

      {tab === "form" && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Calculator className="size-5 text-primary" />
                <h3 className="font-semibold">Anamnese completa</h3>
              </div>
              <ExportAnamnesisPdfButton
                anamnesis={existing}
                assessments={assessments}
                studentName={studentName}
                sex={form.sex}
                age={parsed?.age}
                label="Exportar PDF"
              />
            </div>

            <button
              type="button"
              disabled={requestFill.isPending}
              onClick={() => requestFill.mutate()}
              className="mb-4 w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-xs font-bold text-primary"
            >
              {requestFill.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Solicitar preenchimento via formulário (aluno)
            </button>
            {requestFill.isSuccess && (
              <p className="text-[10px] text-emerald-600 font-semibold mb-3 -mt-2">
                Notificação enviada ao aluno com link para /anamnese
              </p>
            )}

            <AnamnesisFormSections
              form={form}
              onChange={updateField}
              onCircumferenceChange={updateCircumference}
              onSkinfoldChange={updateSkinfold}
              anthropometryPreview={anthropometryPreview}
            />
          </div>

          {preview && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 grid grid-cols-2 gap-3 text-sm">
              <Stat label="TMB" value={`${preview.bmr} kcal`} />
              <Stat label="TDEE" value={`${preview.tdee} kcal`} />
              <Stat label="Meta calórica" value={`${preview.kcalTarget} kcal`} highlight />
              <Stat label="Proteína" value={`${preview.proteinG} g`} />
              <Stat label="Carboidratos" value={`${preview.carbsG} g`} />
              <Stat label="Gorduras" value={`${preview.fatG} g`} />
            </div>
          )}

          {saveError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {savedOk && (
            <p className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-emerald-600">
              <Save className="size-3.5" />
              {existing ? "Alterações salvas e aplicadas ao plano" : "Anamnese salva e aplicada ao plano"}
            </p>
          )}

          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="sticky bottom-3 z-10 w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-semibold shadow-lg disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {existing ? "Salvar alterações" : "Salvar anamnese"}
          </button>
        </>
      )}

      {tab === "comparativo" &&
        (existing ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Exame físico comparativo</h3>
            <AnamnesisComparativePreview
              anamnesis={existing}
              assessments={assessments}
              studentName={studentName}
              sex={form.sex}
              age={parsed?.age ?? existing.age}
            />
          </div>
        ) : (
          <p className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            Salve a anamnese na aba <span className="font-semibold">Anamnese</span> para gerar o comparativo do exame físico.
          </p>
        ))}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl p-3 ${highlight ? "bg-primary/15 border border-primary/30" : "bg-background/60 border border-border"}`}
    >
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-bold mt-0.5">{value}</p>
    </div>
  );
}
