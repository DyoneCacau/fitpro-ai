import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Repeat2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FoodItemFormFields } from "@/components/diet/FoodItemFormFields";
import {
  createMealSubstitutionSet,
  formatFoodItemPortion,
  getMealSubstitutionGroups,
  getDietErrorMessage,
  removeMealSubstitutionSet,
  type DietMeal,
  type FoodUnitId,
  defaultQuantityForUnit,
} from "@/lib/diet";

export function DietMealSubstitutionsEditor({
  meal,
  onInvalidate,
}: {
  meal: DietMeal;
  onInvalidate: () => void;
}) {
  const groups = getMealSubstitutionGroups(meal);
  const [addingToSetId, setAddingToSetId] = useState<string | null>(null);

  const createSet = useMutation({
    mutationFn: async () => {
      const nextNum = groups.length + 1;
      return createMealSubstitutionSet(meal.id, `Substituição ${nextNum}`, nextNum);
    },
    onSuccess: (set) => {
      onInvalidate();
      setAddingToSetId(set.id);
    },
  });

  const removeSet = useMutation({
    mutationFn: removeMealSubstitutionSet,
    onSuccess: onInvalidate,
  });

  return (
    <div className="border-t border-dashed border-primary/30 bg-primary/5 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-primary flex items-center gap-1">
          <Repeat2 className="size-3.5" />
          Substituições desta refeição
        </p>
        <button
          type="button"
          disabled={createSet.isPending}
          onClick={() => createSet.mutate()}
          className="text-[10px] font-bold text-primary"
        >
          + Nova substituição
        </button>
      </div>

      {groups.length === 0 && (
        <p className="text-[10px] text-muted-foreground">
          Ex.: opção com whey + leite + banana no café da manhã.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.set.id} className="rounded-xl border border-border bg-card/80 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold">{group.set.name}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAddingToSetId(addingToSetId === group.set.id ? null : group.set.id)}
                className="text-[10px] font-bold text-primary"
              >
                + Alimento
              </button>
              <button
                type="button"
                onClick={() => removeSet.mutate(group.set.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
          {group.items.length > 0 && (
            <ul className="space-y-1 mb-2">
              {group.items.map((item) => (
                <li key={item.id} className="text-xs text-muted-foreground">
                  {formatFoodItemPortion(item)}
                </li>
              ))}
            </ul>
          )}
          {addingToSetId === group.set.id && (
            <SubstitutionItemForm
              mealId={meal.id}
              substitutionSetId={group.set.id}
              onCancel={() => setAddingToSetId(null)}
              onSaved={() => {
                onInvalidate();
                setAddingToSetId(group.set.id);
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SubstitutionItemForm({
  mealId,
  substitutionSetId,
  onCancel,
  onSaved,
}: {
  mealId: string;
  substitutionSetId: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [food, setFood] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<FoodUnitId>("un");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!food.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { count } = await supabase
        .from("diet_meal_items")
        .select("*", { count: "exact", head: true })
        .eq("substitution_set_id", substitutionSetId);

      const { error: insertError } = await supabase.from("diet_meal_items").insert({
        meal_id: mealId,
        substitution_set_id: substitutionSetId,
        food: food.trim(),
        quantity: Number(quantity) || 0,
        unit,
        kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        notes: notes.trim() || null,
        position: (count ?? 0) + 1,
      });
      if (insertError) throw insertError;
      setFood("");
      setQuantity(defaultQuantityForUnit(unit));
      setNotes("");
      onSaved();
    } catch (err) {
      setError(getDietErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-2 pt-2 border-t border-border">
      <FoodItemFormFields
        food={food}
        quantity={quantity}
        unit={unit}
        itemNotes={notes}
        onFoodChange={setFood}
        onQuantityChange={setQuantity}
        onUnitChange={setUnit}
        onNotesChange={setNotes}
        disabled={saving}
        foodPlaceholder="Ex.: whey, leite desnatado, banana"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving || !food.trim()} className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 text-xs font-bold">
          {saving ? "Salvando…" : "Adicionar"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-muted-foreground px-2">
          Fechar
        </button>
      </div>
    </form>
  );
}
