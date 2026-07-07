import { Link, useLocation } from "@tanstack/react-router";
import {
  Apple,
  Bell,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Dumbbell,
  Home,
  Rss,
  User,
  Users,
} from "lucide-react";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { useProfessionalSidebar } from "@/hooks/use-professional-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Início", icon: Home, tour: "home", match: (path: string) => path === "/" },
  {
    to: "/clientes",
    label: "Clientes",
    icon: Users,
    tour: "clientes",
    match: (path: string) => path === "/clientes" || path.startsWith("/alunos/"),
  },
  {
    to: "/treinos",
    label: "Treinos",
    icon: Dumbbell,
    tour: "treinos",
    match: (path: string) => path.startsWith("/treinos") || path.startsWith("/treino/"),
  },
  { to: "/dieta", label: "Dieta", icon: Apple, tour: "dieta", match: (path: string) => path === "/dieta" },
  {
    to: "/financeiro",
    label: "Financeiro",
    icon: CreditCard,
    tour: "financeiro",
    match: (path: string) => path === "/financeiro",
  },
  { to: "/feed", label: "Feed", icon: Rss, tour: "feed", match: (path: string) => path === "/feed" },
  { to: "/perfil", label: "Perfil", icon: User, tour: "perfil", match: (path: string) => path === "/perfil" },
] as const;

export function ProfessionalSidebar() {
  const loc = useLocation();
  const { user } = useAuth();
  const { collapsed, toggle } = useProfessionalSidebar();
  const { data: unread = 0 } = useUnreadNotifications(user?.id);

  return (
    <aside
      className={cn(
        "hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-border bg-background/95 backdrop-blur-md transition-[width] duration-200 ease-out",
        collapsed ? "w-[4.5rem]" : "w-60 lg:w-64",
      )}
    >
      <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden">
        <div
          className={cn(
            "border-b border-border shrink-0 transition-all",
            collapsed ? "px-2 pt-6 pb-3" : "px-5 pt-8 pb-4",
          )}
        >
          {!collapsed ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                FitPro AI
              </p>
              <p className="text-sm font-bold text-foreground mt-1">Área do profissional</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                Alunos, treino, dieta e cobrança centralizados.
              </p>
            </>
          ) : (
            <p
              className="text-center text-[10px] font-black text-primary leading-tight"
              title="FitPro AI"
            >
              FP
            </p>
          )}
        </div>

        <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-3")}>
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.match(loc.pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                data-tour={item.tour}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                className={cn(
                  "flex items-center rounded-xl text-sm font-semibold transition-colors",
                  collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" strokeWidth={2.2} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}

          <Link
            to="/notificacoes"
            data-tour="notificacoes"
            title={collapsed ? "Notificações" : undefined}
            aria-label="Notificações"
            className={cn(
              "relative flex items-center rounded-xl text-sm font-semibold transition-colors",
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
              loc.pathname === "/notificacoes"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <span className="relative shrink-0">
              <Bell className="size-5" strokeWidth={2.2} />
              {collapsed && unread > 0 && (
                <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </span>
            {!collapsed && (
              <>
                <span className="truncate">Notificações</span>
                {unread > 0 && (
                  <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </>
            )}
          </Link>
        </nav>

        <div className={cn("border-t border-border shrink-0", collapsed ? "p-2" : "p-3")}>
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            className={cn(
              "flex w-full items-center rounded-xl border border-border bg-card/60 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
              collapsed ? "justify-center p-2.5" : "gap-2 px-3 py-2.5 text-xs font-semibold",
            )}
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <>
                <ChevronLeft className="size-4 shrink-0" />
                <span>Recolher menu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
