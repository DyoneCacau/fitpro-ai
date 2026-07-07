import { AlertCircle, ChevronRight } from "lucide-react";

export function OnboardingBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-center gap-2 bg-gradient-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95"
    >
      <AlertCircle className="size-4 shrink-0" />
      <span>Para iniciar as vendas na plataforma, é necessário completar seu cadastro.</span>
      <ChevronRight className="size-4 shrink-0" />
    </button>
  );
}
