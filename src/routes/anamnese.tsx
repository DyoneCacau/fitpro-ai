import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Calculator, ChevronLeft, Loader2, Save } from "lucide-react";
import { AnamnesisFormSections } from "@/components/anamnesis/AnamnesisFormSections";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import {
  anamnesisRowToForm,
  DEFAULT_ANAMNESIS_FORM,
  fetchStudentAnamnesis,
  saveAnamnesisAsStudent,
} from "@/lib/anamnesis";
import { parseAnamnesisMetrics, parseOptionalBodyFat, type AnamnesisFormState } from "@/lib/anamnesis-form";
import { buildAssessmentMetrics, measurementsFromForm, type CircumferenceKey, type SkinfoldKey } from "@/lib/anthropometry";
import { calculateNutritionPlan } from "@/lib/nutrition-calculator";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/anamnese")({
  head: () => ({ meta: [{ title: "Anamnese — FitPro AI" }] }),
  component: () => (
    <AuthGate allowedRoles={["aluno"]}>
      <AnamnesePage />
    </AuthGate>
  ),
});

function AnamnesePage() {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<AnamnesisFormState>(DEFAULT_ANAMNESIS_FORM);
  const [error, setError] = useState<string | null>(null);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["anamnesis", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchStudentAnamnesis(user!.id),
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
  }, [form, parsed]);

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

  const save = useMutation({
    mutationFn: async () => {
      if (!parsed || !preview) throw new Error("Preencha idade, peso e altura válidos.");
      await saveAnamnesisAsStudent({
        form,
        age: parsed.age,
        weightKg: parsed.weightKg,
        heightCm: parsed.heightCm,
        nutrition: preview,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["anamnesis", user?.id] });
      router.navigate({ to: "/" });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Erro ao salvar."),
  });

  function updateField<K extends keyof AnamnesisFormState>(key: K, value: AnamnesisFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function updateCircumference(key: CircumferenceKey, value: string) {
    setForm((prev) => ({
      ...prev,
      circumferences: { ...prev.circumferences, [key]: value },
    }));
    setError(null);
  }

  function updateSkinfold(key: SkinfoldKey, value: string) {
    setForm((prev) => ({
      ...prev,
      skinfolds: { ...prev.skinfolds, [key]: value },
    }));
    setError(null);
  }

  return (
    <AppShell>
      <header className="bg-gradient-hero px-4 pt-10 pb-5 border-b border-border">
        <button
          type="button"
          onClick={() => router.navigate({ to: "/" })}
          className="absolute left-4 top-10 flex size-9 items-center justify-center rounded-full border border-border bg-card/80"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex items-center justify-center gap-2">
          <Calculator className="size-5 text-primary" />
          <h1 className="text-base font-black">Anamnese</h1>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2 px-6">
          Formulário solicitado pelo seu profissional · visão 360º do seu perfil
        </p>
      </header>

      <div className="px-5 py-5 pb-10 space-y-4">
        {isLoading ? (
          <Loader2 className="size-6 animate-spin text-primary mx-auto" />
        ) : (
          <>
            <AnamnesisFormSections
              form={form}
              onChange={updateField}
              onCircumferenceChange={updateCircumference}
              onSkinfoldChange={updateSkinfold}
              anthropometryPreview={anthropometryPreview}
              compact
            />

            {preview && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
                <p className="font-bold text-primary mb-2">Metas calculadas</p>
                <p>
                  {Math.round(preview.kcalTarget)} kcal · P {preview.proteinG}g · C {preview.carbsG}g · G{" "}
                  {preview.fatG}g
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="size-3.5" /> {error}
              </p>
            )}

            <button
              type="button"
              disabled={save.isPending || !parsed}
              onClick={() => save.mutate()}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground disabled:opacity-50"
            >
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Enviar anamnese
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}
