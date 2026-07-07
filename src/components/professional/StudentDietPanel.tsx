import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Apple,
  Calculator,
  ChevronDown,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { DietSupplementsPanel } from "@/components/professional/DietSupplementsPanel";
import { supabase } from "@/integrations/supabase/client";
import { fetchStudentAnamnesis } from "@/lib/anamnesis";
import { DietSubstitutionsPanel } from "@/components/professional/DietSubstitutionsPanel";
import { FoodItemFormFields } from "@/components/diet/FoodItemFormFields";
import { DietPlanToolbar } from "@/components/diet/DietPlanToolbar";
import { DietMealSubstitutionsEditor } from "@/components/professional/DietMealSubstitutionsEditor";
import {
  MEAL_SLOTS,
  activateDietMealSlot,
  cloneDietPlan,
  fetchDietPlanById,
  fetchDietTemplates,
  fetchStudentDietPlan,
  formatFoodItemPortion,
  formatFoodItemLine,
  ensureDietMeal,
  ensureDietPlan,
  getDietErrorMessage,
  getMealMainItems,
  removeDietMeal,
  sumMealItems,
  sumPlanMeals,
  syncDietFromAnamnesis,
  updateMealDescription,
  defaultQuantityForUnit,
  type FoodUnitId,
  type DietMeal,
  type DietPlan,
  type MealSlotId,
} from "@/lib/diet";

interface Props {
  personalId: string;
  alunoId?: string;
  templatePlanId?: string;
}

