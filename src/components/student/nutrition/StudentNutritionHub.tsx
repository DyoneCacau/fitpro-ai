import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Apple,
  BookOpen,
  ChefHat,
  ClipboardList,
  ShoppingCart,
} from "lucide-react";
import { EmptyState, FeatureHubCard, SubPageHeader, WeekDayTabs } from "@/components/student/FeatureHub";
import { DietPlanToolbar } from "@/components/diet/DietPlanToolbar";
import { MealPlanCard } from "@/components/diet/MealPlanCard";
import { useAuth } from "@/hooks/use-auth";
import {
  buildRecipesFromPlan,
  buildShoppingList,
  fetchStudentActiveDietPlan,
  formatFoodQuantity,
  type DietPlan,
} from "@/lib/diet";

type NutritionView = "hub" | "plano" | "compras" | "receitas";

const SLOT_ORDER = ["cafe", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"] as const;

export function StudentNutritionHub() {
  const [view, setView] = useState<NutritionView>("hub");
  const { user } = useAuth();

  const { data: plan, isLoading } = useQuery({
    queryKey: ["dietPlanFull", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchStudentActiveDietPlan(user!.id),
  });

  if (view === "hub") {
    return (
      <>
        <header className="bg-gradient-hero px-5 pt-12 pb-5">
          <h1 className="text-2xl font-bold text-foreground">Alimentação</h1>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Consulte o espaço disponibilizado pelo seu profissional sobre a alimentação.
          </p>
        </header>
        <div className="px-5 py-5 space-y-3 pb-8">
          <FeatureHubCard
            icon={ClipboardList}
            title="Plano Alimentar"
            description="Cardápio com refeições, observações e substituições por refeição."
            onClick={() => setView("plano")}
          />
          <FeatureHubCard
            icon={ShoppingCart}
            title="Lista de Compras"
            description="Lista gerada a partir do plano alimentar."
            onClick={() => setView("compras")}
          />
          <FeatureHubCard
            icon={ChefHat}
            title="Receitas"
            description="Preparos e orientações das refeições."
            onClick={() => setView("receitas")}
          />
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <SubPageHeader title="Carregando…" onBack={() => setView("hub")} />
        <p className="px-5 py-10 text-sm text-muted-foreground text-center">Aguarde…</p>
      </>
    );
  }

  if (!plan) {
    return (
      <>
        <SubPageHeader title="Sem plano" onBack={() => setView("hub")} />
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
      return <MealPlanView plan={plan} onBack={() => setView("hub")} />;
    case "compras":
      return <ShoppingListView plan={plan} onBack={() => setView("hub")} />;
    case "receitas":
      return <RecipesView plan={plan} onBack={() => setView("hub")} />;
    default:
      return null;
  }
}

function MealPlanView({ plan, onBack }: { plan: DietPlan; onBack: () => void }) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const meals = (plan.diet_meals ?? [])
    .slice()
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));

  return (
    <>
      <SubPageHeader title="Plano Alimentar" subtitle={plan.name} onBack={onBack} />
      <WeekDayTabs selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      <div className="px-5 py-4">
        <DietPlanToolbar
          plan={plan}
          onApplyTemplate={() => {}}
          onSaveTemplate={() => {}}
          showApplyTemplate={false}
          showSaveTemplate={false}
        />
      </div>
      <div className="px-5 pb-8 space-y-5">
        <h2 className="text-sm font-bold text-primary">Refeições</h2>
        {meals.length === 0 ? (
          <EmptyState icon={Apple} title="Sem refeições" description="Seu plano ainda não possui refeições cadastradas." />
        ) : (
          meals.map((m) => <MealPlanCard key={m.id} meal={m} />)
        )}
      </div>
    </>
  );
}

function ShoppingListView({ plan, onBack }: { plan: DietPlan; onBack: () => void }) {
  const items = buildShoppingList(plan);
  return (
    <>
      <SubPageHeader title="Lista de Compras" subtitle="Gerada a partir do plano alimentar" onBack={onBack} />
      <div className="px-5 py-5 pb-8">
        {items.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Lista vazia" description="Adicione alimentos ao plano para gerar a lista de compras." />
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
          <EmptyState icon={ChefHat} title="Nenhuma receita" description="Seu profissional ainda não cadastrou preparos nas refeições." />
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
