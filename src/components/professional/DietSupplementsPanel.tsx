import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Pill, Plus, Trash2 } from "lucide-react";
import {
  SUPPLEMENT_TIMING_SUGGESTIONS,
  addDietSupplement,
  ensureDietPlan,
  getDietErrorMessage,
  removeDietSupplement,
  sortSupplements,
  type DietPlan,
  type DietSupplement,
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

export function DietSupplementsPanel({
  plan,
  personalId,
  alunoId,
  isTemplate,
  anamnesisTargets,
  onInvalidate,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const supplements = sortSupplements(plan?.diet_supplements);

  const remove = useMutation({
    mutationFn: removeDietSupplement,
    onSuccess: onInvalidate,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Pill className="size-5 text-primary" />
          <h3 className="font-semibold">Suplementos alimentares</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-[11px] font-bold text-primary hover:border-primary/40"
        >
          <Plus className="size-3.5" />
          Adicionar
        </button>
      </div>

      {showForm && (
        <AddSupplementForm
          plan={plan}
          personalId={personalId}
          alunoId={alunoId}
          isTemplate={isTemplate}
          anamnesisTargets={anamnesisTargets}
          position={supplements.length + 1}
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            onInvalidate();
          }}
        />
      )}

      {supplements.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhum suplemento cadastrado.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-2 text-xs font-semibold text-primary"
          >
            + Adicionar suplemento
          </button>
        </div>
      )}

      {supplements.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {supplements.map((s) => (
            <SupplementRow
              key={s.id}
              supplement={s}
              onRemove={() => remove.mutate(s.id)}
              removing={remove.isPending && remove.variables === s.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SupplementRow({
  supplement,
  onRemove,
  removing,
}: {
  supplement: DietSupplement;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{supplement.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {supplement.dosage.trim() || "—"}
          {supplement.timing?.trim() && ` · ${supplement.timing.trim()}`}
        </p>
        {supplement.notes?.trim() && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{supplement.notes}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        className="text-muted-foreground hover:text-destructive p-1 disabled:opacity-50"
        aria-label={`Remover ${supplement.name}`}
      >
        {removing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </button>
    </div>
  );
}

function AddSupplementForm({
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
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [timing, setTiming] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
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
      await addDietSupplement({
        planId,
        name,
        dosage,
        timing,
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
    <form
      onSubmit={(e) => void submit(e)}
      className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3"
    >
      <Field label="Suplemento">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Whey, creatina, vitamina D"
          className="field-input"
          disabled={saving}
          autoFocus
        />
      </Field>
      <Field label="Dosagem">
        <input
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          placeholder="Ex.: 30g, 1 cápsula, 5g"
          className="field-input"
          disabled={saving}
        />
      </Field>
      <Field label="Horário / momento">
        <input
          value={timing}
          onChange={(e) => setTiming(e.target.value)}
          placeholder="Ex.: pós-treino, ao acordar"
          className="field-input"
          disabled={saving}
          list="supplement-timing-suggestions"
        />
        <datalist id="supplement-timing-suggestions">
          {SUPPLEMENT_TIMING_SUGGESTIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SUPPLEMENT_TIMING_SUGGESTIONS.slice(0, 4).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTiming(t)}
              className="rounded-lg border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              {t}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Observação (opcional)">
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: diluir em água, tomar com refeição"
          className="field-input"
          disabled={saving}
        />
      </Field>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="flex-1 rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar suplemento"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
