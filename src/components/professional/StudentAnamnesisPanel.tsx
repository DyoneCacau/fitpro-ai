import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Calculator, Loader2, Save } from "lucide-react";
import { ExportAnamnesisPdfButton } from "@/components/assessment/ExportAnamnesisPdfButton";
import { AnamnesisComparativePreview } from "@/components/assessment/AnamnesisComparativePreview";
import {
  fetchStudentAnamnesis,
  saveStudentAnamnesis,
  type AnamnesisRow,
} from "@/lib/anamnesis";
import { fetchStudentAssessments } from "@/lib/tracking";
import {
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  calculateNutritionPlan,
  type ActivityLevel,
  type FitnessGoal,
  type Sex,
} from "@/lib/nutrition-calculator";

interface Props {
  alunoId: string;
  personalId: string;
  studentName?: string;
}

type FormState = {
  sex: Sex;
  age: string;
  weightKg: string;
  heightCm: string;
  activity: ActivityLevel;
  goal: FitnessGoal;
  restrictions: string;
  clinicalNotes: string;
};

const DEFAULT_FORM: FormState = {
  sex: "M",
  age: "28",
  weightKg: "75",
  heightCm: "175",
  activity: "moderado",
  goal: "ganho_massa",
  restrictions: "",
  clinicalNotes: "",
};

function formFromAnamnesis(row: AnamnesisRow): FormState {
  return {
    sex: row.sex as Sex,
    age: String(row.age),
    weightKg: String(row.weight_kg),
    heightCm: String(row.height_cm),
    activity: row.activity_level as ActivityLevel,
    goal: row.goal as FitnessGoal,
    restrictions: row.restrictions ?? "",
    clinicalNotes: row.clinical_notes ?? "",
  };
}

function parseForm(form: FormState) {
  const age = Number(form.age);
  const weightKg = Number(form.weightKg.replace(",", "."));
  const heightCm = Number(form.heightCm.replace(",", "."));
  if (!Number.isFinite(age) || age <= 0) return null;
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  return { age, weightKg, heightCm };
}

export function StudentAnamnesisPanel({ alunoId, studentName }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["anamnesis", alunoId],
    queryFn: () => fetchStudentAnamnesis(alunoId),
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ["proAssessments", alunoId],
    queryFn: () => fetchStudentAssessments(alunoId),
  });

  useEffect(() => {
    if (existing) setForm(formFromAnamnesis(existing));
  }, [existing]);

  const parsed = useMemo(() => parseForm(form), [form]);

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      setValidationError(null);
      if (!parsed || !preview) {
        throw new Error("Preencha idade, peso e altura com valores válidos.");
      }

      await saveStudentAnamnesis({
        alunoId,
        sex: form.sex,
        age: parsed.age,
        weightKg: parsed.weightKg,
        heightCm: parsed.heightCm,
        activity: form.activity,
        goal: form.goal,
        restrictions: form.restrictions,
        clinicalNotes: form.clinicalNotes,
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

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
  }

  if (isLoading) {
    return <Loader2 className="size-6 animate-spin text-primary mx-auto mt-8" />;
  }

  const saveError = validationError ?? (saveMutation.error instanceof Error ? saveMutation.error.message : null);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-primary" />
            <h3 className="font-semibold">Anamnese e calculadora</h3>
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Sexo">
            <select
              value={form.sex}
              onChange={(e) => updateField("sex", e.target.value as Sex)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </Field>
          <Field label="Idade">
            <input
              type="number"
              value={form.age}
              onChange={(e) => updateField("age", e.target.value)}
              className="field-input"
            />
          </Field>
          <Field label="Peso (kg)">
            <input
              type="number"
              value={form.weightKg}
              onChange={(e) => updateField("weightKg", e.target.value)}
              className="field-input"
            />
          </Field>
          <Field label="Altura (cm)">
            <input
              type="number"
              value={form.heightCm}
              onChange={(e) => updateField("heightCm", e.target.value)}
              className="field-input"
            />
          </Field>
        </div>

        <Field label="Nível de atividade">
          <select
            value={form.activity}
            onChange={(e) => updateField("activity", e.target.value as ActivityLevel)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1"
          >
            {ACTIVITY_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Objetivo">
          <select
            value={form.goal}
            onChange={(e) => updateField("goal", e.target.value as FitnessGoal)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1"
          >
            {GOAL_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Restrições alimentares">
          <textarea
            value={form.restrictions}
            onChange={(e) => updateField("restrictions", e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1"
            placeholder="Alergias, intolerâncias..."
          />
        </Field>

        <Field label="Observações clínicas">
          <textarea
            value={form.clinicalNotes}
            onChange={(e) => updateField("clinicalNotes", e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1"
            placeholder="Lesões, medicamentos, histórico..."
          />
        </Field>
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

      <button
        type="button"
        disabled={saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50"
      >
        {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Salvar anamnese e aplicar ao plano alimentar
      </button>

      {existing && (
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
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
      {children}
    </div>
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
