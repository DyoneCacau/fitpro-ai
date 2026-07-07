import { Link, useLocation } from "@tanstack/react-router";
import { Home, Dumbbell, Apple, Users, User } from "lucide-react";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/treinos", label: "Treino", icon: Dumbbell },
  { to: "/dieta", label: "Dieta", icon: Apple },
  { to: "/feed", label: "Feed", icon: Users },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  const loc = useLocation();
  const items = navItems;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.35)] isolate">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {items.map((it) => {
          const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              aria-label={it.label}
              className="relative z-10 flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors min-w-0"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </div>
              <span
                className={`max-w-[4.5rem] truncate text-center text-[10px] font-medium ${
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
