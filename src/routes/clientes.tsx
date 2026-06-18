import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Search, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import {
  QuickAppointmentModal,
  type StudentOption,
} from "@/components/professional/QuickAppointmentModal";
import { StudentListItem } from "@/components/professional/StudentListItem";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchMyStudents,
  filterStudentsByName,
  sortStudentsByName,
} from "@/lib/students";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Meus clientes — FitPro AI" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: () => (
    <AuthGate allowedRoles={["personal", "admin"]}>
      <ClientesPage />
    </AuthGate>
  ),
});

function ClientesPage() {
  const { user } = useAuth();
  const { q: initialQuery } = Route.useSearch();
  const qc = useQueryClient();
  const [search, setSearch] = useState(initialQuery);
  const [scheduleFor, setScheduleFor] = useState<StudentOption | null>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["myStudents", user?.id],
    enabled: !!user?.id,
    refetchOnMount: "always",
    queryFn: () => fetchMyStudents(),
  });

  const filtered = useMemo(
    () => filterStudentsByName(sortStudentsByName(students), search),
    [students, search],
  );

  const studentOptions: StudentOption[] = students.map((s) => ({
    id: s.id,
    full_name: s.full_name,
  }));

  function todayDefaultTime(): string {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    if (d.getHours() >= 18) d.setHours(18, 0, 0, 0);
    else d.setHours(Math.max(d.getHours() + 1, 9), 0, 0, 0);
    return d.toISOString().slice(0, 16);
  }

  function refreshAgenda() {
    if (!user?.id) return;
    void qc.invalidateQueries({ queryKey: ["todayAppointments", user.id] });
    void qc.invalidateQueries({ queryKey: ["followUpAlerts", user.id] });
    void qc.invalidateQueries({ queryKey: ["studentScheduledAppointments"] });
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-5 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
            aria-label="Voltar ao início"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate flex items-center gap-2">
              <Users className="size-5 text-primary shrink-0" />
              Meus clientes
            </h1>
            <p className="text-xs text-muted-foreground">
              {students.length === 0
                ? "Nenhum aluno vinculado"
                : `${students.length} aluno${students.length === 1 ? "" : "s"} · ordem alfabética`}
            </p>
          </div>
          <Link
            to="/perfil"
            search={{ tab: "alunos" }}
            className="text-[11px] font-semibold text-primary shrink-0"
          >
            Convites
          </Link>
        </div>

        {students.length >= 6 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome"
              className="field-input pl-9 bg-card"
            />
          </div>
        )}
      </header>

      <div className="px-5 py-4 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">Nenhum aluno vinculado ainda.</p>
            <Link
              to="/perfil"
              search={{ tab: "alunos" }}
              className="text-sm font-semibold text-primary"
            >
              Convidar aluno
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground py-8">
            Nenhum cliente encontrado para &quot;{search.trim()}&quot;.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((student) => (
              <StudentListItem
                key={student.id}
                student={student}
                subtitle="Anamnese · Treino · Dieta · Agenda"
                onSchedule={() =>
                  setScheduleFor({ id: student.id, full_name: student.full_name })
                }
              />
            ))}
          </div>
        )}
      </div>

      {scheduleFor && user?.id && (
        <QuickAppointmentModal
          personalId={user.id}
          students={studentOptions}
          defaultAlunoId={scheduleFor.id}
          defaultScheduledAt={todayDefaultTime()}
          title={`Agendar · ${scheduleFor.full_name?.trim() || "Aluno"}`}
          onClose={() => setScheduleFor(null)}
          onSaved={() => {
            refreshAgenda();
            setScheduleFor(null);
          }}
        />
      )}
    </AppShell>
  );
}
