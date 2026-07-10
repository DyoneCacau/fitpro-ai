import { createFileRoute, Link } from "@tanstack/react-router";

import { useEffect, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { LogOut } from "lucide-react";

import { AppShell } from "@/components/AppShell";

import { AuthGate } from "@/components/AuthGate";

import { StudentHome } from "@/components/student/StudentHome";

import { ProfessionalHomeAgenda } from "@/components/professional/ProfessionalHomeAgenda";
import { ProfessionalDashboardStats } from "@/components/professional/ProfessionalDashboardStats";
import { GettingStartedCard } from "@/components/professional/GettingStartedCard";
import { StudentDirectorySection } from "@/components/professional/StudentDirectorySection";
import { ProfessionalOnboardingWizard } from "@/components/professional/onboarding/ProfessionalOnboardingWizard";
import { OnboardingBanner } from "@/components/professional/onboarding/OnboardingBanner";
import { TrialBanner } from "@/components/professional/onboarding/TrialBanner";
import { FeatureTour, PROFESSIONAL_TOUR } from "@/components/professional/onboarding/FeatureTour";

import { useAuth } from "@/hooks/use-auth";
import { useDisplayName } from "@/hooks/use-display-name";

import { supabase } from "@/integrations/supabase/client";

import { formatAppRole } from "@/lib/labels";

import { fetchMyStudents } from "@/lib/students";
import { fetchProfessionalDashboard } from "@/lib/professional-analytics";
import { fetchOnboardingState, completeTour } from "@/lib/professional-onboarding";



export const Route = createFileRoute("/")({

  head: () => ({

    meta: [

      { title: "FitPro AI — Seu treino de hoje" },

      { name: "description", content: "Plataforma SaaS premium para Personal Trainers e alunos. Execute treinos, acompanhe evolução e converse com seu personal." },

    ],

  }),

  component: Home,

});



function Home() {

  return (

    <AuthGate>

      <HomeInner />

    </AuthGate>

  );

}



function HomeInner() {

  const qc = useQueryClient();

  const { user, role, loading: authLoading } = useAuth();
  const isProfessional = role === "personal" || role === "admin";
  const { name, firstName, initials } = useDisplayName(isProfessional ? "Profissional" : "Atleta");



  const {

    data: students = [],

    isLoading: loadingStudents,

  } = useQuery({

    queryKey: ["myStudents", user?.id],

    enabled: !!user?.id && !authLoading && isProfessional,

    refetchOnMount: "always",

    queryFn: () => fetchMyStudents(),

  });



  const {
    data: dashboard,
  } = useQuery({
    queryKey: ["professionalDashboard", user?.id],
    enabled: !!user?.id && !authLoading && isProfessional,
    queryFn: () => fetchProfessionalDashboard(user!.id),
  });

  const { data: onboarding } = useQuery({
    queryKey: ["onboardingState", user?.id],
    enabled: !!user?.id && !authLoading && isProfessional,
    queryFn: () => fetchOnboardingState(user!.id),
  });

  const [wizardOpen, setWizardOpen] = useState(false);
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    if (onboarding && !onboarding.completedAt && !onboarding.skipped) {
      setWizardOpen(true);
    }
  }, [onboarding]);

  const needsOnboarding = Boolean(onboarding && !onboarding.completedAt);

  const sub = onboarding?.subscription;
  const trialDaysLeft =
    sub && sub.status === "trial" && sub.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
      : null;
  const showTrialBanner = !needsOnboarding && trialDaysLeft !== null;



  if (!isProfessional) {

    return (

      <AppShell>

        <StudentHome />

      </AppShell>

    );

  }



  function refreshAgenda() {

    if (!user?.id) return;

    void qc.invalidateQueries({ queryKey: ["todayAppointments", user.id] });

    void qc.invalidateQueries({ queryKey: ["followUpAlerts", user.id] });

    void qc.invalidateQueries({ queryKey: ["studentScheduledAppointments"] });

  }

  function handleWizardFinished() {
    setWizardOpen(false);
    void qc.invalidateQueries({ queryKey: ["onboardingState", user?.id] });
    if (onboarding && !onboarding.tourCompletedAt) setRunTour(true);
  }

  function handleWizardSkip() {
    setWizardOpen(false);
    void qc.invalidateQueries({ queryKey: ["onboardingState", user?.id] });
  }

  async function handleTourFinish() {
    setRunTour(false);
    if (!user?.id) return;
    try {
      await completeTour(user.id);
    } catch {
      // ignore
    }
    void qc.invalidateQueries({ queryKey: ["onboardingState", user.id] });
  }



  return (

    <>

    <AppShell>

      {needsOnboarding && <OnboardingBanner onOpen={() => setWizardOpen(true)} />}

      {showTrialBanner && trialDaysLeft !== null && (
        <TrialBanner daysLeft={trialDaysLeft} onSubscribe={() => setWizardOpen(true)} />
      )}

      <header data-tour="home" className="bg-gradient-hero px-5 pt-12 pb-4">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">

              {formatAppRole(role!)}

            </p>

            <h1 className="mt-1 text-2xl font-bold text-foreground">Olá, {firstName} 👋</h1>

          </div>

          <div className="flex items-center gap-2">

            <button

              onClick={() => supabase.auth.signOut()}

              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"

              aria-label="Sair"

            >

              <LogOut className="h-4 w-4" />

            </button>

            <Link
              to="/perfil"
              search={{ tab: undefined }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-glow"
            >

              {initials}

            </Link>

          </div>

        </div>

      </header>

      {dashboard && <GettingStartedCard data={dashboard} />}

      {dashboard && <ProfessionalDashboardStats data={dashboard} />}

      {user?.id && (
        <div className="md:grid md:grid-cols-2 md:gap-6 md:px-5 md:pb-8">
          <div data-tour="agenda">
            <ProfessionalHomeAgenda
              personalId={user.id}
              students={students.map((s) => ({
                id: s.id,
                full_name: s.full_name,
              }))}
            />
          </div>
          <StudentDirectorySection
            personalId={user.id}
            students={students}
            loading={loadingStudents}
            onAppointmentSaved={refreshAgenda}
          />
        </div>
      )}

    </AppShell>

    {wizardOpen && user?.id && (
      <ProfessionalOnboardingWizard
        userId={user.id}
        firstName={firstName}
        onFinished={handleWizardFinished}
        onSkip={handleWizardSkip}
      />
    )}

    {runTour && (
      <FeatureTour steps={PROFESSIONAL_TOUR} onFinish={handleTourFinish} />
    )}

    </>

  );

}

