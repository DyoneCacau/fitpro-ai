import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Apple, BookOpen, ChefHat, ChevronDown, ClipboardList, Repeat2, ShoppingCart } from "lucide-react";
import { EmptyState, SubPageHeader } from "@/components/student/FeatureHub";
import { PremiumCollapsible } from "@/components/student/ui/PremiumCollapsible";
import { DietPlanToolbar } from "@/components/diet/DietPlanToolbar";
import { defaultDietWeekDay, DietWeekDayTabs } from "@/components/diet/DietWeekDayTabs";
import { MealPlanCard } from "@/components/diet/MealPlanCard";
import { useAuth } from "@/hooks/use-auth";
import {
  buildRecipesFromPlan,
  buildShoppingList,
  fetchMealCompletions,
  fetchStudentActiveDietPlan,
  formatFoodQuantity,
  setMealCompletion,
  sortSubstitutions,
  sortSupplements,
  todayIsoDate,
  type DietPlan,
} from "@/lib/diet";

type NutritionView = "plano" | "compras" | "receitas";

const SLOT_ORDER = ["cafe", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"] as const;

export function StudentNutritionHub() {
  const [view, setView] = useState<NutritionView>("plano");
  const { user } = useAuth();

  const { data: plan, isLoading } = useQuery({
    queryKey: ["dietPlanFull", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchStudentActiveDietPlan(user!.id),
  });

  if (isLoading) {
    return (
      <>
        <header className="bg-gradient-hero px-5 pt-12 pb-5">
          <h1 className="text-2xl font-bold text-foreground">Dieta</h1>
        </header>
        <p className="px-5 py-10 text-sm text-muted-foreground text-center">Carregando…</p>
      </>
    );
  }

  if (!plan) {
    return (
      <>
        <header className="bg-gradient-hero px-5 pt-12 pb-5">
          <h1 className="text-2xl font-bold text-foreground">Dieta</h1>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Consulte o plano alimentar prescrito pelo seu profissional.
          </p>
        </header>
        <EmptyState
          icon={Apple}
          title="Nenhum plano prescrito"
          description="Seu profissional ainda não cadastrou um plano alimentar."
        />
      </>
    );
  }

  switch (view) {
    case "plano":
      return (
        <MealPlanView
          plan={plan}
          onOpenCompras={() => setView("compras")}
          onOpenReceitas={() => setView("receitas")}
        />
      );
    case "compras":
      return <ShoppingListView plan={plan} onBack={() => setView("plano")} />;
    case "receitas":
      return <RecipesView plan={plan} onBack={() => setView("plano")} />;
    default:
      return null;
  }
}

function MealPlanView({
  plan,
  onOpenCompras,
  onOpenReceitas,
}: {
  plan: DietPlan;
  onOpenCompras: () => void;
  onOpenReceitas: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = useMemo(() => todayIsoDate(), []);
  const [selectedDay, setSelectedDay] = useState(defaultDietWeekDay);
  const meals = (plan.diet_meals ?? [])
    .slice()
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
  const supplements = sortSupplements(plan.diet_supplements);
  const substitutions = sortSubstitutions(plan.diet_substitutions);

  const { data: completedMealIds = new Set<string>() } = useQuery({
    queryKey: ["mealCompletions", user?.id, today],
    enabled: !!user?.id,
    queryFn: () => fetchMealCompletions(user!.id, today),
  });

  const toggleCompletion = useMutation({
    mutationFn: async ({ mealId, completed }: { mealId: string; completed: boolean }) => {
      await setMealCompletion(user!.id, mealId, completed, today);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mealCompletions", user?.id, today] }),
  });

  const completedCount = meals.filter((m) => completedMealIds.has(m.id)).length;

  return (
    <>
      <header className="bg-gradient-hero px-5 pt-12 pb-4 border-b border-border/40">
        <h1 className="text-xl font-black text-foreground">Plano Alimentar</h1>
        {plan.name && plan.name !== "Plano alimentar" && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{plan.name}</p>
        )}
        <div className="mt-4">
          <DietWeekDayTabs selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        </div>
      </header>

      <div className="px-5 py-4 space-y-3 pb-8">
        {meals.length > 0 && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              {completedCount}/{meals.length} refeições hoje
            </span>
            <div className="flex-1 max-w-[8rem] h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${meals.length ? (completedCount / meals.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {(plan.kcal_target ?? plan.protein_g) && (
          <p className="text-[11px] text-muted-foreground">
            {plan.kcal_target != null && <span>{Math.round(plan.kcal_target)} kcal</span>}
            {plan.protein_g != null && (
              <span>
                {plan.kcal_target != null ? " · " : ""}
                P {Math.round(plan.protein_g)}g
              </span>
            )}
            {plan.carbs_g != null && <span> · C {Math.round(plan.carbs_g)}g</span>}
            {plan.fat_g != null && <span> · G {Math.round(plan.fat_g)}g</span>}
          </p>
        )}

        {plan.notes?.trim() && (
          <PremiumCollapsible title="Observações" icon={ClipboardList}>
            <p className="whitespace-pre-wrap text-xs leading-relaxed">{plan.notes.trim()}</p>
          </PremiumCollapsible>
        )}

        <DietPlanToolbar
          plan={plan}
          onApplyTemplate={() => {}}
          onSaveTemplate={() => {}}
          showApplyTemplate={false}
          showSaveTemplate={false}
        />

        <div className="space-y-2">
          {meals.length === 0 ? (
            <EmptyState
              icon={Apple}
              title="Sem refeições"
              description="Seu plano ainda não possui refeições cadastradas."
            />
          ) : (
            meals.map((m) => (
              <MealPlanCard
                key={m.id}
                meal={m}
                planSubstitutions={substitutions}
                defaultExpanded={m.slot === "almoco"}
                completed={completedMealIds.has(m.id)}
                completing={
                  toggleCompletion.isPending && toggleCompletion.variables?.mealId === m.id
                }
                onToggleComplete={() =>
                  toggleCompletion.mutate({
                    mealId: m.id,
                    completed: !completedMealIds.has(m.id),
                  })
                }
              />
            ))
          )}
        </div>

        {supplements.length > 0 && (
          <ReadOnlyCollapsibleSection title="Suplementos" defaultExpanded={false}>
            <div className="divide-y divide-border">
              {supplements.map((s) => (
                <div key={s.id} className="px-4 py-3">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.dosage.trim() || "—"}
                    {s.timing?.trim() && ` · ${s.timing.trim()}`}
                  </p>
                  {s.notes?.trim() && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </ReadOnlyCollapsibleSection>
        )}

        {substitutions.length > 0 && (
          <ReadOnlyCollapsibleSection
            title="Substituições alimentares"
            icon={Repeat2}
            defaultExpanded={false}
          >
            <div className="divide-y divide-border">
              {substitutions.map((s) => (
                <div key={s.id} className="px-4 py-3">
                  <p className="text-sm">
                    <span className="font-medium">{s.original_food}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="font-medium text-primary">{s.substitute_food}</span>
                  </p>
                  {s.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{s.notes}</p>}
                </div>
              ))}
            </div>
          </ReadOnlyCollapsibleSection>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onOpenCompras}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:border-primary/30"
          >
            <ShoppingCart className="size-3.5" />
            Lista de compras
          </button>
          <button
            type="button"
            onClick={onOpenReceitas}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:border-primary/30"
          >
            <ChefHat className="size-3.5" />
            Receitas
          </button>
        </div>
      </div>
    </>
  );
}

function ReadOnlyCollapsibleSection({
  title,
  icon: Icon,
  defaultExpanded = false,
  children,
}: {
  title: string;
  icon?: typeof Repeat2;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
        aria-expanded={expanded}
      >
        {Icon && <Icon className="size-4 text-primary shrink-0" />}
        <span className="flex-1 text-sm font-bold">{title}</span>
        <ChevronDown
          className={`size-4 text-muted-foreground shrink-0 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded && <div className="border-t border-border">{children}</div>}
    </div>
  );
}

function ShoppingListView({ plan, onBack }: { plan: DietPlan; onBack: () => void }) {
  const items = buildShoppingList(plan);
  return (
    <>
      <SubPageHeader title="Lista de Compras" subtitle="Gerada a partir do plano alimentar" onBack={onBack} />
      <div className="px-5 py-5 pb-8">
        {items.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Lista vazia"
            description="O plano ainda não possui alimentos para gerar a lista de compras."
          />
        ) : (
          <ul className="rounded-2xl border border-border bg-card divide-y divide-border">
            {items.map((item) => (
              <li key={`${item.food}-${item.unit}`} className="flex justify-between gap-3 px-4 py-3 text-sm">
                <span className="font-medium">{item.food}</span>
                <span className="text-muted-foreground shrink-0">
                  {formatFoodQuantity(item.quantity, item.unit || "g")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function RecipesView({ plan, onBack }: { plan: DietPlan; onBack: () => void }) {
  const recipes = buildRecipesFromPlan(plan);
  return (
    <>
      <SubPageHeader title="Receitas" subtitle="Preparos e orientações das refeições" onBack={onBack} />
      <div className="px-5 py-5 space-y-3 pb-8">
        {recipes.length === 0 ? (
          <EmptyState
            icon={ChefHat}
            title="Nenhuma receita"
            description="Seu profissional ainda não cadastrou preparos nas refeições."
          />
        ) : (
          recipes.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">{r.title}</p>
                <span className="text-xs text-muted-foreground">· {r.time}</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.content}</p>
            </div>
          ))
        )}
      </div>
    </>
  );
}
