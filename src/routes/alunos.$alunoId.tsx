import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Apple, Calculator, CalendarCheck, CreditCard, Dumbbell, HeartPulse, Loader2, Plus } from "lucide-react";
import { StudentTrackingPanel } from "@/components/professional/StudentTrackingPanel";
import { BillingPanel } from "@/components/professional/BillingPanel";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { StudentAnamnesisPanel } from "@/components/professional/StudentAnamnesisPanel";
import { StudentDietPanel } from "@/components/professional/StudentDietPanel";
import { StudentAgendaPanel } from "@/components/professional/StudentAgendaPanel";
import { StudentWorkoutsPanel } from "@/components/professional/StudentWorkoutsPanel";
import { QuickAppointmentModal } from "@/components/professional/QuickAppointmentModal";
import { fetchStudentProfile, fetchMyStudents } from "@/lib/students";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/alunos/$alunoId")({
  head: () => ({ meta: [{ title: "Aluno — FitPro AI" }] }),
  component: () => (
    <AuthGate allowedRoles={["personal", "admin"]}>
      <StudentDetailPage />
    </AuthGate>
  ),
});

type Tab = "anamnese" | "treinos" | "dieta" | "agenda" | "acompanhamento" | "financeiro";

function StudentDetailPage() {
  const { alunoId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("anamnese");
  const [openSchedule, setOpenSchedule] = useState(false);

  const { data: student, isLoading, error } = useQuery({
    queryKey: ["studentProfile", alunoId, user?.id],
    enabled: !!user?.id && !!alunoId,
    queryFn: async () => {
      const profile = await fetchStudentProfile(alunoId);
      if (!profile) throw new Error("Aluno não encontrado ou sem vínculo.");
      return profile;
    },
  });

  const personalId = student?.personal_id ?? user?.id ?? "";

  if (isLoading) {
    return (
      <AppShell>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error || !student || !user || !personalId) {
    const message =
      error instanceof Error ? error.message : "Aluno não encontrado ou sem vínculo.";
    return (
      <AppShell>
        <StudentAccessError alunoId={alunoId} message={message} />
      </AppShell>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Calculator }[] = [
    { id: "anamnese", label: "Anamnese", icon: Calculator },
    { id: "treinos", label: "Treinos", icon: Dumbbell },
    { id: "dieta", label: "Dieta", icon: Apple },
    { id: "agenda", label: "Agenda", icon: CalendarCheck },
    { id: "acompanhamento", label: "Acomp.", icon: HeartPulse },
    { id: "financeiro", label: "Cobrança", icon: CreditCard },
  ];

  return (
    <AppShell>
      <header className="px-5 md:px-8 pt-10 pb-0 border-b border-border">
        <Link
          to="/clientes"
          search={{ q: "" }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-3 hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Clientes
        </Link>
        <div className="flex items-start justify-between gap-3 pb-4">
          <div>
            <h1 className="text-xl font-bold">{student.full_name ?? "Aluno"}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Ficha completa · visão 360º do aluno
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTab("agenda");
              setOpenSchedule(true);
            }}
            className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-2 text-[11px] font-bold text-primary shrink-0"
          >
            <Plus className="size-3.5" />
            Agendar
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3 -mx-1 px-1 md:flex-wrap md:overflow-visible">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const label =
              t.label === "Acomp."
                ? "Acompanhamento"
                : t.label === "Cobrança"
                  ? "Cobrança"
                  : t.label;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                  active
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
      </header>

      <section className="px-5 md:px-8 py-5 pb-10 max-w-5xl">
        {tab === "anamnese" && (
          <StudentAnamnesisPanel
            alunoId={alunoId}
            personalId={personalId}
            studentName={student.full_name ?? undefined}
          />
        )}
        {tab === "treinos" && <StudentWorkoutsPanel alunoId={alunoId} personalId={personalId} />}
        {tab === "dieta" && <StudentDietPanel alunoId={alunoId} personalId={personalId} />}
        {tab === "agenda" && (
          <StudentAgendaPanel
            alunoId={alunoId}
            personalId={personalId}
            studentName={student.full_name}
          />
        )}
        {tab === "acompanhamento" && (
          <StudentTrackingPanel
            alunoId={alunoId}
            personalId={personalId}
            studentName={student.full_name ?? undefined}
          />
        )}
        {tab === "financeiro" && (
          <BillingPanel personalId={personalId} alunoId={alunoId} />
        )}
      </section>

      {openSchedule && (
        <QuickAppointmentModal
          personalId={personalId}
          students={[{ id: alunoId, full_name: student.full_name }]}
          defaultAlunoId={alunoId}
          title={`Agendar · ${student.full_name ?? "Aluno"}`}
          onClose={() => setOpenSchedule(false)}
          onSaved={() => {
            setOpenSchedule(false);
            void qc.invalidateQueries({ queryKey: ["todayAppointments", personalId] });
            void qc.invalidateQueries({ queryKey: ["studentScheduledAppointments", personalId, alunoId] });
          }}
        />
      )}
    </AppShell>
  );
}

function StudentAccessError({ alunoId, message }: { alunoId: string; message: string }) {
  const qc = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    try {
      await fetchMyStudents();
      await qc.invalidateQueries({ queryKey: ["studentProfile", alunoId] });
      await qc.invalidateQueries({ queryKey: ["myStudents"] });
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="px-5 pt-8 text-center space-y-4">
      <p className="text-sm text-destructive">Não foi possível abrir o cadastro deste aluno.</p>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">{message}</p>
      <p className="text-[10px] text-muted-foreground">
        Confirme que você está logado como o profissional que convidou este aluno.
      </p>
      <div className="flex flex-col gap-2 max-w-xs mx-auto">
        <button
          type="button"
          disabled={retrying}
          onClick={() => void retry()}
          className="rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {retrying ? "Reparando vínculo…" : "Reparar vínculo e tentar de novo"}
        </button>
        <Link to="/perfil" search={{ tab: "alunos" }} className="text-primary text-sm">
          Voltar para meus alunos
        </Link>
      </div>
    </div>
  );
}
