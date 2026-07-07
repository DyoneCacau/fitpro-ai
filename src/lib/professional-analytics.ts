import { supabase } from "@/integrations/supabase/client";
import { fetchBillingSummary, fetchInvoices, fetchStudentSubscriptions } from "@/lib/billing";
import { fetchFollowUpAlerts, fetchUpcomingAppointments } from "@/lib/appointments";
import { fetchMyStudents } from "@/lib/students";

export type ProfessionalInsights = {
  studentCount: number;
  studentsWithoutAnamnesis: number;
  followUpAlerts: number;
  receivedThisMonth: number;
  overdueCount: number;
  pendingCount: number;
  activeWorkouts: number;
  activeDietPlans: number;
};

export type ProfessionalDashboard = {
  insights: ProfessionalInsights;
  revenue: {
    todayCents: number;
    weekCents: number;
    monthCents: number;
    yearCents: number;
  };
  transactionsThisMonth: number;
  ticketMedioCents: number;
  recurringRevenueCents: number;
  activeSubscriptions: number;
  pendingTotalCents: number;
  overdueTotalCents: number;
  upcomingAppointments: number;
  appointmentsToday: number;
  checklist: {
    hasStudent: boolean;
    hasWorkout: boolean;
    hasDietPlan: boolean;
    hasBillingPlan: boolean;
  };
};

export async function fetchProfessionalInsights(personalId: string): Promise<ProfessionalInsights> {
  const [students, billing, followUps, workoutsRes, dietsRes, anamnesisRes] = await Promise.all([
    fetchMyStudents(),
    fetchBillingSummary(personalId),
    fetchFollowUpAlerts(personalId),
    supabase
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("personal_id", personalId)
      .eq("is_active", true),
    supabase
      .from("diet_plans")
      .select("*", { count: "exact", head: true })
      .eq("personal_id", personalId)
      .eq("is_active", true)
      .eq("is_template", false),
    supabase.from("anamnesis").select("aluno_id").eq("personal_id", personalId).eq("is_active", true),
  ]);

  const withAnamnesis = new Set((anamnesisRes.data ?? []).map((r) => r.aluno_id));
  const studentsWithoutAnamnesis = students.filter((s) => !withAnamnesis.has(s.id)).length;

  return {
    studentCount: students.length,
    studentsWithoutAnamnesis,
    followUpAlerts: followUps.length,
    receivedThisMonth: billing.receivedThisMonth,
    overdueCount: billing.overdueCount,
    pendingCount: billing.pendingCount,
    activeWorkouts: workoutsRes.count ?? 0,
    activeDietPlans: dietsRes.count ?? 0,
  };
}

export async function fetchProfessionalDashboard(
  personalId: string,
): Promise<ProfessionalDashboard> {
  const [insights, invoices, subscriptions, upcoming, billingPlansRes] = await Promise.all([
    fetchProfessionalInsights(personalId),
    fetchInvoices(personalId),
    fetchStudentSubscriptions(personalId),
    fetchUpcomingAppointments(personalId, 30),
    supabase
      .from("billing_plans")
      .select("*", { count: "exact", head: true })
      .eq("personal_id", personalId),
  ]);

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = now.getDay();
  const startWeek = new Date(startToday);
  startWeek.setDate(startToday.getDate() - dayOfWeek);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startYear = new Date(now.getFullYear(), 0, 1);

  const paid = invoices.filter((i) => i.status === "paid" && i.paid_at);
  const sumSince = (from: Date) =>
    paid
      .filter((i) => new Date(i.paid_at as string) >= from)
      .reduce((s, i) => s + i.amount_cents, 0);

  const monthCents = sumSince(startMonth);
  const paidThisMonth = paid.filter((i) => new Date(i.paid_at as string) >= startMonth);
  const transactionsThisMonth = paidThisMonth.length;
  const ticketMedioCents =
    transactionsThisMonth > 0 ? Math.round(monthCents / transactionsThisMonth) : 0;

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const recurringRevenueCents = activeSubs.reduce((s, sub) => s + sub.amount_cents, 0);

  const pending = invoices.filter((i) => i.status === "pending");
  const overdue = invoices.filter((i) => i.status === "overdue");

  const todayStr = startToday.toISOString().slice(0, 10);
  const appointmentsToday = upcoming.filter(
    (a) => new Date(a.scheduled_at).toISOString().slice(0, 10) === todayStr,
  ).length;

  return {
    insights,
    revenue: {
      todayCents: sumSince(startToday),
      weekCents: sumSince(startWeek),
      monthCents,
      yearCents: sumSince(startYear),
    },
    transactionsThisMonth,
    ticketMedioCents,
    recurringRevenueCents,
    activeSubscriptions: activeSubs.length,
    pendingTotalCents: pending.reduce((s, i) => s + i.amount_cents, 0),
    overdueTotalCents: overdue.reduce((s, i) => s + i.amount_cents, 0),
    upcomingAppointments: upcoming.length,
    appointmentsToday,
    checklist: {
      hasStudent: insights.studentCount > 0,
      hasWorkout: insights.activeWorkouts > 0,
      hasDietPlan: insights.activeDietPlans > 0,
      hasBillingPlan: (billingPlansRes.count ?? 0) > 0,
    },
  };
}
