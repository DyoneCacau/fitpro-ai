import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppointmentKind } from "@/lib/appointments";

export type StudentRow = {
  id: string;
  full_name: string | null;
  created_at: string;
};

export type StudentProfile = StudentRow & {
  personal_id: string | null;
};

export type StudentInvitation = {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
  personal_id: string;
  accepted_by: string | null;
};

function formatSupabaseError(error: PostgrestError | Error): string {
  if ("message" in error) {
    const parts = [error.message];
    if ("details" in error && error.details) parts.push(error.details);
    if ("hint" in error && error.hint) parts.push(error.hint);
    return parts.join(" — ");
  }
  return String(error);
}

export const HOME_CLIENT_PREVIEW = 6;

export function sortStudentsByName(students: StudentRow[]): StudentRow[] {
  return [...students].sort((a, b) =>
    (a.full_name ?? "").localeCompare(b.full_name ?? "", "pt-BR", { sensitivity: "base" }),
  );
}

export function filterStudentsByName(students: StudentRow[], query: string): StudentRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return students;
  return students.filter((s) => (s.full_name ?? "").toLowerCase().includes(q));
}

export async function fetchMyStudents(): Promise<StudentRow[]> {
  const { data, error } = await supabase.rpc("get_my_students");
  if (error) throw new Error(formatSupabaseError(error));
  return sortStudentsByName((data ?? []) as StudentRow[]);
}

export async function fetchStudentProfile(alunoId: string): Promise<StudentProfile | null> {
  const { data, error } = await supabase.rpc("get_student_profile", {
    _aluno_id: alunoId,
  });
  if (error) throw new Error(formatSupabaseError(error));
  return (data?.[0] as StudentProfile | undefined) ?? null;
}

export async function fetchMyInvitations(personalId: string): Promise<StudentInvitation[]> {
  const { data, error } = await supabase
    .from("student_invitations")
    .select("*")
    .eq("personal_id", personalId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(formatSupabaseError(error));
  return (data ?? []) as StudentInvitation[];
}

export async function createStudentInvitation(input: {
  email: string;
  fullName?: string;
  followUpIntervalDays: number;
  followUpKind: AppointmentKind;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_student_invitation", {
    _email: input.email.trim(),
    _full_name: input.fullName?.trim() || null,
    _follow_up_interval_days: input.followUpIntervalDays,
    _follow_up_kind: input.followUpKind,
  });
  if (error) throw new Error(formatSupabaseError(error));

  const row = data?.[0] as { invite_url?: string } | undefined;
  if (!row?.invite_url) throw new Error("Não foi possível criar o convite.");
  return `${window.location.origin}${row.invite_url}`;
}

export async function cancelStudentInvitation(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from("student_invitations")
    .update({ status: "cancelled" })
    .eq("id", inviteId)
    .eq("status", "pending");
  if (error) throw new Error(formatSupabaseError(error));
}
