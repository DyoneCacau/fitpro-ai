import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import type { ComponentType } from "react";

type Point = { date: string; value: number; label: string };

export function EvolutionMetricCard({
  title,
  unit,
  icon: Icon,
  data,
}: {
  title: string;
  unit: string;
  icon: ComponentType<{ className?: string }>;
  data: Point[];
}) {
  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const delta = last.value - first.value;
  const trend = Math.abs(delta) < 0.05 ? "stable" : delta < 0 ? "down" : "up";
  const trendLabel =
    trend === "down" ? "Descendo" : trend === "up" ? "Subindo" : "Estável";
  const TrendIcon = trend === "down" ? TrendingDown : trend === "up" ? TrendingUp : Minus;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
      <div className="p-4 border-b border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-primary" />
              <span className="text-sm font-bold">{title}</span>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 mt-2 rounded-full px-2 py-0.5 text-[10px] font-bold",
                trend === "down" && "bg-emerald-500/15 text-emerald-500",
                trend === "up" && "bg-orange-500/15 text-orange-400",
                trend === "stable" && "bg-muted text-muted-foreground",
              )}
            >
              <TrendIcon className="size-3" />
              {trendLabel}
            </span>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-primary leading-none">
              {formatNumber(last.value)}
              <span className="text-sm font-semibold ml-0.5">{unit}</span>
            </p>
            {delta !== 0 && (
              <p
                className={cn(
                  "text-xs font-bold mt-1",
                  delta < 0 ? "text-emerald-500" : "text-orange-400",
                )}
              >
                {delta > 0 ? "+" : ""}
                {formatNumber(delta)}
                {unit}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="rounded-xl bg-muted/30 py-2">
            <p className="text-[10px] text-muted-foreground">Inicial</p>
            <p className="text-sm font-bold">
              {formatNumber(first.value)}
              {unit}
            </p>
          </div>
          <div className="rounded-xl bg-muted/30 py-2">
            <p className="text-[10px] text-muted-foreground">Variação</p>
            <p className="text-sm font-bold">
              {delta === 0 ? "Estável" : `${delta > 0 ? "+" : ""}${formatNumber(delta)}${unit}`}
            </p>
          </div>
          <div className="rounded-xl bg-muted/30 py-2">
            <p className="text-[10px] text-muted-foreground">Registros</p>
            <p className="text-sm font-bold">{sorted.length}</p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-3">
          Acompanhando desde:{" "}
          {format(parseISO(first.date), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {sorted.length >= 2 && (
        <div className="p-4 pt-2">
          <ChartContainer
            config={{ value: { label: title, color: "hsl(var(--primary))" } }}
            className="h-[180px] w-full aspect-auto"
          >
            <LineChart data={sorted}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} width={36} stroke="hsl(var(--muted-foreground))" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}

function formatNumber(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export type PeriodFilter = "7d" | "1m" | "3m" | "6m" | "1y" | "all";

export function filterByPeriod<T extends { date: string }>(data: T[], period: PeriodFilter): T[] {
  if (period === "all") return data;
  const days =
    period === "7d" ? 7 : period === "1m" ? 30 : period === "3m" ? 90 : period === "6m" ? 180 : 365;
  const cutoff = subDays(new Date(), days).toISOString().slice(0, 10);
  return data.filter((d) => d.date >= cutoff);
}

export const PERIOD_OPTIONS: { id: PeriodFilter; label: string }[] = [
  { id: "7d", label: "7D" },
  { id: "1m", label: "1M" },
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" },
  { id: "1y", label: "1A" },
  { id: "all", label: "Todos" },
];
