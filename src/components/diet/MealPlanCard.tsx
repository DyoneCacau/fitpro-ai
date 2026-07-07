import { useState } from "react";
import { Check, CheckCircle2, ChevronDown, Loader2, Repeat2 } from "lucide-react";
import {
  formatFoodItemPortion,
  getMealMainItems,
  getMealSlotMeta,
  getMealSubstitutionGroups,
  type DietMeal,
  type DietSubstitution,
} from "@/lib/diet";
import { cn } from "@/lib/utils";

export function MealPlanCard({
  meal,
  showSubstitutions = true,
  defaultExpanded = false,
  completed = false,
  onToggleComplete,
  completing = false,
  planSubstitutions = [],
}: {
  meal: DietMeal;
  mealIndex?: number;
  showSubstitutions?: boolean;
  defaultExpanded?: boolean;
  completed?: boolean;
  onToggleComplete?: () => void;
  completing?: boolean;
  planSubstitutions?: DietSubstitution[];
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [openSubstId, setOpenSubstId] = useState<string | null>(null);
  const meta = getMealSlotMeta(meal.slot);
  const mainItems = getMealMainItems(meal);
  const substGroups = getMealSubstitutionGroups(meal);
  const timeLabel = meal.time_label ?? meta.time;
  const mealTitle = meta.label;

  function planSubsForFood(food: string) {
    const norm = food.trim().toLowerCase();
    return planSubstitutions.filter((s) => s.original_food.trim().toLowerCase() === norm);
  }

  function substPanelKey(mealSetId: string | null, food: string) {
    return mealSetId ? `meal:${mealSetId}` : `plan:${food.trim().toLowerCase()}`;
  }

  if (mainItems.length === 0 && substGroups.length === 0 && !meal.description?.trim()) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-colors",
        completed ? "border-emerald-500/35 bg-emerald-500/[0.03]" : "border-border",
      )}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center justify-between gap-3 px-4 py-3.5 text-left min-w-0"
          aria-expanded={expanded}
        >
          <div className="min-w-0">
            <p className="text-sm font-black text-primary leading-tight">{mealTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{timeLabel}</p>
          </div>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>

        {onToggleComplete && (
          <button
            type="button"
            onClick={onToggleComplete}
            disabled={completing}
            className="flex items-center px-3 border-l border-border/60 shrink-0"
            aria-label={completed ? "Desmarcar refeição" : "Marcar refeição realizada"}
          >
            {completing ? (
              <Loader2 className="size-6 animate-spin text-primary" />
            ) : (
              <CheckCircle2
                className={cn(
                  "size-6 transition-colors",
                  completed ? "text-emerald-500 fill-emerald-500/20" : "text-muted-foreground/35",
                )}
              />
            )}
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="rounded-lg bg-muted/40 px-3 py-2.5 space-y-2">
            {meal.description?.trim() && (
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap border-b border-border/50 pb-2">
                {meal.description.trim()}
              </p>
            )}

            {mainItems.length > 0 ? (
              mainItems.map((item, idx) => {
                const mealGroup = substGroups[idx];
                const planSubs = planSubsForFood(item.food);
                const hasMealOptions = showSubstitutions && !!mealGroup?.items.length;
                const hasPlanOptions = showSubstitutions && planSubs.length > 0;
                const hasOptions = hasMealOptions || hasPlanOptions;
                const panelKey = hasMealOptions
                  ? substPanelKey(mealGroup!.set.id, item.food)
                  : hasPlanOptions
                    ? substPanelKey(null, item.food)
                    : null;
                const isPanelOpen = panelKey != null && openSubstId === panelKey;

                return (
                  <div key={item.id}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs leading-relaxed text-foreground flex items-start gap-1.5 min-w-0">
                        {completed && <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />}
                        <span>{formatFoodItemPortion(item)}</span>
                      </p>
                      {hasOptions && panelKey && (
                        <button
                          type="button"
                          onClick={() => setOpenSubstId((id) => (id === panelKey ? null : panelKey))}
                          className="shrink-0 text-[10px] font-bold text-primary underline-offset-2 hover:underline"
                        >
                          Opções
                        </button>
                      )}
                    </div>
                    {isPanelOpen && hasMealOptions && mealGroup && (
                      <div className="mt-1.5 pl-2 border-l-2 border-primary/30 space-y-0.5">
                        <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                          <Repeat2 className="size-3" /> {mealGroup.set.name}
                        </p>
                        {mealGroup.items.map((alt) => (
                          <p key={alt.id} className="text-[11px] text-muted-foreground">
                            {formatFoodItemPortion(alt)}
                          </p>
                        ))}
                      </div>
                    )}
                    {isPanelOpen && !hasMealOptions && hasPlanOptions && (
                      <div className="mt-1.5 pl-2 border-l-2 border-primary/30 space-y-0.5">
                        <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                          <Repeat2 className="size-3" /> Substituições
                        </p>
                        {planSubs.map((s) => (
                          <p key={s.id} className="text-[11px] text-muted-foreground">
                            {s.substitute_food}
                            {s.notes?.trim() ? ` · ${s.notes.trim()}` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : showSubstitutions && substGroups.length > 0 ? (
              substGroups.map((group) => (
                <div key={group.set.id}>
                  <p className="text-[10px] font-bold text-primary mb-1">{group.set.name}</p>
                  {group.items.map((item) => (
                    <p key={item.id} className="text-xs leading-relaxed">
                      {formatFoodItemPortion(item)}
                    </p>
                  ))}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Sem alimentos cadastrados.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
