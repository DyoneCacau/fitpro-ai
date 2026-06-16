import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Apple,
  Coffee,
  Cookie,
  Loader2,
  Moon,
  Plus,
  Sun,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MEAL_SLOTS = [
  { id: "cafe", label: "Café da manhã", icon: Coffee, time: "07:00" },
  { id: "lanche_manha", label: "Lanche da manhã", icon: Cookie, time: "10:00" },
  { id: "almoco", label: "Almoço", icon: UtensilsCrossed, time: "12:30" },
  { id: "lanche_tarde", label: "Lanche da tarde", icon: Cookie, time: "16:00" },
  { id: "jantar", label: "Jantar", icon: Sun, time: "19:30" },
  { id: "ceia", label: "Ceia", icon: Moon, time: "22:00" },
] as const;

type SlotId = (typeof MEAL_SLOTS)[number]["id"];

type MealItem = {
  id: string;
  food: string;
  quantity: number;
  unit: string;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

type Meal = {
  id: string;
  slot: SlotId;
  time_label: string | null;
  diet_meal_items: MealItem[];
};

interface Props {
  alunoId: string;
  personalId: string;
}

export function StudentDietPanel({ alunoId, personalId }: Props) {
  const qc = useQueryClient();
  const [addingSlot, setAddingSlot] = useState<SlotId | null>(null);
  const [editingTargets, setEditingTargets] = useState(false);
  const [targets, setTargets] = useState({ kcal: 2000, protein: 150, carbs: 200, fat: 60 });

  const { data: anamnesis } = useQuery({
    queryKey: ["anamnesis", alunoId, personalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("anamnesis")
        .select("kcal_target, protein_g, carbs_g, fat_g")
        .eq("aluno_id", alunoId)
        .eq("personal_id", personalId)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
  });

  const { data: plan, isLoading } = useQuery({
    queryKey: ["studentDietPlan", alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diet_plans")
        .select("*, diet_meals(*, diet_meal_items(*))")
        .eq("aluno_id", alunoId)
        .eq("personal_id", personalId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const meals = (plan?.diet_meals as Meal[] | undefined) ?? [];

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, meal) => {
        meal.diet_meal_items?.forEach((item) => {
          acc.kcal += Number(item.kcal ?? 0);
          acc.protein += Number(item.protein_g ?? 0);
          acc.carbs += Number(item.carbs_g ?? 0);
          acc.fat += Number(item.fat_g ?? 0);
        });
        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [meals]);

  const goal = {
    kcal: plan?.kcal_target ?? anamnesis?.kcal_target ?? targets.kcal,
    protein: plan?.protein_g ?? anamnesis?.protein_g ?? targets.protein,
    carbs: plan?.carbs_g ?? anamnesis?.carbs_g ?? targets.carbs,
    fat: plan?.fat_g ?? anamnesis?.fat_g ?? targets.fat,
  };

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["studentDietPlan", alunoId] });

  const saveTargets = useMutation({
    mutationFn: async () => {
      if (plan?.id) {
        const { error } = await supabase
          .from("diet_plans")
          .update({
            kcal_target: targets.kcal,
            protein_g: targets.protein,
            carbs_g: targets.carbs,
            fat_g: targets.fat,
          })
          .eq("id", plan.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("diet_plans").insert({
        aluno_id: alunoId,
        personal_id: personalId,
        name: "Plano Alimentar",
        kcal_target: targets.kcal,
        protein_g: targets.protein,
        carbs_g: targets.carbs,
        fat_g: targets.fat,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingTargets(false);
      invalidate();
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("diet_meal_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  if (isLoading) {
    return <Loader2 className="size-6 animate-spin text-primary mx-auto mt-8" />;
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho estilo Dietbox — metas do plano */}
      <div className="rounded-3xl bg-gradient-card border border-border p-5 shadow-card">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Plano alimentar</p>
            <h3 className="text-lg font-bold mt-0.5">{plan?.name ?? "Prescrição dietética"}</h3>
            {anamnesis && !plan && (
              <p className="text-[10px] text-primary mt-1">Metas sugeridas pela anamnese</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setTargets({
                kcal: goal.kcal,
                protein: goal.protein,
                carbs: goal.carbs,
                fat: goal.fat,
              });
              setEditingTargets((v) => !v);
            }}
            className="text-xs font-semibold text-primary"
          >
            {editingTargets ? "Cancelar" : "Editar metas"}
          </button>
        </div>

        {editingTargets ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <TargetInput label="Kcal/dia" value={targets.kcal} onChange={(v) => setTargets((t) => ({ ...t, kcal: v }))} />
              <TargetInput label="Proteína (g)" value={targets.protein} onChange={(v) => setTargets((t) => ({ ...t, protein: v }))} />
              <TargetInput label="Carbo (g)" value={targets.carbs} onChange={(v) => setTargets((t) => ({ ...t, carbs: v }))} />
              <TargetInput label="Gordura (g)" value={targets.fat} onChange={(v) => setTargets((t) => ({ ...t, fat: v }))} />
            </div>
            <button
              type="button"
              onClick={() => saveTargets.mutate()}
              disabled={saveTargets.isPending}
              className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold"
            >
              {saveTargets.isPending ? "Salvando…" : "Salvar metas do plano"}
            </button>
          </div>
        ) : (
          <>
            <MacroBar label="Calorias" value={totals.kcal} target={goal.kcal} unit="kcal" color="var(--primary)" />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <MacroMini label="Proteína" value={totals.protein} target={goal.protein} color="oklch(0.78 0.18 150)" />
              <MacroMini label="Carbo" value={totals.carbs} target={goal.carbs} color="oklch(0.82 0.16 75)" />
              <MacroMini label="Gordura" value={totals.fat} target={goal.fat} color="oklch(0.7 0.18 30)" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 text-center">
              Prescrito: {Math.round(totals.kcal)} kcal · Meta: {goal.kcal} kcal
            </p>
          </>
        )}
      </div>

      {/* Refeições — layout Dietbox */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Apple className="size-5 text-primary" />
          <h3 className="font-semibold">Refeições do dia</h3>
        </div>

        {MEAL_SLOTS.map((slot) => {
          const meal = meals.find((m) => m.slot === slot.id);
          const items = meal?.diet_meal_items ?? [];
          const mealTotals = items.reduce(
            (a, i) => ({
              kcal: a.kcal + Number(i.kcal ?? 0),
              p: a.p + Number(i.protein_g ?? 0),
              c: a.c + Number(i.carbs_g ?? 0),
              f: a.f + Number(i.fat_g ?? 0),
            }),
            { kcal: 0, p: 0, c: 0, f: 0 },
          );
          const Icon = slot.icon;

          return (
            <div key={slot.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-border/60">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{slot.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {meal?.time_label ?? slot.time}
                    {items.length > 0 && ` · ${Math.round(mealTotals.kcal)} kcal`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddingSlot(slot.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0"
                  aria-label={`Adicionar em ${slot.label}`}
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {items.length > 0 ? (
                <>
                  <div className="divide-y divide-border">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.food}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.quantity}
                            {item.unit} · {Math.round(Number(item.kcal ?? 0))} kcal
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            P {Math.round(Number(item.protein_g ?? 0))}g · C{" "}
                            {Math.round(Number(item.carbs_g ?? 0))}g · G{" "}
                            {Math.round(Number(item.fat_g ?? 0))}g
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteItem.mutate(item.id)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 bg-background/40 border-t border-border flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                    <span>Total refeição</span>
                    <span>
                      {Math.round(mealTotals.kcal)} kcal · P{Math.round(mealTotals.p)} · C
                      {Math.round(mealTotals.c)} · G{Math.round(mealTotals.f)}
                    </span>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingSlot(slot.id)}
                  className="w-full py-4 text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  + Adicionar alimentos
                </button>
              )}
            </div>
          );
        })}
      </div>

      {addingSlot && (
        <AddFoodModal
          slot={addingSlot}
          slotLabel={MEAL_SLOTS.find((s) => s.id === addingSlot)!.label}
          alunoId={alunoId}
          personalId={personalId}
          plan={plan}
          anamnesisTargets={anamnesis}
          onClose={() => setAddingSlot(null)}
          onSaved={() => {
            setAddingSlot(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function MacroBar({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">
          {Math.round(value)} / {target} {unit}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full transition-all rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function MacroMini({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="rounded-xl bg-background/40 border border-border p-2.5">
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold mt-0.5">
        {Math.round(value)}
        <span className="text-[10px] text-muted-foreground font-normal">/{target}g</span>
      </p>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function TargetInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase text-muted-foreground">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="field-input mt-1"
      />
    </div>
  );
}

function AddFoodModal({
  slot,
  slotLabel,
  alunoId,
  personalId,
  plan,
  anamnesisTargets,
  onClose,
  onSaved,
}: {
  slot: SlotId;
  slotLabel: string;
  alunoId: string;
  personalId: string;
  plan: {
    id: string;
    kcal_target: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    diet_meals?: Meal[];
  } | null;
  anamnesisTargets: {
    kcal_target: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [food, setFood] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState("g");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!food.trim()) return;
    setSaving(true);

    let planId = plan?.id;
    if (!planId) {
      const { data: created, error } = await supabase
        .from("diet_plans")
        .insert({
          aluno_id: alunoId,
          personal_id: personalId,
          name: "Plano Alimentar",
          kcal_target: anamnesisTargets?.kcal_target ?? 2000,
          protein_g: anamnesisTargets?.protein_g ?? 150,
          carbs_g: anamnesisTargets?.carbs_g ?? 200,
          fat_g: anamnesisTargets?.fat_g ?? 60,
          is_active: true,
        })
        .select("id")
        .single();
      if (error) {
        setSaving(false);
        return;
      }
      planId = created.id;
    }

    const meals = (plan?.diet_meals as Meal[] | undefined) ?? [];
    let meal = meals.find((m) => m.slot === slot);
    if (!meal) {
      const { data: newMeal, error } = await supabase
        .from("diet_meals")
        .insert({
          plan_id: planId,
          slot,
          position: meals.length + 1,
          time_label: MEAL_SLOTS.find((s) => s.id === slot)?.time,
        })
        .select("id, slot")
        .single();
      if (error) {
        setSaving(false);
        return;
      }
      meal = { ...newMeal, slot, time_label: null, diet_meal_items: [] };
    }

    const { error: itemError } = await supabase.from("diet_meal_items").insert({
      meal_id: meal!.id,
      food: food.trim(),
      quantity: Number(quantity) || 1,
      unit,
      kcal: Number(kcal) || 0,
      protein_g: Number(protein) || 0,
      carbs_g: Number(carbs) || 0,
      fat_g: Number(fat) || 0,
      position: (meal!.diet_meal_items?.length ?? 0) + 1,
    });

    setSaving(false);
    if (itemError) return;
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-card border-t border-border p-5 pb-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Adicionar alimento</h3>
            <p className="text-xs text-muted-foreground">{slotLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-secondary p-1.5">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label="Alimento">
            <input
              required
              value={food}
              onChange={(e) => setFood(e.target.value)}
              placeholder="Ex: Arroz integral cozido"
              className="field-input"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Quantidade">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="field-input"
              />
            </Field>
            <Field label="Unidade">
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="field-input">
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="un">unidade</option>
                <option value="col">col. sopa</option>
                <option value="xic">xícara</option>
                <option value="fat">fatia</option>
              </select>
            </Field>
          </div>
          <Field label="Calorias (kcal)">
            <input
              type="number"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              className="field-input"
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Prot (g)">
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="field-input"
              />
            </Field>
            <Field label="Carb (g)">
              <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="field-input" />
            </Field>
            <Field label="Gord (g)">
              <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} className="field-input" />
            </Field>
          </div>
          <button
            type="submit"
            disabled={!food.trim() || saving}
            className="w-full rounded-2xl bg-gradient-primary py-3.5 font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Adicionar ao plano"}
          </button>
        </form>
      </div>
    </div>
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
