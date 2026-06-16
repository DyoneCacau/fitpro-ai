import { Award, ChevronRight } from "lucide-react";
import { formatProfessionalRegistry, formatProfessionalSpecialties } from "@/lib/professional";
import type { LinkedProfessional } from "@/hooks/use-linked-professional";

export function LinkedProfessionalCard({
  professional,
  compact = false,
}: {
  professional: LinkedProfessional;
  compact?: boolean;
}) {
  const initials = (professional.full_name ?? "P")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-border bg-card ${
        compact ? "p-4" : "p-4"
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-full bg-gradient-primary text-primary-foreground font-bold ${
          compact ? "h-12 w-12 text-sm" : "h-14 w-14"
        }`}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">
          {professional.full_name ?? "Profissional"}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatProfessionalSpecialties(
            professional.is_personal_trainer,
            professional.is_nutritionist,
          )}
        </p>
        {formatProfessionalRegistry(professional.registry_type, professional.registry_number) && (
          <p className="text-[11px] text-primary mt-0.5">
            {formatProfessionalRegistry(professional.registry_type, professional.registry_number)}
          </p>
        )}
        {professional.phone && (
          <p className="text-[11px] text-primary mt-0.5">{professional.phone}</p>
        )}
      </div>
      {compact ? (
        <button type="button" className="rounded-full bg-primary/15 p-2 text-primary">
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : (
        <Award className="h-5 w-5 text-primary shrink-0" />
      )}
    </div>
  );
}
