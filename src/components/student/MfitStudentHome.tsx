import { Link } from "@tanstack/react-router";
import { CalendarClock, ClipboardList, Dumbbell, LineChart } from "lucide-react";
import { useLinkedProfessional } from "@/hooks/use-linked-professional";
import { formatProfessionalRegistry } from "@/lib/professional";
import { greetingForNow } from "@/lib/workout-display";

const WEEK = [
  { key: "S", label: "S" },
  { key: "T", label: "T" },
  { key: "Q", label: "Q" },
  { key: "Q2", label: "Q" },
  { key: "S2", label: "S" },
  { key: "S3", label: "S" },
  { key: "D", label: "D" },
] as const;

const MENU = [
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/agenda", label: "Agenda", icon: CalendarClock },
  { to: "/avaliacoes", label: "Avaliações", icon: ClipboardList },
  { to: "/avaliacoes", label: "Meu progresso", icon: LineChart },
] as const;

export function MfitStudentHome({ studentName }: { studentName: string }) {
  const { professional } = useLinkedProfessional();
  const firstName = studentName.split(" ")[0];
  const proInitials = (professional?.full_name ?? "P")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const registry = formatProfessionalRegistry(
    professional?.registry_type,
    professional?.registry_number,
  );
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-background">
      <div className="bg-gradient-hero px-5 pt-10 pb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Dumbbell className="size-7 text-primary" strokeWidth={2.5} />
          <span className="text-lg font-black tracking-tight text-foreground">
            FitPro <span className="text-primary">AI</span>
          </span>
        </div>

        {professional && (
          <div className="flex flex-col items-center mb-4">
            <div className="size-20 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-xl font-black shadow-glow">
              {proInitials}
            </div>
            <p className="mt-3 text-base font-bold capitalize text-foreground">
              {professional.full_name}
            </p>
            {registry && <p className="text-xs text-primary mt-0.5">{registry}</p>}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {greetingForNow()},{" "}
          <span className="font-semibold text-foreground">{firstName}!</span>
        </p>
      </div>

      <div className="px-4 pb-6">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card -mt-2">
          <p className="text-center text-sm font-bold text-foreground mb-3">
            Frequência de Treinos
          </p>
          <div className="flex justify-between gap-1">
            {WEEK.map((day, i) => {
              const isToday = i === todayIndex;
              return (
                <div key={day.key} className="flex flex-col items-center gap-1.5 flex-1">
                  <span className="text-[11px] font-bold text-primary">{day.label}</span>
                  <div
                    className={`size-9 rounded-full border-2 flex items-center justify-center ${
                      isToday
                        ? "border-primary bg-primary/15 shadow-glow"
                        : "border-border bg-background"
                    }`}
                  >
                    {isToday && <span className="text-primary text-xs font-bold">!</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {MENU.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className="block rounded-2xl border border-border bg-card p-4 flex items-center gap-3 min-h-[88px] active:scale-[0.98] transition-transform"
              >
                <div className="size-14 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
                  <Icon className="size-7 text-primary" strokeWidth={2} />
                </div>
                <span className="min-w-0 flex-1 text-foreground font-bold text-sm leading-snug">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
