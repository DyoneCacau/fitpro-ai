import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Clock, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { AppointmentHistoryList } from "@/components/appointments/AppointmentHistoryList";
import {
  APPOINTMENT_KIND_LABELS,
  addDays,
  daysUntil,
  fetchMyAppointmentHistory,
  fetchMyScheduledAppointments,
  fetchStudentFollowUp,
  formatAppointmentDate,
  formatAppointmentTime,
  getRecurrenceLabel,
} from "@/lib/appointments";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda — FitPro AI" }] }),
  component: () => (
    <AuthGate allowedRoles={["aluno"]}>
      <StudentAgendaPage />
    </AuthGate>
  ),
});

function StudentAgendaPage() {
  const { user } = useAuth();

  const { data: followUp, isLoading: loadingPlan } = useQuery({
    queryKey: ["myFollowUp", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;
      const personalId = await fetchPersonalId(user.id);
      if (!personalId) return null;
      return fetchStudentFollowUp(personalId, user.id);
    },
  });

  const { data: upcoming = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ["myScheduledAppointments", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchMyScheduledAppointments(user!.id),
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["myAppointmentHistory", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchMyAppointmentHistory(user!.id),
  });

  const nextDue =
    followUp?.last_visit_at && followUp.interval_days
      ? addDays(new Date(followUp.last_visit_at), followUp.interval_days)
      : null;
  const daysLeft = nextDue ? daysUntil(nextDue) : null;

  return (
    <AppShell>
      <PageHeader title="Agenda" subtitle="Seus agendamentos com o personal" />

      <section className="px-5 pt-4 pb-8 space-y-5">
        {loadingPlan ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : followUp ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" />
              Seu plano
            </h2>
            <p className="text-xs text-muted-foreground mt-2">
              {APPOINTMENT_KIND_LABELS[followUp.kind]} · {getRecurrenceLabel(followUp.interval_days)}
            </p>
            {nextDue && daysLeft !== null && (
              <p
                className={`text-xs font-semibold mt-2 ${
                  daysLeft < 0
                    ? "text-destructive"
                    : daysLeft <= 7
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-primary"
                }`}
              >
                {daysLeft < 0
                  ? `Retorno/reavaliação atrasado há ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) === 1 ? "" : "s"}`
                  : daysLeft === 0
                    ? "Retorno/reavaliação vence hoje"
                    : `Próximo em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}`}
              </p>
            )}
          </div>
        ) : null}

        <div>
          <h3 className="text-sm font-bold mb-3">Próximos agendamentos</h3>
          {loadingUpcoming ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-5 text-center">
              <CalendarClock className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Nenhum agendamento marcado. Seu profissional avisa por aqui quando marcar uma
                consulta ou retorno.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((ap) => (
                <div key={ap.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      {APPOINTMENT_KIND_LABELS[ap.kind]}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {formatAppointmentDate(ap.scheduled_at)}
                    </span>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-bold">
                    <Clock className="size-4 text-primary" />
                    {formatAppointmentTime(ap.scheduled_at)}
                  </p>
                  {ap.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">{ap.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold mb-3">Histórico</h3>
          {loadingHistory ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : (
            <AppointmentHistoryList items={history} />
          )}
        </div>
      </section>
    </AppShell>
  );
}

async function fetchPersonalId(alunoId: string): Promise<string | null> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("profiles")
    .select("personal_id")
    .eq("id", alunoId)
    .maybeSingle();
  if (error) throw error;
  return data?.personal_id ?? null;
}
