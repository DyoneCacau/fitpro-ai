import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Apple, Pill, Plus, Trash2, X, ClipboardCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { ProfessionalStudentWorkspace } from "@/components/professional/ProfessionalStudentWorkspace";
import { DietTemplateLibrary } from "@/components/professional/DietTemplateLibrary";
import { StudentDietPanel } from "@/components/professional/StudentDietPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  MEAL_SLOTS,
  fetchStudentActiveDietPlan,
  formatFoodItemLine,
  formatFoodQuantity,
  getMealSlotMeta,
  logFoodFromPlanItem,
  logMealFromPlan,
  sortSupplements,
  sumMealItems,
  todayIsoDate,
  type DietMeal,
  type MealSlotId,
} from "@/lib/diet";

export const Route = createFileRoute("/dieta")({
  head: () => ({ meta: [{ title: "Dieta — FitPro AI" }] }),
  component: () => (
    <AuthGate>
      <DietaPage />
    </AuthGate>
  ),
});

function DietaPage() {
  const { role, loading } = useAuth();
  const isProfessional = role === "personal" || role === "admin";

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      </AppShell>
    );
  }

  if (isProfessional) return <ProfessionalDietaPage />;
  return <StudentDietaPage />;
}

function ProfessionalDietaPage() {
  const [view, setView] = useState<"aluno" | "biblioteca">("aluno");

  return (
    <AppShell>
      <PageHeader title="Dieta" subtitle="Prescrição alimentar e modelos reutilizáveis" />

      <div className="px-5 pb-2">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-card border border-border p-1">
          <button
            type="button"
            onClick={() => setView("aluno")}
            className={`rounded-xl py-2 text-[11px] font-bold ${
              view === "aluno"
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground"
            }`}
          >
            Por aluno
          </button>
          <button
            type="button"
            onClick={() => setView("biblioteca")}
            className={`rounded-xl py-2 text-[11px] font-bold ${
              view === "biblioteca"
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground"
            }`}
          >
            Biblioteca de planos
          </button>
        </div>
      </div>

      {view === "biblioteca" ? (
        <div className="px-5 py-5 pb-10">
          <DietTemplateLibrary />
        </div>
      ) : (
        <ProfessionalStudentWorkspace subtitle="Selecione o aluno para montar refeições e metas">
          {({ alunoId, personalId }) => (
            <StudentDietPanel key={alunoId} alunoId={alunoId} personalId={personalId} />
          )}
        </ProfessionalStudentWorkspace>
      )}
    </AppShell>
  );
}

function StudentDietaPage() {
  const [tab, setTab] = useState<"plano" | "diario">("diario");

  return (
    <AppShell>
      <PageHeader title="Nutrição" subtitle="Plano e diário alimentar" />
      <div className="px-5 pt-4">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-card border border-border p-1">
          <button
            onClick={() => setTab("diario")}
            className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
              tab === "diario" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
            }`}
          >
            Diário
          </button>
          <button
            onClick={() => setTab("plano")}
            className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
              tab === "plano" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
            }`}
          >
            Plano prescrito
          </button>
        </div>
      </div>

      {tab === "diario" ? <Diario /> : <Plano />}
    </AppShell>
  );
}

