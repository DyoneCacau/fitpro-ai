import { Link } from "@tanstack/react-router";
import { Flame, Footprints, Heart, Moon, Route, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHealthDashboard, useSyncWearables } from "@/hooks/use-health-dashboard";
import { cn } from "@/lib/utils";

const WEEK_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"] as const;

export function HealthDashboardCard({
  compact = false,
  userId,
  readOnly = false,
  title,
}: {
  compact?: boolean;
  userId?: string;
  readOnly?: boolean;
  title?: string;
}) {
  const { data, isLoading } = useHealthDashboard(userId);
  const sync = useSyncWearables();
  const todayIndex = (new Date().getDay() + 6) % 7;

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mx-auto mb-4" />
        <div className="h-16 bg-muted rounded" />
      </div>
    );
  }

  const hasWearable = data.connectedProviders.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">
          {title ?? (compact ? "Atividade hoje" : "Painel de saúde")}
        </p>
        {!readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
            aria-label="Sincronizar wearables"
          >
            <RefreshCw className={cn("size-4", sync.isPending && "animate-spin")} />
          </Button>
        )}
      </div>

      <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        <MetricPill icon={Footprints} label="Passos" value={data.steps.toLocaleString("pt-BR")} />
        <MetricPill icon={Flame} label="Calorias" value={`${data.activeCalories} kcal`} />
        <MetricPill icon={Route} label="Distância" value={`${data.distanceKm} km`} />
        {data.heartRateAvg != null && (
          <MetricPill icon={Heart} label="FC média" value={`${Math.round(data.heartRateAvg)} bpm`} />
        )}
        {data.sleepHours != null && (
          <MetricPill icon={Moon} label="Sono" value={`${data.sleepHours} h`} />
        )}
      </div>

      <div>
        <p className="text-center text-xs font-bold text-muted-foreground mb-2">
          Frequência de Treinos
        </p>
        <div className="flex justify-between gap-1">
          {WEEK_LABELS.map((label, i) => {
            const trained = data.workoutDaysThisWeek[i];
            const isToday = i === todayIndex;
            return (
              <div key={`${label}-${i}`} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[10px] font-bold text-primary">{label}</span>
                <div
                  className={cn(
                    "size-8 rounded-full border-2 flex items-center justify-center",
                    trained
                      ? "border-primary bg-primary text-primary-foreground"
                      : isToday
                        ? "border-primary bg-primary/15"
                        : "border-border bg-background",
                  )}
                >
                  {trained && <span className="text-[10px] font-bold">✓</span>}
                  {!trained && isToday && <span className="text-primary text-[10px] font-bold">!</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data.mealsTotalToday > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Refeições hoje:{" "}
          <span className="font-semibold text-foreground">
            {data.mealsCompletedToday}/{data.mealsTotalToday}
          </span>
        </p>
      )}

      {!compact && data.recentActivities.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Atividades recentes
          </p>
          {data.recentActivities.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs"
            >
              <span className="font-semibold truncate flex-1">{a.name}</span>
              <span className="text-muted-foreground ml-2 shrink-0">
                {a.calories != null ? `${Math.round(Number(a.calories))} kcal` : a.activity_type}
              </span>
            </div>
          ))}
        </div>
      )}

      {!readOnly && !hasWearable && (
        <Link
          to="/integracoes"
          className="block text-center text-xs font-semibold text-primary hover:underline"
        >
          Conectar relógio →
        </Link>
      )}

      {readOnly && !hasWearable && (
        <p className="text-center text-xs text-muted-foreground">
          O aluno ainda não conectou nenhum relógio.
        </p>
      )}
    </div>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
        <Icon className="size-3.5" />
        <span className="text-[10px] font-semibold uppercase">{label}</span>
      </div>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
