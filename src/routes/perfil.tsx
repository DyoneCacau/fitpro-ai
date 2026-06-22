import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LogOut,
  ChevronRight,
  Apple,
  Dumbbell,
  Bell,
  User as UserIcon,
  GraduationCap,
  Pill,
  HeartPulse,
  CalendarClock,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { LinkedProfessionalCard } from "@/components/LinkedProfessionalCard";
import { PageHeader } from "@/components/PageHeader";
import { ProfileEditSection } from "@/components/profile/ProfileEditSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlunosManager } from "@/components/professional/AlunosManager";
import { StudentSupplementsSection } from "@/components/student/profile/StudentSupplementsSection";
import { StudentTrackingHub } from "@/components/student/tracking/StudentTrackingHub";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLinkedProfessional } from "@/hooks/use-linked-professional";
import { formatAppRole } from "@/lib/labels";
import { formatProfessionalSpecialties } from "@/lib/professional";
import { fetchUserProfile, PROFILE_QUERY_KEY, resolveAvatarUrl } from "@/lib/profile";

type PerfilTab = "conta" | "suplementos" | "acompanhamento" | "alunos";

export const Route = createFileRoute("/perfil")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (["conta", "suplementos", "acompanhamento", "alunos"].includes(search.tab as string)
      ? search.tab
      : undefined) as PerfilTab | undefined,
  }),
  head: () => ({ meta: [{ title: "Perfil — FitPro AI" }] }),
  component: () => (
    <AuthGate>
      <Perfil />
    </AuthGate>
  ),
});

function Perfil() {
  const navigate = useNavigate();
  const { tab: tabFromUrl } = Route.useSearch();
  const { user, role, profile: authProfile } = useAuth();
  const { professional, isStudent } = useLinkedProfessional();
  const isProfessional = role === "personal" || role === "admin";
  const [tab, setTab] = useState<PerfilTab>(tabFromUrl ?? "conta");
  const [headerName, setHeaderName] = useState("");
  const [headerAvatarUrl, setHeaderAvatarUrl] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: [PROFILE_QUERY_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchUserProfile(user!.id),
  });

  const { data: profileAvatarUrl } = useQuery({
    queryKey: [PROFILE_QUERY_KEY, user?.id, "avatar", profile?.avatar_url],
    enabled: !!profile?.avatar_url,
    queryFn: () => resolveAvatarUrl(profile!.avatar_url),
  });

  useEffect(() => {
    if (tabFromUrl) setTab(tabFromUrl);
    else setTab("conta");
  }, [tabFromUrl]);

  const defaultName =
    profile?.full_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "Atleta";
  const name = headerName || defaultName;
  const avatarUrl = headerAvatarUrl ?? profileAvatarUrl ?? null;
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const studentTabs: { id: PerfilTab; label: string; icon: typeof UserIcon }[] = [
    { id: "conta", label: "Conta", icon: UserIcon },
    { id: "suplementos", label: "Suplementos", icon: Pill },
    { id: "acompanhamento", label: "Acomp.", icon: HeartPulse },
  ];

  const proTabs: { id: PerfilTab; label: string; icon: typeof UserIcon }[] = [
    { id: "conta", label: "Conta", icon: UserIcon },
    { id: "alunos", label: "Alunos", icon: GraduationCap },
  ];

  const tabs = isProfessional ? proTabs : studentTabs;

  function selectTab(next: PerfilTab) {
    setTab(next);
    void navigate({
      to: "/perfil",
      search: next === "conta" ? {} : { tab: next },
      replace: true,
    });
  }

  return (
    <AppShell>
      <PageHeader title="Perfil" subtitle="Sua conta e preferências" />

      <section className="px-5 pt-5">
        <div className="rounded-3xl bg-gradient-card border border-border p-5 shadow-card text-center">
          <Avatar className="mx-auto h-20 w-20 border-2 border-primary/20 shadow-glow">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
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

          <ProfileEditSection
            onAvatarChange={setHeaderAvatarUrl}
            onNameChange={setHeaderName}
          />
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="flex gap-1 rounded-2xl border border-border bg-card p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-5 mt-5 pb-5">
        {tab === "conta" && (
          <div className="space-y-5">
            {isProfessional && (
              <button
                type="button"
                onClick={() => selectTab("alunos")}
                className="w-full rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <GraduationCap className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Meus alunos e convites</p>
                    <p className="text-xs text-muted-foreground">
                      Convidar alunos, ver vínculos e abrir ficha completa
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-primary shrink-0" />
                </div>
              </button>
            )}

            {isStudent && (
              <div>
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
              </div>
            )}

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {isProfessional ? "Gestão" : "Atalhos"}
              </h2>
              <div className="space-y-2">
                {isProfessional && (
                  <>
                    <MenuLink to="/agenda" icon={CalendarClock} label="Agenda e agendamentos" />
                    <MenuLink
                      to="/perfil"
                      search={{ tab: "alunos" }}
                      icon={Users}
                      label="Alunos e convites"
                    />
                  </>
                )}
                <MenuLink to="/treinos" icon={Dumbbell} label="Meus treinos" />
                <MenuLink to="/dieta" icon={Apple} label="Minha dieta" />
                {isStudent && (
                  <MenuLink to="/acompanhamento" icon={HeartPulse} label="Acompanhamento e avaliações" />
                )}
                <MenuLink to="/notificacoes" icon={Bell} label="Notificações" />
              </div>
            </div>
          </div>
        )}

        {tab === "suplementos" && isStudent && <StudentSupplementsSection />}

        {tab === "acompanhamento" && isStudent && (
          <div className="-mx-5">
            <StudentTrackingHub embedded />
          </div>
        )}

        {tab === "alunos" && isProfessional && <AlunosManager />}
      </section>

      <section className="px-5 pb-8">
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

function MenuLink({
  to,
  search,
  icon: Icon,
  label,
}: {
  to: string;
  search?: { tab: PerfilTab };
  icon: typeof Dumbbell;
  label: string;
}) {
  return (
    <Link
      to={to}
      search={search}
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
