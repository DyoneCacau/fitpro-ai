import { supabase } from "@/integrations/supabase/client";
import { fetchBillingSummary } from "@/lib/billing";
import { fetchFollowUpAlerts } from "@/lib/appointments";
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
