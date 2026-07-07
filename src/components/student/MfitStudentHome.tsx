import { Link } from "@tanstack/react-router";
import { CalendarClock, Dumbbell, Apple, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HealthDashboardCard } from "@/components/student/wearables/HealthDashboardCard";
import { useDisplayName } from "@/hooks/use-display-name";
import { greetingForNow } from "@/lib/workout-display";

const MENU = [
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/agenda", label: "Agenda", icon: CalendarClock },
  { to: "/dieta", label: "Alimentação", icon: Apple },
  { to: "/feed", label: "Feed", icon: Users },
] as const;

export function MfitStudentHome() {
  const { name, firstName, initials, avatarUrl } = useDisplayName();

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-background">
      <div className="bg-gradient-hero px-5 pt-10 pb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Dumbbell className="size-7 text-primary" strokeWidth={2.5} />
          <span className="text-lg font-black tracking-tight text-foreground">
            FitPro <span className="text-primary">AI</span>
          </span>
        </div>

        <Link to="/perfil" className="inline-flex flex-col items-center mb-4 active:opacity-80">
          <Avatar className="size-20 border-2 border-primary/30 shadow-glow">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl font-black">
              {initials}
            </AvatarFallback>
          </Avatar>
          <p className="mt-3 text-base font-bold text-foreground">{name}</p>
          <p className="text-[11px] text-primary mt-1 font-semibold">Ver perfil</p>
        </Link>

        <p className="text-sm text-muted-foreground">
          {greetingForNow()},{" "}
          <span className="font-semibold text-foreground">{firstName}!</span>
        </p>
      </div>

      <div className="px-4 pb-6">
        <div className="-mt-2">
          <HealthDashboardCard compact />
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
