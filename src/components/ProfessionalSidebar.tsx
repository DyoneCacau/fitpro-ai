import { Link, useLocation } from "@tanstack/react-router";
import {
  Apple,
  Dumbbell,
  Home,
  Rss,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Início", icon: Home, match: (path: string) => path === "/" },
  {
    to: "/clientes",
    label: "Clientes",
    icon: Users,
    match: (path: string) => path === "/clientes" || path.startsWith("/alunos/"),
  },
  { to: "/treinos", label: "Treinos", icon: Dumbbell, match: (path: string) => path.startsWith("/treinos") || path.startsWith("/treino/") },
  { to: "/dieta", label: "Dieta", icon: Apple, match: (path: string) => path === "/dieta" },
  { to: "/feed", label: "Feed", icon: Rss, match: (path: string) => path === "/feed" },
  { to: "/perfil", label: "Perfil", icon: User, match: (path: string) => path === "/perfil" },
] as const;

export function ProfessionalSidebar() {
  const loc = useLocation();

  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 md:flex-col md:shrink-0 md:border-r md:border-border md:bg-card/40 md:min-h-screen md:sticky md:top-0">
      <div className="px-5 pt-8 pb-4 border-b border-border">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">FitPro AI</p>
        <p className="text-sm font-bold text-foreground mt-1">Área do profissional</p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
          Use no computador para cadastros, planos e acompanhamento.
        </p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match(loc.pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={2.2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