function Diario() {
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

  const totals = useMemo(() => {
    return logs.reduce(
      (a, l) => ({
        kcal: a.kcal + Number(l.kcal ?? 0),
        p: a.p + Number(l.protein_g ?? 0),
        c: a.c + Number(l.carbs_g ?? 0),
        f: a.f + Number(l.fat_g ?? 0),
      }),
      { kcal: 0, p: 0, c: 0, f: 0 },
    );
  }, [logs]);

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
                        {item.food} · {formatFoodQuantity(item.quantity)}
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
                        {formatFoodQuantity(Number(l.quantity))}
                        {Number(l.kcal) > 0 && ` · ${Math.round(Number(l.kcal))} kcal`}
                      </p>
                    </div>
                    <button
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
  const [qty, setQty] = useState(100);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!food.trim() || !user) return;
    setSaving(true);
    await supabase.from("food_logs").insert({
      aluno_id: user.id,
      slot,
      food: food.trim(),
      quantity: qty,
      unit: "g",
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
          <button onClick={onClose} className="rounded-full bg-secondary p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <Field label="Alimento">
            <input
              value={food}
              onChange={(e) => setFood(e.target.value)}
              placeholder="Ex.: arroz, feijão, frango grelhado"
              className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Quantidade (g)">
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(+e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </Field>
        </div>
        <button
          onClick={save}
          disabled={saving || !food.trim()}
          className="mt-5 w-full rounded-2xl bg-gradient-primary py-4 font-bold text-primary-foreground shadow-glow disabled:opacity-50 active:scale-[0.98]"
        >
          {saving ? "Salvando..." : "Adicionar"}
        </button>
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

function Plano() {
  const { user } = useAuth();
  const { data: plan } = useQuery({
    queryKey: ["dietPlanFull", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchStudentActiveDietPlan(user!.id),
  });

  if (!plan) {
    return (
      <div className="px-5 py-12 text-center">
        <Apple className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-semibold">Nenhum plano prescrito</p>
        <p className="text-xs text-muted-foreground mt-1">
          Seu nutricionista ainda não cadastrou um plano alimentar.
        </p>
      </div>
    );
  }

  const meals = (plan.diet_meals ?? []) as DietMeal[];
  const supplements = sortSupplements(plan.diet_supplements);

  return (
    <div className="px-5 py-5 space-y-4">
      <div className="rounded-3xl bg-gradient-card border border-border p-5 shadow-card">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Plano</p>
        <h3 className="text-xl font-bold mt-1">{plan.name}</h3>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          <MacroPill v={plan.kcal_target} l="kcal" />
          <MacroPill v={plan.protein_g} l="prot" />
          <MacroPill v={plan.carbs_g} l="carb" />
          <MacroPill v={plan.fat_g} l="gord" />
        </div>
      </div>
      {meals.length === 0 && supplements.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Plano sem refeições ou suplementos cadastrados ainda.
        </p>
      )}
      {meals.map((m) => {
        const meta = getMealSlotMeta(m.slot);
        const Icon = meta.icon;
        const mealTotals = sumMealItems(m.diet_meal_items ?? []);
        return (
          <div key={m.id} className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{meta.label}</p>
                <p className="text-xs text-muted-foreground">
                  {m.time_label ?? meta.time}
                  {mealTotals.kcal > 0
                    ? ` · ${Math.round(mealTotals.kcal)} kcal`
                    : m.diet_meal_items.length > 0
                      ? ` · ${m.diet_meal_items.length} itens`
                      : ""}
                </p>
              </div>
            </div>
            {m.description && (
              <p className="text-xs text-muted-foreground mb-2 rounded-lg bg-muted/30 p-2">{m.description}</p>
            )}
            <ul className="space-y-1.5">
              {m.diet_meal_items.map((it) => (
                <li key={it.id} className="flex justify-between text-sm gap-2">
                  <span className="min-w-0">
                    {it.food}
                    {it.notes && (
                      <span className="block text-[10px] text-muted-foreground">{it.notes}</span>
                    )}
                  </span>
                  <span className="text-muted-foreground shrink-0">{formatFoodItemLine(it)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {supplements.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Suplementos alimentares</p>
              <p className="text-xs text-muted-foreground">
                {supplements.length} {supplements.length === 1 ? "item" : "itens"}
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {supplements.map((s) => (
              <li key={s.id} className="rounded-xl bg-background/40 border border-border px-3 py-2.5">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.dosage.trim() || "—"}
                  {s.timing?.trim() && ` · ${s.timing.trim()}`}
                </p>
                {s.notes?.trim() && (
                  <p className="text-[10px] text-muted-foreground mt-1">{s.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MacroPill({ v, l }: { v: number | null; l: string }) {
  return (
    <div className="rounded-xl bg-background/40 border border-border py-2">
      <p className="text-base font-bold leading-none">{v ?? 0}</p>
      <p className="text-[10px] text-muted-foreground mt-1 uppercase">{l}</p>
    </div>
  );
}
