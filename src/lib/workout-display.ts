type SetLike = { target_reps: string; target_load?: number | null };

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