export function StudentDietPanel({ alunoId, templatePlanId, personalId }: Props) {
  const qc = useQueryClient();
  const isTemplate = !!templatePlanId;
  const [addingSlot, setAddingSlot] = useState<MealSlotId | null>(null);
  const [openedSlots, setOpenedSlots] = useState<Set<MealSlotId>>(new Set());
  const [expandedMealSlots, setExpandedMealSlots] = useState<Set<MealSlotId>>(new Set());
  const [activatingSlot, setActivatingSlot] = useState<MealSlotId | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [editingTargets, setEditingTargets] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [targets, setTargets] = useState({ kcal: 2000, protein: 150, carbs: 200, fat: 60 });
  const [mealNotes, setMealNotes] = useState<Record<string, string>>({});
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

  const planKey = isTemplate
    ? ["dietTemplatePlan", templatePlanId]
    : ["studentDietPlan", alunoId];

  const { data: anamnesis } = useQuery({
    queryKey: ["anamnesis", alunoId],
    enabled: !!alunoId && !isTemplate,
    queryFn: () => fetchStudentAnamnesis(alunoId!),
  });

  const { data: plan, isLoading } = useQuery({
    queryKey: planKey,
    queryFn: () =>
      isTemplate
        ? fetchDietPlanById(templatePlanId!, personalId)
        : fetchStudentDietPlan(personalId, alunoId!),
    enabled: isTemplate ? !!templatePlanId : !!alunoId,
  });

  const meals = (plan?.diet_meals as DietMeal[] | undefined) ?? [];
  const activeSlots = useMemo(() => new Set(meals.map((m) => m.slot)), [meals]);
  const visibleSlots = useMemo(
    () => MEAL_SLOTS.filter((slot) => activeSlots.has(slot.id) || openedSlots.has(slot.id)),
    [activeSlots, openedSlots],
  );
  const availableSlots = useMemo(
    () => MEAL_SLOTS.filter((slot) => !activeSlots.has(slot.id) && !openedSlots.has(slot.id)),
    [activeSlots, openedSlots],
  );
  const totals = useMemo(() => sumPlanMeals(meals), [meals]);

  const goal = {
    kcal: plan?.kcal_target ?? anamnesis?.kcal_target ?? targets.kcal,
    protein: plan?.protein_g ?? anamnesis?.protein_g ?? targets.protein,
    carbs: plan?.carbs_g ?? anamnesis?.carbs_g ?? targets.carbs,
    fat: plan?.fat_g ?? anamnesis?.fat_g ?? targets.fat,
  };

  const invalidate = () => void qc.invalidateQueries({ queryKey: planKey });

  const syncAnamnesis = useMutation({
    mutationFn: () => syncDietFromAnamnesis(alunoId!),
    onSuccess: invalidate,
  });

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
        aluno_id: alunoId ?? null,
        personal_id: personalId,
        name: isTemplate ? "Modelo alimentar" : "Plano Alimentar",
        kcal_target: targets.kcal,
        protein_g: targets.protein,
        carbs_g: targets.carbs,
        fat_g: targets.fat,
        is_active: true,
        ...(isTemplate ? { is_template: true } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingTargets(false);
      invalidate();
    },
  });

  const saveAsTemplate = useMutation({
    mutationFn: () =>
      cloneDietPlan({
        sourcePlanId: plan!.id,
        asTemplate: true,
        templateName: `${plan!.name} (modelo)`,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["dietTemplates", personalId] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("diet_meal_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const saveMealNotes = useMutation({
    mutationFn: async ({ mealId, description }: { mealId: string; description: string }) => {
      await updateMealDescription(mealId, description);
    },
    onSuccess: () => {
      setEditingMealId(null);
      invalidate();
    },
  });

  const removeMeal = useMutation({
    mutationFn: removeDietMeal,
    onSuccess: (_, mealId) => {
      const removed = meals.find((m) => m.id === mealId);
      if (removed) {
        setOpenedSlots((prev) => {
          const next = new Set(prev);
          next.delete(removed.slot);
          return next;
        });
        setExpandedMealSlots((prev) => {
          const next = new Set(prev);
          next.delete(removed.slot);
          return next;
        });
        if (addingSlot === removed.slot) setAddingSlot(null);
      }
      invalidate();
    },
  });

  function toggleMealExpanded(slot: MealSlotId) {
    setExpandedMealSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  }

  function handleSelectMealSlot(slot: MealSlotId) {
    setActivationError(null);
    setOpenedSlots((prev) => new Set(prev).add(slot));
    setExpandedMealSlots((prev) => new Set(prev).add(slot));
    setAddingSlot(slot);

    void (async () => {
      setActivatingSlot(slot);
      try {
        await activateDietMealSlot({
          personalId,
          alunoId,
          isTemplate,
          slot,
          plan,
          anamnesisTargets: anamnesis,
        });
        await qc.invalidateQueries({ queryKey: planKey });
        await qc.refetchQueries({ queryKey: planKey });
      } catch (err) {
        setActivationError(getDietErrorMessage(err));
        setOpenedSlots((prev) => {
          const next = new Set(prev);
          next.delete(slot);
          return next;
        });
        setAddingSlot((current) => (current === slot ? null : current));
      } finally {
        setActivatingSlot(null);
      }
    })();
  }

  if (isLoading) {
    return <Loader2 className="size-6 animate-spin text-primary mx-auto mt-8" />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-card border border-border p-5 shadow-card">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {isTemplate ? "Modelo alimentar" : "Plano alimentar"}
            </p>
            <h3 className="text-lg font-bold mt-0.5">{plan?.name ?? "Prescrição dietética"}</h3>
            {anamnesis && !plan && (
              <p className="text-[10px] text-primary mt-1">Metas sugeridas pela anamnese</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {!isTemplate && anamnesis && (
              <button
                type="button"
                onClick={() => syncAnamnesis.mutate()}
                disabled={syncAnamnesis.isPending}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary"
              >
                {syncAnamnesis.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Calculator className="size-3" />
                )}
                Usar metas da anamnese
              </button>
            )}
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
        </div>

        {syncAnamnesis.isError && (
          <p className="text-xs text-destructive mb-3">{getDietErrorMessage(syncAnamnesis.error)}</p>
        )}

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

        {plan && (
          <DietPlanToolbar
            plan={plan}
            onApplyTemplate={() => setShowTemplates(true)}
            onSaveTemplate={() => saveAsTemplate.mutate()}
            savingTemplate={saveAsTemplate.isPending}
            showApplyTemplate={!isTemplate}
          />
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Apple className="size-5 text-primary" />
          <h3 className="font-semibold">Refeições do plano</h3>
        </div>

        {activationError && (
          <p className="text-xs text-destructive rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
            {activationError}
          </p>
        )}

        {availableSlots.length > 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-4">
            <p className="text-[11px] font-semibold text-foreground mb-1">
              Selecione as refeições necessárias
            </p>
            <p className="text-[10px] text-muted-foreground mb-3">
              Toque em uma refeição para abrir o preenchimento de alimentos.
            </p>
            <div className="flex flex-wrap gap-2">
              {availableSlots.map((slot) => {
                const Icon = slot.icon;
                const busy = activatingSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!!activatingSlot}
                    onClick={() => handleSelectMealSlot(slot.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[11px] font-bold text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {visibleSlots.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma refeição selecionada ainda.</p>
          </div>
        )}

        {visibleSlots.map((slot) => {
          const meal = meals.find((m) => m.slot === slot.id);
          const items = meal ? getMealMainItems(meal) : [];
          const mealTotals = sumMealItems(items);
          const Icon = slot.icon;
          const isEditingNotes = meal && editingMealId === meal.id;
          const showInlineForm = addingSlot === slot.id;
          const isActivating = activatingSlot === slot.id;
          const isExpanded =
            expandedMealSlots.has(slot.id) || showInlineForm || isActivating;

          return (
            <div key={slot.id} className="rounded-2xl border border-primary/30 bg-card overflow-hidden">
              <div
                className={`flex items-center gap-2 p-4 ${isExpanded ? "border-b border-border/60" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggleMealExpanded(slot.id)}
                  className="flex flex-1 items-center gap-3 min-w-0 text-left"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{slot.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {meal?.time_label ?? slot.time}
                      {items.length > 0 &&
                        (mealTotals.kcal > 0
                          ? ` · ${Math.round(mealTotals.kcal)} kcal`
                          : ` · ${items.length} ${items.length === 1 ? "item" : "itens"}`)}
                      {isActivating && " · salvando…"}
                    </p>
                  </div>
                  <ChevronDown
                    className={`size-4 text-muted-foreground shrink-0 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {meal && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedMealSlots((prev) => new Set(prev).add(slot.id));
                        setAddingSlot(showInlineForm ? null : slot.id);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0"
                      aria-label={`Adicionar em ${slot.label}`}
                    >
                      <Plus className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMeal.mutate(meal.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-destructive shrink-0"
                      aria-label={`Remover ${slot.label}`}
                      title="Remover refeição do plano"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </div>

              {isExpanded && meal && (
                <div className="px-4 py-3 border-b border-border/40 bg-background/30">
                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <textarea
                        value={mealNotes[meal.id] ?? meal.description ?? ""}
                        onChange={(e) =>
                          setMealNotes((prev) => ({ ...prev, [meal.id]: e.target.value }))
                        }
                        placeholder={"Observações (uma por linha):\n- Pode substituir a banana por 1 fatia de pão\n- Café com adoçante ou puro"}
                        className="field-input min-h-[72px] text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            saveMealNotes.mutate({
                              mealId: meal.id,
                              description: mealNotes[meal.id] ?? "",
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary"
                        >
                          <Save className="size-3" />
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMealId(null)}
                          className="text-[10px] text-muted-foreground"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMealNotes((prev) => ({
                          ...prev,
                          [meal.id]: meal.description ?? "",
                        }));
                        setEditingMealId(meal.id);
                      }}
                      className="w-full text-left text-[11px] text-muted-foreground hover:text-primary"
                    >
                      {meal.description?.trim()
                        ? `Obs: ${meal.description}`
                        : "+ Observações / substituições"}
                    </button>
                  )}
                </div>
              )}

              {isExpanded && meal && (
                <>
                  {items.length > 0 && (
                    <>
                      <div className="divide-y divide-border">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{item.food}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatFoodItemPortion(item)}
                              </p>
                              {item.notes && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">{item.notes}</p>
                              )}
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
                          {mealTotals.kcal > 0
                            ? `${Math.round(mealTotals.kcal)} kcal`
                            : `${items.length} ${items.length === 1 ? "item" : "itens"}`}
                        </span>
                      </div>
                    </>
                  )}

                  <DietMealSubstitutionsEditor meal={meal} onInvalidate={invalidate} />

                  {showInlineForm && (
                    <InlineAddFoodForm
                      slot={slot.id}
                      slotLabel={slot.label}
                      alunoId={alunoId}
                      personalId={personalId}
                      isTemplate={isTemplate}
                      plan={plan}
                      anamnesisTargets={anamnesis}
                      disabled={isActivating}
                      onCancel={() => setAddingSlot(null)}
                      onSaved={() => invalidate()}
                    />
                  )}

                  {!showInlineForm && items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAddingSlot(slot.id)}
                      className="w-full py-3 text-xs font-semibold text-primary hover:bg-primary/5 border-t border-border transition-colors"
                    >
                      + Adicionar outro alimento
                    </button>
                  )}

                  {!showInlineForm && items.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setAddingSlot(slot.id)}
                      className="w-full py-4 text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      + Adicionar alimentos
                    </button>
                  )}
                </>
              )}

              {isExpanded && !meal && showInlineForm && (
                <InlineAddFoodForm
                  slot={slot.id}
                  slotLabel={slot.label}
                  alunoId={alunoId}
                  personalId={personalId}
                  isTemplate={isTemplate}
                  plan={plan}
                  anamnesisTargets={anamnesis}
                  disabled={isActivating}
                  onCancel={() => setAddingSlot(null)}
                  onSaved={() => invalidate()}
                />
              )}
            </div>
          );
        })}

        {availableSlots.length > 0 && visibleSlots.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center">
            Você ainda pode adicionar: {availableSlots.map((s) => s.label).join(", ")}
          </p>
        )}
      </div>

      <DietSupplementsPanel
        plan={plan}
        personalId={personalId}
        alunoId={alunoId}
        isTemplate={isTemplate}
        anamnesisTargets={anamnesis ?? undefined}
        onInvalidate={invalidate}
      />

      <DietSubstitutionsPanel
        plan={plan}
        personalId={personalId}
        alunoId={alunoId}
        isTemplate={isTemplate}
        anamnesisTargets={anamnesis ?? undefined}
        onInvalidate={invalidate}
      />

      {showTemplates && alunoId && plan && (
        <ApplyTemplateModal
          personalId={personalId}
          alunoId={alunoId}
          onClose={() => setShowTemplates(false)}
          onApplied={() => {
            setShowTemplates(false);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function ApplyTemplateModal({
  personalId,
  alunoId,
  onClose,
  onApplied,
}: {
  personalId: string;
  alunoId: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["dietTemplates", personalId],
    queryFn: () => fetchDietTemplates(personalId),
  });

  async function apply(templateId: string) {
    setApplying(templateId);
    setError(null);
    try {
      await cloneDietPlan({ sourcePlanId: templateId, targetAlunoId: alunoId });
      onApplied();
    } catch (err) {
      setError(getDietErrorMessage(err));
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold">Aplicar modelo</h3>
          <button type="button" onClick={onClose}>
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground mb-2">
            Substitui o plano atual do aluno pelo modelo selecionado.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {isLoading ? (
            <Loader2 className="size-5 animate-spin text-primary mx-auto" />
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum modelo cadastrado. Salve um plano como modelo ou crie na biblioteca.
            </p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={!!applying}
                onClick={() => void apply(t.id)}
                className="w-full rounded-xl border border-border p-3 text-left hover:border-primary/40"
              >
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t.kcal_target} kcal · P{t.protein_g} · C{t.carbs_g} · G{t.fat_g}
                </p>
                {applying === t.id && (
                  <Loader2 className="size-4 animate-spin text-primary mt-2" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
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

function InlineAddFoodForm({
  slot,
  slotLabel,
  alunoId,
  personalId,
  isTemplate,
  plan,
  anamnesisTargets,
  disabled,
  onCancel,
  onSaved,
}: {
  slot: MealSlotId;
  slotLabel: string;
  alunoId?: string;
  personalId: string;
  isTemplate: boolean;
  plan: DietPlan | null | undefined;
  anamnesisTargets: {
    kcal_target: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null | undefined;
  disabled?: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [food, setFood] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState<FoodUnitId>("g");
  const [itemNotes, setItemNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedInSession, setAddedInSession] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!food.trim() || disabled) return;
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

      const meals = (plan?.diet_meals as DietMeal[] | undefined) ?? [];
      const meal = await ensureDietMeal(planId, slot, meals.length + 1);

      const { count } = await supabase
        .from("diet_meal_items")
        .select("*", { count: "exact", head: true })
        .eq("meal_id", meal.id)
        .is("substitution_set_id", null);

      const { error: itemError } = await supabase.from("diet_meal_items").insert({
        meal_id: meal.id,
        food: food.trim(),
        quantity: Number(quantity) || 0,
        unit,
        kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        notes: itemNotes.trim() || null,
        position: (count ?? 0) + 1,
        substitution_set_id: null,
      });
      if (itemError) throw itemError;
      setFood("");
      setQuantity(defaultQuantityForUnit(unit));
      setItemNotes("");
      setAddedInSession((n) => n + 1);
      onSaved();
    } catch (err) {
      setError(getDietErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-4 border-t border-primary/20 bg-primary/5">
      <p className="text-[11px] font-bold text-primary mb-1">Preencher {slotLabel}</p>
      <p className="text-[10px] text-muted-foreground mb-3">
        Adicione todos os alimentos da refeição (ex.: pão, ovo, requeijão, mamão). Toque em Fechar quando terminar.
      </p>
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <FoodItemFormFields
          food={food}
          quantity={quantity}
          unit={unit}
          itemNotes={itemNotes}
          onFoodChange={setFood}
          onQuantityChange={setQuantity}
          onUnitChange={setUnit}
          onNotesChange={setItemNotes}
          disabled={disabled || saving}
          foodPlaceholder="Ex.: pão integral, ovo, requeijão, mamão"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        {addedInSession > 0 && (
          <p className="text-[10px] font-semibold text-primary">
            {addedInSession} {addedInSession === 1 ? "alimento adicionado" : "alimentos adicionados"} nesta refeição
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!food.trim() || saving || disabled}
            className="flex-1 rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Salvando…" : addedInSession > 0 ? "Adicionar outro" : "Adicionar alimento"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground"
          >
            Fechar
          </button>
        </div>
      </form>
    </div>
  );
}
