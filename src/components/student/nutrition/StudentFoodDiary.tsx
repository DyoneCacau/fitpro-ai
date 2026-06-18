import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { FoodItemFormFields } from "@/components/diet/FoodItemFormFields";
import {
  MEAL_SLOTS,
  fetchStudentActiveDietPlan,
  formatFoodItemLine,
  logFoodFromPlanItem,
  logMealFromPlan,
  todayIsoDate,
  type DietMeal,
  type FoodUnitId,
  type MealSlotId,
} from "@/lib/diet";

export function StudentFoodDiary() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState<MealSlotId | null>(null);
  const today = useMemo(() => todayIsoDate(), []);

  const { data: plan } = useQuery({
    queryKey: ["activePlanFull", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchStudentActiveDietPlan(user!.id),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["foodLogs", user?.id, today],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_logs")
        .select("*")
        .eq("aluno_id", user!.id)
        .eq("log_date", today)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const loggedItemIds = useMemo(
    () => new Set(logs.map((l) => l.source_meal_item_id).filter(Boolean)),
    [logs],
  );

  const totals = useMemo(
    () =>
      logs.reduce(
        (a, l) => ({
          kcal: a.kcal + Number(l.kcal ?? 0),
          p: a.p + Number(l.protein_g ?? 0),
          c: a.c + Number(l.carbs_g ?? 0),
          f: a.f + Number(l.fat_g ?? 0),
        }),
        { kcal: 0, p: 0, c: 0, f: 0 },
      ),
    [logs],
  );

  const target = {
    kcal: plan?.kcal_target ?? 2000,
    p: plan?.protein_g ?? 150,
    c: plan?.carbs_g ?? 220,
    f: plan?.fat_g ?? 60,
  };

  const meals = (plan?.diet_meals as DietMeal[] | undefined) ?? [];

  const delLog = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("food_logs").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["foodLogs"] }),
  });

  const logFromPlan = useMutation({
    mutationFn: async ({ slot, items }: { slot: MealSlotId; items: DietMeal["diet_meal_items"] }) => {
      const pending = items.filter((item) => !loggedItemIds.has(item.id));
      await logMealFromPlan(user!.id, slot, pending, today);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["foodLogs"] }),
  });

  const logSingleItem = useMutation({
    mutationFn: async ({ slot, item }: { slot: MealSlotId; item: DietMeal["diet_meal_items"][0] }) => {
      await logFoodFromPlanItem(user!.id, slot, item, today);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["foodLogs"] }),
  });

  return (
    <div className="px-5 pt-5 pb-5 space-y-5">
      <div className="rounded-3xl bg-gradient-card border border-border p-5 shadow-card">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Hoje</p>
            <p className="text-3xl font-bold">
              {Math.round(totals.kcal)}{" "}
              <span className="text-base text-muted-foreground">/ {target.kcal} kcal</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Restante</p>
            <p className="text-lg font-bold text-primary">
              {Math.max(0, target.kcal - Math.round(totals.kcal))} kcal
            </p>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary mb-4">
          <div
            className="h-full bg-gradient-primary transition-all"
            style={{ width: `${Math.min(100, (totals.kcal / target.kcal) * 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Macro label="Proteína" value={Math.round(totals.p)} target={target.p} color="oklch(0.78 0.18 150)" />
          <Macro label="Carbo" value={Math.round(totals.c)} target={target.c} color="oklch(0.82 0.16 75)" />
          <Macro label="Gordura" value={Math.round(totals.f)} target={target.f} color="oklch(0.7 0.18 30)" />
        </div>
      </div>

      {MEAL_SLOTS.map((slot) => {
        const slotLogs = logs.filter((l) => l.slot === slot.id);
        const slotKcal = slotLogs.reduce((a, l) => a + Number(l.kcal ?? 0), 0);
        const planMeal = meals.find((m) => m.slot === slot.id);
        const planItems = planMeal?.diet_meal_items ?? [];
        const pendingPlanItems = planItems.filter((item) => !loggedItemIds.has(item.id));
        const Icon = slot.icon;

        return (
          <div key={slot.id} className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{slot.label}</p>
                <p className="text-xs text-muted-foreground">
                  {slot.time} · {Math.round(slotKcal)} kcal
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdding(slot.id)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {pendingPlanItems.length > 0 && (
              <div className="px-4 py-3 border-b border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[11px] font-bold text-primary">Do seu plano</p>
                  <button
                    type="button"
                    disabled={logFromPlan.isPending}
                    onClick={() => logFromPlan.mutate({ slot: slot.id, items: planItems })}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2 py-1 text-[10px] font-bold text-primary"
                  >
                    <ClipboardCheck className="size-3" />
                    Registrar tudo
                  </button>
                </div>
                <div className="space-y-1.5">
                  {pendingPlanItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">
                        {item.food} · {formatFoodItemLine(item)}
                      </span>
                      <button
                        type="button"
                        disabled={logSingleItem.isPending}
                        onClick={() => logSingleItem.mutate({ slot: slot.id, item })}
                        className="shrink-0 text-[10px] font-bold text-primary"
                      >
                        Registrar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slotLogs.length > 0 && (
              <div className="divide-y divide-border">
                {slotLogs.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{l.food}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFoodItemLine({
                          quantity: Number(l.quantity),
                          unit: l.unit ?? "g",
                          kcal: Number(l.kcal ?? 0),
                        })}
                        {Number(l.kcal) > 0 ? "" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => delLog.mutate(l.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {adding && (
        <AddFoodModal
          slot={adding}
          onClose={() => setAdding(null)}
          onSaved={() => {
            setAdding(null);
            qc.invalidateQueries({ queryKey: ["foodLogs"] });
          }}
        />
      )}
    </div>
  );
}

function Macro({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div className="rounded-xl bg-background/40 border border-border p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-base font-bold mt-0.5">
        {value}
        <span className="text-xs text-muted-foreground">/{target}g</span>
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function AddFoodModal({
  slot,
  onClose,
  onSaved,
}: {
  slot: MealSlotId;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [food, setFood] = useState("");
  const [qty, setQty] = useState("100");
  const [unit, setUnit] = useState<FoodUnitId>("g");
  const [saving, setSaving] = useState(false);
  const today = todayIsoDate();

  const save = async () => {
    if (!food.trim() || !user) return;
    setSaving(true);
    await supabase.from("food_logs").insert({
      aluno_id: user.id,
      log_date: today,
      slot,
      food: food.trim(),
      quantity: Number(qty) || 0,
      unit,
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-card border-t border-border p-5 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Adicionar alimento</h3>
          <button type="button" onClick={onClose} className="rounded-full bg-secondary p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <FoodItemFormFields
            food={food}
            quantity={qty}
            unit={unit}
            itemNotes=""
            onFoodChange={setFood}
            onQuantityChange={setQty}
            onUnitChange={setUnit}
            onNotesChange={() => {}}
            disabled={saving}
            showNotes={false}
          />
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !food.trim()}
          className="mt-5 w-full rounded-2xl bg-gradient-primary py-4 font-bold text-primary-foreground shadow-glow disabled:opacity-50 active:scale-[0.98]"
        >
          {saving ? "Salvando..." : "Adicionar"}
        </button>
      </div>
    </div>
  );
}
