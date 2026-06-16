import { Link, useLocation } from "@tanstack/react-router";
import { Home, Dumbbell, Apple, Users, User, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const studentItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/dieta", label: "Dieta", icon: Apple },
  { to: "/feed", label: "Feed", icon: Users },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

const professionalItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/alunos", label: "Alunos", icon: GraduationCap },
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/dieta", label: "Dieta", icon: Apple },
  { to: "/feed", label: "Feed", icon: Users },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  const loc = useLocation();
  const { role } = useAuth();
  const items = role === "personal" || role === "admin" ? professionalItems : studentItems;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {items.map((it) => {
          const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
