import { supabase } from "@/integrations/supabase/client";

export type AppointmentKind = "treino" | "retorno" | "avaliacao" | "consulta";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export type RecurrencePresetId =
  | "mensal"
  | "bimestral"
  | "trimestral"
  | "semestral"
  | "anual";

export const RECURRENCE_PRESETS: {
  id: RecurrencePresetId;
  label: string;
  shortLabel: string;
  days: number;
}[] = [
  { id: "mensal", label: "Mensal (plano)", shortLabel: "Mensal", days: 30 },
  { id: "bimestral", label: "Bimestral", shortLabel: "Bimestral", days: 60 },
  { id: "trimestral", label: "Trimestral", shortLabel: "Trimestral", days: 90 },
  { id: "semestral", label: "Semestral", shortLabel: "Semestral", days: 180 },
  { id: "anual", label: "Anual", shortLabel: "Anual", days: 365 },
];

export const FOLLOW_UP_KINDS: AppointmentKind[] = ["retorno", "avaliacao"];

export const ALERT_DAYS_BEFORE = 7;

export type StudentAppointment = {
  id: string;
  personal_id: string;
  aluno_id: string;
  scheduled_at: string;
  duration_minutes: number;
  kind: AppointmentKind;
  status: AppointmentStatus;
  notes: string | null;
  recurrence_days: number | null;
  aluno?: { full_name: string | null } | null;
};

export type FollowUpRow = {
  id: string;
  personal_id: string;
  aluno_id: string;
  interval_days: number;
  kind: AppointmentKind;
  last_visit_at: string | null;
  notes: string | null;
  is_active: boolean;
};

export type FollowUpAlert = {
  alunoId: string;
  studentName: string;
  kind: AppointmentKind;
  intervalDays: number;
  intervalLabel: string;
  lastVisitAt: string | null;
  nextDue: Date;
  daysLeft: number;
  overdue: boolean;
};

export const APPOINTMENT_KIND_LABELS: Record<AppointmentKind, string> = {
  treino: "Treino",
  retorno: "Retorno",
  avaliacao: "Avaliação",
  consulta: "Consulta",
};

