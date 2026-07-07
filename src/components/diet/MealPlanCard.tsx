import { useState } from "react";
import { Check, CheckCircle2, ChevronDown, Clock, Loader2, Repeat2 } from "lucide-react";
import { TimelineItem, TimelineList } from "@/components/student/ui/PremiumCollapsible";
import {
  formatFoodItemDietbox,
  getMealMainItems,
  getMealSlotMeta,
  getMealSubstitutionGroups,
  type DietMeal,
  type DietSubstitution,
} from "@/lib/diet";
import { cn } from "@/lib/utils";

export function MealPlanCard({
  meal,
  mealIndex,
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
  const mealTitle = mealIndex != null ? `Refeição ${mealIndex + 1}` : meta.label;

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
        "rounded-2xl border bg-card overflow-hidden shadow-card transition-colors",
        completed ? "border-emerald-500/40 bg-emerald-500/5" : "border-border",
      )}
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-foreground">{mealTitle}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                <Clock className="size-3" />
                {timeLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              {expanded ? "Ocultar" : "Expandir"}
              <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
            </button>
          </div>

          {onToggleComplete && (
            <button
              type="button"
              onClick={onToggleComplete}
              disabled={completing}
              className="shrink-0"
              aria-label={completed ? "Desmarcar refeição" : "Marcar refeição realizada"}
            >
              {completing ? (
                <Loader2 className="size-8 animate-spin text-primary" />
              ) : (
                <CheckCircle2
                  className={cn(
                    "size-8 transition-colors",
                    completed
                      ? "text-emerald-500 fill-emerald-500/20"
                      : "text-muted-foreground/40",
                  )}
                />
              )}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/60 pt-4">
          {meal.description?.trim() && (
            <div className="rounded-xl bg-muted/30 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Observações</p>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {meal.description.trim()}
              </p>
            </div>
          )}

          {mainItems.length > 0 && (
            <TimelineList>
              {mainItems.map((item, idx) => {
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
                  <TimelineItem
                    key={item.id}
                    isLast={idx === mainItems.length - 1 && !isPanelOpen}
                    marker={
                      completed ? (
                        <Check className="size-3 text-emerald-500" strokeWidth={3} />
                      ) : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug">{formatFoodItemDietbox(item)}</p>
                      {hasOptions && panelKey && (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenSubstId((id) => (id === panelKey ? null : panelKey))
                          }
                          className="shrink-0 rounded-lg bg-primary/15 px-2.5 py-1 text-[10px] font-bold text-primary"
                        >
                          Outras opções
                        </button>
                      )}
                    </div>
                    {isPanelOpen && hasMealOptions && mealGroup && (
                      <div className="mt-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-2.5 space-y-1">
                        <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                          <Repeat2 className="size-3" /> {mealGroup.set.name}
                        </p>
                        {mealGroup.items.map((alt) => (
                          <p key={alt.id} className="text-xs text-muted-foreground pl-1">
                            {formatFoodItemDietbox(alt)}
                          </p>
                        ))}
                      </div>
                    )}
                    {isPanelOpen && !hasMealOptions && hasPlanOptions && (
                      <div className="mt-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-2.5 space-y-1">
                        <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                          <Repeat2 className="size-3" /> Substituições
                        </p>
                        {planSubs.map((s) => (
                          <p key={s.id} className="text-xs text-muted-foreground pl-1">
                            {s.substitute_food}
                            {s.notes?.trim() ? ` · ${s.notes.trim()}` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </TimelineItem>
                );
              })}
            </TimelineList>
          )}

          {showSubstitutions && mainItems.length === 0 && substGroups.length > 0 && (
            <div className="space-y-2">
              {substGroups.map((group) => (
                <div
                  key={group.set.id}
                  className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3"
                >
                  <p className="text-xs font-bold text-primary mb-2 flex items-center gap-1">
                    <Repeat2 className="size-3" /> {group.set.name}
                  </p>
                  {group.items.map((item) => (
                    <p key={item.id} className="text-sm leading-snug">
                      {formatFoodItemDietbox(item)}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
