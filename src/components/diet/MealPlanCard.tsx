import { formatFoodItemDietbox, getMealMainItems, getMealSlotMeta, getMealSubstitutionGroups, type DietMeal } from "@/lib/diet";

export function MealPlanCard({ meal, showSubstitutions = true }: { meal: DietMeal; showSubstitutions?: boolean }) {
  const meta = getMealSlotMeta(meal.slot);
  const mainItems = getMealMainItems(meal);
  const substGroups = getMealSubstitutionGroups(meal);

  if (mainItems.length === 0 && substGroups.length === 0 && !meal.description?.trim()) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">
        {meta.label} <span className="font-normal">({meal.time_label ?? meta.time})</span>
      </p>
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="px-4 py-3 space-y-2">
          {mainItems.map((item) => (
            <p key={item.id} className="text-sm leading-snug">
              {formatFoodItemDietbox(item)}
            </p>
          ))}
        </div>

        {meal.description?.trim() && (
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-xs font-bold mb-1.5">Observação:</p>
            <ul className="space-y-1">
              {meal.description.split("\n").filter((l) => l.trim()).map((line, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                  - {line.trim().replace(/^-\s*/, "")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showSubstitutions &&
          substGroups.map((group) => (
            <div key={group.set.id} className="px-4 py-3 border-t border-dashed border-primary/30 bg-primary/5">
              <p className="text-xs font-bold text-primary mb-2">{group.set.name}</p>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <p key={item.id} className="text-sm leading-snug">
                    {formatFoodItemDietbox(item)}
                  </p>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
