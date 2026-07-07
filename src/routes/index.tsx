import { createFileRoute, Link } from "@tanstack/react-router";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { LogOut } from "lucide-react";

import { AppShell } from "@/components/AppShell";

import { AuthGate } from "@/components/AuthGate";

import { MfitStudentHome } from "@/components/student/MfitStudentHome";

import { ProfessionalHomeAgenda } from "@/components/professional/ProfessionalHomeAgenda";

import { StudentDirectorySection } from "@/components/professional/StudentDirectorySection";

import { useAuth } from "@/hooks/use-auth";
import { useDisplayName } from "@/hooks/use-display-name";

import { supabase } from "@/integrations/supabase/client";

import { formatAppRole } from "@/lib/labels";

import { fetchMyStudents } from "@/lib/students";



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



  if (!isProfessional) {

    return (

      <AppShell>

        <MfitStudentHome />

      </AppShell>

    );

  }



  function refreshAgenda() {

    if (!user?.id) return;

    void qc.invalidateQueries({ queryKey: ["todayAppointments", user.id] });

    void qc.invalidateQueries({ queryKey: ["followUpAlerts", user.id] });

    void qc.invalidateQueries({ queryKey: ["studentScheduledAppointments"] });

  }



  return (

    <AppShell>

      <header className="bg-gradient-hero px-5 pt-12 pb-4">

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

              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-glow"

            >

              {initials}

            </Link>

          </div>

        </div>

      </header>



      {user?.id && (

        <>

          <ProfessionalHomeAgenda

            personalId={user.id}

            students={students.map((s) => ({

              id: s.id,

              full_name: s.full_name,

            }))}

          />

          <StudentDirectorySection

            personalId={user.id}

            students={students}

            loading={loadingStudents}

            onAppointmentSaved={refreshAgenda}

          />

        </>

      )}

    </AppShell>

  );

}

