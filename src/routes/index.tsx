import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, ChevronRight, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { MfitStudentHome } from "@/components/student/MfitStudentHome";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatAppRole } from "@/lib/labels";

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
  const { user, role, loading: authLoading } = useAuth();
  const isProfessional = role === "personal" || role === "admin";
  const name = (user?.user_metadata?.full_name as string) ?? user?.email ?? "Atleta";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const { data: students = [] } = useQuery({
    queryKey: ["myStudents", user?.id],
    enabled: !!user?.id && !authLoading && isProfessional,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_students");
      if (error) throw error;
      return data ?? [];
    },
  });

  const studentCount = students.length;

  if (!isProfessional) {
    return (
      <AppShell>
        <MfitStudentHome studentName={name} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header profissional */}
      <header className="bg-gradient-hero px-5 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {formatAppRole(role!)}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">Olá, {name.split(" ")[0]} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-glow">
              {initials}
            </div>
          </div>
        </div>

        <Link
          to="/alunos"
          className="mt-5 block rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Meus alunos</p>
              <p className="text-xs text-muted-foreground">
                {studentCount} aluno{studentCount === 1 ? "" : "s"} · treino, dieta e anamnese
              </p>
            </div>
            <ChevronRight className="size-5 text-primary" />
          </div>
        </Link>
      </header>
    </AppShell>
  );
}
