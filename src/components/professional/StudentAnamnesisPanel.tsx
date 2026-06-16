import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
}

export function StudentAnamnesisPanel({ alunoId, personalId }: Props) {
  const qc = useQueryClient();
  const [sex, setSex] = useState<Sex>("M");
  const [age, setAge] = useState("28");
  const [weightKg, setWeightKg] = useState("75");
  const [heightCm, setHeightCm] = useState("175");
  const [activity, setActivity] = useState<ActivityLevel>("moderado");
  const [goal, setGoal] = useState<FitnessGoal>("ganho_massa");
  const [restrictions, setRestrictions] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  const { data: existing, isLoading } = useQuery({
    queryKey: ["anamnesis", alunoId, personalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamnesis")
        .select("*")
        .eq("aluno_id", alunoId)
        .eq("personal_id", personalId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!existing) return;
    setSex(existing.sex as Sex);
    setAge(String(existing.age));
    setWeightKg(String(existing.weight_kg));
    setHeightCm(String(existing.height_cm));
    setActivity(existing.activity_level as ActivityLevel);
    setGoal(existing.goal as FitnessGoal);
    setRestrictions(existing.restrictions ?? "");
    setClinicalNotes(existing.clinical_notes ?? "");
  }, [existing]);

  const preview = useMemo(() => {
    const ageNum = Number(age);
    const weight = Number(weightKg);
    const height = Number(heightCm);
    if (!ageNum || !weight || !height) return null;
    return calculateNutritionPlan({
      sex,
      age: ageNum,
      weightKg: weight,
      heightCm: height,
      activity,
      goal,
    });
  }, [sex, age, weightKg, heightCm, activity, goal]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error("Preencha os dados da anamnese.");

      const payload = {
        aluno_id: alunoId,
        personal_id: personalId,
        sex,
        age: Number(age),
        weight_kg: Number(weightKg),
        height_cm: Number(heightCm),
        activity_level: activity,
        goal,
        bmr: preview.bmr,
        tdee: preview.tdee,
        kcal_target: preview.kcalTarget,
        protein_g: preview.proteinG,
        carbs_g: preview.carbsG,
        fat_g: preview.fatG,
        restrictions: restrictions.trim() || null,
        clinical_notes: clinicalNotes.trim() || null,
        is_active: true,
      };

      if (existing?.id) {
        const { error } = await supabase.from("anamnesis").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("anamnesis").insert(payload);
        if (error) throw error;
      }

      const { data: currentPlan } = await supabase
        .from("diet_plans")
        .select("id")
        .eq("aluno_id", alunoId)
        .eq("personal_id", personalId)
        .eq("is_active", true)
        .maybeSingle();

      const planPayload = {
        aluno_id: alunoId,
        personal_id: personalId,
        name: "Plano Alimentar",
        kcal_target: preview.kcalTarget,
        protein_g: preview.proteinG,
        carbs_g: preview.carbsG,
        fat_g: preview.fatG,
        is_active: true,
      };

      if (currentPlan?.id) {
        await supabase.from("diet_plans").update(planPayload).eq("id", currentPlan.id);
      } else {
        await supabase.from("diet_plans").insert(planPayload);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["anamnesis", alunoId, personalId] });
      void qc.invalidateQueries({ queryKey: ["studentDietPlan", alunoId] });
    },
  });

  if (isLoading) {
    return <Loader2 className="size-6 animate-spin text-primary mx-auto mt-8" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="size-5 text-primary" />
          <h3 className="font-semibold">Anamnese e calculadora</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Sexo">
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </Field>
          <Field label="Idade">
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="field-input" />
          </Field>
          <Field label="Peso (kg)">
            <input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="field-input" />
          </Field>
          <Field label="Altura (cm)">
            <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="field-input" />
          </Field>
        </div>

        <Field label="Nível de atividade">
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as ActivityLevel)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1"
          >
            {ACTIVITY_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Objetivo">
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as FitnessGoal)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1"
          >
            {GOAL_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Restrições alimentares">
          <textarea
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1"
            placeholder="Alergias, intolerâncias..."
          />
        </Field>

        <Field label="Observações clínicas">
          <textarea
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
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

      <button
        type="button"
        disabled={!preview || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50"
      >
        {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Salvar anamnese e aplicar ao plano alimentar
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mt-3">{label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}{children}</div>;
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-primary/15 border border-primary/30" : "bg-background/60 border border-border"}`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-bold mt-0.5">{value}</p>
    </div>
  );
}
