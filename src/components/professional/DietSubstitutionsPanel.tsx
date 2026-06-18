import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Repeat2, Trash2 } from "lucide-react";
import {
  addDietSubstitution,
  ensureDietPlan,
  getDietErrorMessage,
  removeDietSubstitution,
  sortSubstitutions,
  type DietPlan,
} from "@/lib/diet";

type Props = {
  plan: DietPlan | null | undefined;
  personalId: string;
  alunoId?: string;
  isTemplate: boolean;
  anamnesisTargets?: {
    kcal_target: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null;
  onInvalidate: () => void;
};

export function DietSubstitutionsPanel({
  plan,
  personalId,
  alunoId,
  isTemplate,
  anamnesisTargets,
  onInvalidate,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const substitutions = sortSubstitutions(plan?.diet_substitutions);

  const remove = useMutation({
    mutationFn: removeDietSubstitution,
    onSuccess: onInvalidate,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Repeat2 className="size-5 text-primary" />
          <h3 className="font-semibold">Substituições alimentares</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-[11px] font-bold text-primary"
        >
          <Plus className="size-3.5" />
          Adicionar
        </button>
      </div>

      {showForm && (
        <AddForm
          plan={plan}
          personalId={personalId}
          alunoId={alunoId}
          isTemplate={isTemplate}
          anamnesisTargets={anamnesisTargets}
          position={substitutions.length + 1}
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            onInvalidate();
          }}
        />
      )}

      {substitutions.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma substituição cadastrada.</p>
        </div>
      )}

      {substitutions.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {substitutions.map((s) => (
            <div key={s.id} className="flex items-start gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{s.original_food}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span className="font-medium text-primary">{s.substitute_food}</span>
                </p>
                {s.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{s.notes}</p>}
              </div>
              <button
                type="button"
                onClick={() => remove.mutate(s.id)}
                disabled={remove.isPending}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                {remove.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddForm({
  plan,
  personalId,
  alunoId,
  isTemplate,
  anamnesisTargets,
  position,
  onCancel,
  onSaved,
}: {
  plan: DietPlan | null | undefined;
  personalId: string;
  alunoId?: string;
  isTemplate: boolean;
  anamnesisTargets?: Props["anamnesisTargets"];
  position: number;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [original, setOriginal] = useState("");
  const [substitute, setSubstitute] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!original.trim() || !substitute.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const planId = await ensureDietPlan({
        personalId,
        alunoId,
        isTemplate,
        existingPlanId: plan?.id,
        targets: anamnesisTargets ?? undefined,
      });
      await addDietSubstitution({
        planId,
        originalFood: original,
        substituteFood: substitute,
        notes,
        position,
      });
      onSaved();
    } catch (err) {
      setError(getDietErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <Field label="Alimento original">
        <input required value={original} onChange={(e) => setOriginal(e.target.value)} className="field-input" placeholder="Ex.: arroz branco" disabled={saving} />
      </Field>
      <Field label="Substituir por">
        <input required value={substitute} onChange={(e) => setSubstitute(e.target.value)} className="field-input" placeholder="Ex.: arroz integral" disabled={saving} />
      </Field>
      <Field label="Observação (opcional)">
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="field-input" placeholder="Ex.: mesma quantidade" disabled={saving} />
      </Field>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
