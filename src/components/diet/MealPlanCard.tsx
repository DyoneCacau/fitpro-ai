import { useState } from "react";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import {
  formatFoodItemDietbox,
  getMealMainItems,
  getMealSlotMeta,
  getMealSubstitutionGroups,
  type DietMeal,
} from "@/lib/diet";

export function MealPlanCard({
  meal,
  showSubstitutions = true,
  defaultExpanded = false,
  completed = false,
  onToggleComplete,
  completing = false,
}: {
  meal: DietMeal;
  showSubstitutions?: boolean;
  defaultExpanded?: boolean;
  completed?: boolean;
  onToggleComplete?: () => void;
  completing?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const meta = getMealSlotMeta(meal.slot);
  const mainItems = getMealMainItems(meal);
  const substGroups = getMealSubstitutionGroups(meal);

  if (mainItems.length === 0 && substGroups.length === 0 && !meal.description?.trim()) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border bg-card overflow-hidden shadow-sm transition-colors ${
        completed ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-3 min-w-0 text-left hover:opacity-80 transition-opacity"
          aria-expanded={expanded}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold">{meta.label}</p>
              {completed && (
                <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Realizado
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {meal.time_label ?? meta.time}
              {mainItems.length > 0 &&
                ` · ${mainItems.length} ${mainItems.length === 1 ? "item" : "itens"}`}
            </p>
          </div>
          <ChevronDown
            className={`size-4 text-muted-foreground shrink-0 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {onToggleComplete && (
          <button
            type="button"
            onClick={onToggleComplete}
            disabled={completing}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background/80 hover:border-primary/40 disabled:opacity-50"
            aria-label={completed ? "Desmarcar refeição realizada" : "Marcar refeição como realizada"}
            title={completed ? "Desmarcar" : "Marcar como realizado"}
          >
            {completing ? (
              <Loader2 className="size-5 animate-spin text-primary" />
            ) : (
              <CheckCircle2
                className={`size-5 ${
                  completed ? "text-primary fill-primary/15" : "text-muted-foreground"
                }`}
              />
            )}
          </button>
        )}
      </div>

      {expanded && (
        <>
          {mainItems.length > 0 && (
            <div className="px-4 py-3 border-t border-border space-y-2">
              {mainItems.map((item) => (
                <p key={item.id} className="text-sm leading-snug">
                  {formatFoodItemDietbox(item)}
                </p>
              ))}
            </div>
          )}

          {meal.description?.trim() && (
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-xs font-bold mb-1.5">Observação:</p>
              <ul className="space-y-1">
                {meal.description
                  .split("\n")
                  .filter((l) => l.trim())
                  .map((line, i) => (
                    <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                      - {line.trim().replace(/^-\s*/, "")}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {showSubstitutions &&
            substGroups.map((group) => (
              <div
                key={group.set.id}
                className="px-4 py-3 border-t border-dashed border-primary/30 bg-primary/5"
              >
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
        </>
      )}
    </div>
  );
}