export function formatAppointmentTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatAppointmentDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function daysUntil(date: Date): number {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getRecurrencePresetByDays(days: number | null | undefined) {
  if (!days) return null;
  return RECURRENCE_PRESETS.find((p) => p.days === days) ?? null;
}

export function getRecurrenceLabel(days: number | null | undefined): string | null {
  if (!days) return null;
  const preset = getRecurrencePresetByDays(days);
  return preset ? preset.shortLabel : `A cada ${days} dias`;
}

export function formatRecurrenceInfo(ap: StudentAppointment): string | null {
  if (!ap.recurrence_days) return null;
  const label = getRecurrenceLabel(ap.recurrence_days);
  const next = addDays(new Date(ap.scheduled_at), ap.recurrence_days);
  const nextLabel = next.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${label} · próximo previsto ${nextLabel}`;
}

export async function fetchTodayAppointments(personalId: string): Promise<StudentAppointment[]> {
  const now = new Date();
  const { data, error } = await supabase
    .from("student_appointments")
    .select(
      "id, personal_id, aluno_id, scheduled_at, duration_minutes, kind, status, notes, recurrence_days",
    )
    .eq("personal_id", personalId)
    .eq("status", "scheduled")
    .gte("scheduled_at", startOfDay(now).toISOString())
    .lte("scheduled_at", endOfDay(now).toISOString())
    .order("scheduled_at");
  if (error) throw error;
  return (data ?? []) as StudentAppointment[];
}

export async function fetchUpcomingAppointments(
  personalId: string,
  days = 30,
): Promise<StudentAppointment[]> {
  const now = new Date();
  const until = endOfDay(addDays(now, days));
  const { data, error } = await supabase
    .from("student_appointments")
    .select(
      "id, personal_id, aluno_id, scheduled_at, duration_minutes, kind, status, notes, recurrence_days",
    )
    .eq("personal_id", personalId)
    .eq("status", "scheduled")
    .gte("scheduled_at", startOfDay(now).toISOString())
    .lte("scheduled_at", until.toISOString())
    .order("scheduled_at");
  if (error) throw error;
  return (data ?? []) as StudentAppointment[];
}

export function groupAppointmentsByDay(
  items: StudentAppointment[],
): { key: string; label: string; items: StudentAppointment[] }[] {
  const groups = new Map<string, { label: string; items: StudentAppointment[] }>();
  for (const ap of items) {
    const d = new Date(ap.scheduled_at);
    const key = startOfDay(d).toISOString();
    const label = d.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "short",
    });
    if (!groups.has(key)) groups.set(key, { label, items: [] });
    groups.get(key)!.items.push(ap);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, label: value.label, items: value.items }));
}

export async function fetchStudentAppointmentHistory(
  personalId: string,
  alunoId: string,
): Promise<StudentAppointment[]> {
  const { data, error } = await supabase
    .from("student_appointments")
    .select(
      "id, personal_id, aluno_id, scheduled_at, duration_minutes, kind, status, notes, recurrence_days",
    )
    .eq("personal_id", personalId)
    .eq("aluno_id", alunoId)
    .in("status", ["completed", "cancelled"])
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StudentAppointment[];
}

/** @deprecated use fetchStudentAppointmentHistory */
export async function fetchStudentFollowUpHistory(
  personalId: string,
  alunoId: string,
): Promise<StudentAppointment[]> {
  return fetchStudentAppointmentHistory(personalId, alunoId);
}

export async function fetchMyScheduledAppointments(
  alunoId: string,
): Promise<StudentAppointment[]> {
  const { data, error } = await supabase
    .from("student_appointments")
    .select(
      "id, personal_id, aluno_id, scheduled_at, duration_minutes, kind, status, notes, recurrence_days",
    )
    .eq("aluno_id", alunoId)
    .eq("status", "scheduled")
    .gte("scheduled_at", startOfDay(new Date()).toISOString())
    .order("scheduled_at");
  if (error) throw error;
  return (data ?? []) as StudentAppointment[];
}

export async function fetchMyAppointmentHistory(alunoId: string): Promise<StudentAppointment[]> {
  const { data, error } = await supabase
    .from("student_appointments")
    .select(
      "id, personal_id, aluno_id, scheduled_at, duration_minutes, kind, status, notes, recurrence_days",
    )
    .eq("aluno_id", alunoId)
    .in("status", ["completed", "cancelled"])
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StudentAppointment[];
}

export async function updateStudentFollowUpPlan(
  alunoId: string,
  intervalDays: number,
  kind: AppointmentKind = "retorno",
) {
  const { error } = await supabase.rpc("update_student_follow_up_plan", {
    _aluno_id: alunoId,
    _interval_days: intervalDays,
    _kind: kind,
  });
  if (error) throw error;
}

export async function fetchStudentFollowUp(
  personalId: string,
  alunoId: string,
): Promise<FollowUpRow | null> {
  const { data, error } = await supabase
    .from("student_follow_ups")
    .select("id, personal_id, aluno_id, interval_days, kind, last_visit_at, notes, is_active")
    .eq("personal_id", personalId)
    .eq("aluno_id", alunoId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as FollowUpRow | null) ?? null;
}

export async function fetchFollowUpAlerts(
  personalId: string,
  studentNames: Map<string, string>,
): Promise<FollowUpAlert[]> {
  const { data: followUps, error } = await supabase
    .from("student_follow_ups")
    .select("id, personal_id, aluno_id, interval_days, kind, last_visit_at, notes, is_active")
    .eq("personal_id", personalId)
    .eq("is_active", true);
  if (error) throw error;

  const rows = (followUps ?? []) as FollowUpRow[];
  if (rows.length === 0) return [];

  const alunoIds = rows.map((r) => r.aluno_id);
  const { data: completed, error: histError } = await supabase
    .from("student_appointments")
    .select("aluno_id, scheduled_at")
    .eq("personal_id", personalId)
    .in("aluno_id", alunoIds)
    .eq("status", "completed")
    .in("kind", FOLLOW_UP_KINDS)
    .order("scheduled_at", { ascending: false });
  if (histError) throw histError;

  const lastCompletedByAluno = new Map<string, string>();
  for (const row of completed ?? []) {
    if (!lastCompletedByAluno.has(row.aluno_id)) {
      lastCompletedByAluno.set(row.aluno_id, row.scheduled_at);
    }
  }

  const alerts: FollowUpAlert[] = [];

  for (const row of rows) {
    const lastVisit = row.last_visit_at ?? lastCompletedByAluno.get(row.aluno_id) ?? null;
    if (!lastVisit) continue;

    const nextDue = addDays(new Date(lastVisit), row.interval_days);
    const daysLeft = daysUntil(nextDue);
    if (daysLeft > ALERT_DAYS_BEFORE) continue;

    alerts.push({
      alunoId: row.aluno_id,
      studentName: studentNames.get(row.aluno_id) ?? "Aluno",
      kind: row.kind,
      intervalDays: row.interval_days,
      intervalLabel: getRecurrenceLabel(row.interval_days) ?? `${row.interval_days} dias`,
      lastVisitAt: lastVisit,
      nextDue,
      daysLeft,
      overdue: daysLeft < 0,
    });
  }

  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function formatAlertMessage(alert: FollowUpAlert): string {
  const kindLabel = APPOINTMENT_KIND_LABELS[alert.kind].toLowerCase();
  if (alert.overdue) {
    const overdueDays = Math.abs(alert.daysLeft);
    return `${kindLabel} atrasado há ${overdueDays} dia${overdueDays === 1 ? "" : "s"} (${alert.intervalLabel})`;
  }
  if (alert.daysLeft === 0) {
    return `${kindLabel} vence hoje (${alert.intervalLabel})`;
  }
  return `${kindLabel} em ${alert.daysLeft} dia${alert.daysLeft === 1 ? "" : "s"} (${alert.intervalLabel})`;
}

export type CreateAppointmentInput = {
  personal_id: string;
  aluno_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  kind?: AppointmentKind;
  notes?: string;
  recurrence_days?: number | null;
};

export function getAppointmentErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Erro ao agendar";
}

export async function fetchStudentScheduledAppointments(
  personalId: string,
  alunoId: string,
): Promise<StudentAppointment[]> {
  const { data, error } = await supabase
    .from("student_appointments")
    .select(
      "id, personal_id, aluno_id, scheduled_at, duration_minutes, kind, status, notes, recurrence_days",
    )
    .eq("personal_id", personalId)
    .eq("aluno_id", alunoId)
    .eq("status", "scheduled")
    .gte("scheduled_at", startOfDay(new Date()).toISOString())
    .order("scheduled_at");
  if (error) throw error;
  return (data ?? []) as StudentAppointment[];
}

export async function createAppointment(input: CreateAppointmentInput) {
  const { data, error } = await supabase.rpc("create_student_appointment", {
    _aluno_id: input.aluno_id,
    _scheduled_at: input.scheduled_at,
    _duration_minutes: input.duration_minutes ?? 60,
    _kind: input.kind ?? "treino",
    _notes: input.notes?.trim() || undefined,
    _recurrence_days: input.recurrence_days ?? undefined,
  });
  if (error) throw error;
  return data as string;
}

export async function completeAppointment(id: string) {
  const { data, error } = await supabase.rpc("complete_appointment", { _appointment_id: id });
  if (error) throw error;
  return data as string | null;
}

export async function cancelAppointment(id: string) {
  const { error } = await supabase
    .from("student_appointments")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}
