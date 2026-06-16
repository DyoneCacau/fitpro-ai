import { createFileRoute, Link } from "@tanstack/react-router";
import { LogOut, ChevronRight, Ruler, Apple, Dumbbell, Bell, User as UserIcon, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { LinkedProfessionalCard } from "@/components/LinkedProfessionalCard";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLinkedProfessional } from "@/hooks/use-linked-professional";
import { formatAppRole } from "@/lib/labels";
import { formatProfessionalSpecialties } from "@/lib/professional";
export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Perfil — FitPro AI" }] }),
  component: () => (
    <AuthGate>
      <Perfil />
    </AuthGate>
  ),
});

function Perfil() {
  const { user, role, profile: authProfile } = useAuth();
  const { professional, isStudent } = useLinkedProfessional();
  const name = (user?.user_metadata?.full_name as string) ?? user?.email ?? "Atleta";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <AppShell>
      <PageHeader title="Perfil" subtitle="Sua conta" />

      <section className="px-5 pt-5">
        <div className="rounded-3xl bg-gradient-card border border-border p-5 shadow-card text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground font-bold text-2xl shadow-glow">
            {initials}
          </div>
          <h2 className="mt-3 text-xl font-bold">{name}</h2>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          {role && (
            <span className="mt-2 inline-block rounded-full bg-primary/15 text-primary px-3 py-0.5 text-xs font-bold uppercase">
              {role === "personal" && authProfile
                ? formatProfessionalSpecialties(
                    authProfile.is_personal_trainer,
                    authProfile.is_nutritionist,
                  )
                : formatAppRole(role)}
            </span>
          )}
        </div>
      </section>

      {isStudent && (
        <section className="px-5 mt-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Profissional responsável
          </h2>
          {professional ? (
            <LinkedProfessionalCard professional={professional} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-5 text-center">
              <UserIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Você ainda não tem um profissional vinculado.
              </p>
            </div>
          )}
        </section>
      )}
      <section className="px-5 mt-5 space-y-2">
        {(role === "personal" || role === "admin") && (
          <MenuLink to="/alunos" icon={Users} label="Meus alunos e convites" />
        )}
        <MenuLink to="/treinos" icon={Dumbbell} label="Meus treinos" />
        <MenuLink to="/dieta" icon={Apple} label="Minha dieta" />
        <MenuLink to="/avaliacoes" icon={Ruler} label="Avaliações físicas" />
        <MenuLink to="/notificacoes" icon={Bell} label="Notificações" />
      </section>

      <section className="px-5 mt-6 pb-5">
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive py-3.5 font-bold"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </section>
    </AppShell>
  );
}

function MenuLink({ to, icon: Icon, label }: { to: string; icon: typeof Dumbbell; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4 transition-all active:scale-[0.99]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </Link>
  );
}
