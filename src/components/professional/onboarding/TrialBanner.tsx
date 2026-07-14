import { Sparkles } from "lucide-react";

export function TrialBanner({
  daysLeft,
  onSubscribe,
}: {
  daysLeft: number;
  onSubscribe?: () => void;
}) {
  const label =
    daysLeft <= 0
      ? "Seu período de teste terminou."
      : `Seu período de teste expira em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}.`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-border bg-card px-4 py-2 text-center text-sm">
      <Sparkles className="size-4 shrink-0 text-primary" />
      <span className="font-semibold text-foreground">{label}</span>
      {onSubscribe ? (
        <button
          type="button"
          onClick={onSubscribe}
          className="font-bold text-primary underline-offset-2 hover:underline"
        >
          Assine agora para continuar aproveitando todos os recursos!
        </button>
      ) : (
        <span className="font-medium text-muted-foreground">
          Aproveite o trial para conhecer a plataforma.
        </span>
      )}
    </div>
  );
}
