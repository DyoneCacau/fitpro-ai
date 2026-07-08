type SetLike = { target_reps: string; target_load?: number | null };

export type SetType = "normal" | "drop" | "falha" | "rest_pause";

export const SET_TYPE_OPTIONS: Array<{ value: SetType; label: string; short: string }> = [
  { value: "normal", label: "Normal", short: "Normal" },
  { value: "falha", label: "Até a falha", short: "Falha" },
  { value: "drop", label: "Drop-set", short: "Drop" },
  { value: "rest_pause", label: "Rest-pause", short: "Rest-pause" },
];

export function setTypeLabel(value: string | null | undefined, short = false): string {
  const opt = SET_TYPE_OPTIONS.find((o) => o.value === value);
  if (!opt) return "";
  return short ? opt.short : opt.label;
}

export function formatSeriesLabel(sets: SetLike[]): string {
  if (sets.length === 0) return "—";

  const labels = sets.map((s) => s.target_reps.trim()).filter(Boolean);
  if (labels.length === 0) return `${sets.length} séries`;

  const allSame = labels.every((l) => l === labels[0]);
  if (allSame) return `${sets.length}x ${labels[0]}`;

  return labels.join(" · ");
}

export function formatLoadLabel(sets: SetLike[]): string {
  const loads = sets.map((s) => Number(s.target_load ?? 0));
  const max = Math.max(...loads, 0);
  if (max <= 0) return "0kg";
  const allSame = loads.every((l) => l === loads[0]);
  if (allSame) return `${max}kg`;
  return loads.map((l) => `${l}kg`).join(" · ");
}

export function formatRestLabel(seconds: number | null | undefined): string {
  return `${seconds ?? 60}s`;
}

export function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
