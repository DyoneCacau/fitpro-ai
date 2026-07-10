import { supabase } from "@/integrations/supabase/client";
import { fetchMyStudents } from "@/lib/students";

export type RoutineLevel = "adaptacao" | "iniciante" | "intermediario" | "avancado";
export type RoutineStatus = "scheduled" | "active" | "archived";
export type RoutineSchedule = "por_letra" | "por_dia_semana";
export type RoutineKind = "treinos" | "aerobico";
export type RoutineTargetSex = "masculino" | "feminino" | "unissex";

export type WorkoutRoutineRow = {
  id: string;
  personal_id: string;
  aluno_id: string | null;
  name: string;
  is_template: boolean;
  level: RoutineLevel;
  objective: string | null;
  difficulty: string | null;
  schedule_type: RoutineSchedule;
  routine_kind: RoutineKind;
  target_sex: RoutineTargetSex;
  starts_at: string | null;
  ends_at: string | null;
  auto_archive_on_end: boolean;
  hide_before_start: boolean;
  notes: string | null;
  status: RoutineStatus;
  created_at: string;
};

export const ROUTINE_KIND_LABELS: Record<RoutineKind, string> = {
  treinos: "Rotina de treinos",
  aerobico: "Aeróbico",
};

export const ROUTINE_SEX_LABELS: Record<RoutineTargetSex, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  unissex: "Unissex",
};

export const ROUTINE_OBJECTIVE_PRESETS = [
  "Redução de Gordura",
  "Hipertrofia",
  "Definição",
  "Manutenção",
  "Performance",
  "Adaptação",
] as const;

export const ROUTINE_LEVEL_ORDER: RoutineLevel[] = [
  "adaptacao",
  "iniciante",
  "intermediario",
  "avancado",
];

export const ROUTINE_LEVEL_LABELS: Record<RoutineLevel, string> = {
  adaptacao: "Adaptação",
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export const ROUTINE_STATUS_LABELS: Record<RoutineStatus, string> = {
  scheduled: "Agendada",
  active: "Ativa",
  archived: "Arquivada",
};

export const ROUTINE_SCHEDULE_LABELS: Record<RoutineSchedule, string> = {
  por_letra: "Treinos A, B, C…",
  por_dia_semana: "Por dia da semana",
};

export function formatRoutinePeriod(routine: Pick<WorkoutRoutineRow, "starts_at" | "ends_at">) {
  if (!routine.starts_at && !routine.ends_at) return "Sem prazo definido";
  const start = routine.starts_at
    ? new Date(routine.starts_at + "T12:00:00").toLocaleDateString("pt-BR")
    : "—";
  const end = routine.ends_at
    ? new Date(routine.ends_at + "T12:00:00").toLocaleDateString("pt-BR")
    : "—";
  return `${start} → ${end}`;
}

export function initialRoutineStatus(
  startsAt: string | null,
  hideBeforeStart: boolean,
): RoutineStatus {
  if (!startsAt) return "active";
  const start = new Date(startsAt + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  if (hideBeforeStart && start > today) return "scheduled";
  return "active";
}

export async function refreshRoutineStatuses() {
  const { error } = await supabase.rpc("refresh_workout_routine_statuses");
  if (error && !isMissingRoutineSchema(error)) throw error;
}

function isMissingRoutineSchema(error: { code?: string; message?: string }) {
  const msg = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    msg.includes("workout_routines") ||
    msg.includes("refresh_workout_routine_statuses")
  );
}

export async function routinesSupported(): Promise<boolean> {
  const { error } = await supabase.from("workout_routines").select("id").limit(1);
  return !error || !isMissingRoutineSchema(error);
}

export async function ensureDefaultStudentRoutine(alunoId: string, personalId: string) {
  const routines = await fetchStudentRoutines(alunoId, personalId);
  const active = routines.find((r) => r.status === "active") ?? routines[0];
  if (active) return active.id;

  return createStudentRoutine({
    alunoId,
    personalId,
    name: "Rotina principal",
    autoArchiveOnEnd: false,
    hideBeforeStart: false,
  });
}

export type PeerRoutine = WorkoutRoutineRow & { studentName: string | null; studentId: string };

export async function fetchPeerStudentRoutines(personalId: string, excludeAlunoId: string) {
  const students = await fetchMyStudents();

  const peers = students.filter((s) => s.id !== excludeAlunoId);
  const all: PeerRoutine[] = [];

  for (const student of peers) {
    const routines = await fetchStudentRoutines(student.id, personalId).catch(() => []);
    for (const routine of routines) {
      all.push({
        ...routine,
        studentId: student.id,
        studentName: student.full_name ?? "Aluno",
      });
    }
  }

  return all.sort((a, b) => (a.studentName ?? "").localeCompare(b.studentName ?? ""));
}

export async function fetchStudentRoutines(alunoId: string, personalId: string) {
  await refreshRoutineStatuses();
  const { data, error } = await supabase
    .from("workout_routines")
    .select("*")
    .eq("aluno_id", alunoId)
    .eq("personal_id", personalId)
    .eq("is_template", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkoutRoutineRow[];
}

export async function fetchTemplateRoutines(
  personalId: string,
  filters?: { kind?: RoutineKind; sex?: RoutineTargetSex | "all" },
) {
  let q = supabase
    .from("workout_routines")
    .select("*")
    .eq("personal_id", personalId)
    .eq("is_template", true)
    .order("level")
    .order("name");
  if (filters?.kind) q = q.eq("routine_kind", filters.kind);
  if (filters?.sex && filters.sex !== "all") {
    q = q.in("target_sex", [filters.sex, "unissex"]);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WorkoutRoutineRow[];
}

export async function createStudentRoutine(input: {
  alunoId: string;
  personalId: string;
  name: string;
  level?: RoutineLevel;
  objective?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  autoArchiveOnEnd?: boolean;
  hideBeforeStart?: boolean;
  notes?: string;
  scheduleType?: RoutineSchedule;
}) {
  const status = initialRoutineStatus(input.startsAt ?? null, input.hideBeforeStart ?? true);
  const { data, error } = await supabase
    .from("workout_routines")
    .insert({
      personal_id: input.personalId,
      aluno_id: input.alunoId,
      name: input.name.trim(),
      is_template: false,
      level: input.level ?? "iniciante",
      objective: input.objective?.trim() || null,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      auto_archive_on_end: input.autoArchiveOnEnd ?? false,
      hide_before_start: input.hideBeforeStart ?? false,
      notes: input.notes?.trim() || null,
      schedule_type: input.scheduleType ?? "por_letra",
      status,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function createTemplateRoutine(input: {
  personalId: string;
  name: string;
  level?: RoutineLevel;
  objective?: string;
  notes?: string;
  routineKind?: RoutineKind;
  targetSex?: RoutineTargetSex;
}) {
  const { data, error } = await supabase
    .from("workout_routines")
    .insert({
      personal_id: input.personalId,
      aluno_id: null,
      name: input.name.trim(),
      is_template: true,
      level: input.level ?? "iniciante",
      objective: input.objective?.trim() || null,
      routine_kind: input.routineKind ?? "treinos",
      target_sex: input.targetSex ?? "unissex",
      auto_archive_on_end: false,
      hide_before_start: false,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteTemplateRoutine(routineId: string) {
  const { error } = await supabase.from("workout_routines").delete().eq("id", routineId);
  if (error) throw error;
}

export async function updateRoutine(
  routineId: string,
  patch: Partial<
    Pick<
      WorkoutRoutineRow,
      | "name"
      | "level"
      | "objective"
      | "difficulty"
      | "schedule_type"
      | "starts_at"
      | "ends_at"
      | "auto_archive_on_end"
      | "hide_before_start"
      | "notes"
      | "status"
      | "routine_kind"
      | "target_sex"
    >
  >,
) {
  const { error } = await supabase.from("workout_routines").update(patch).eq("id", routineId);
  if (error) throw error;
  await refreshRoutineStatuses();
}

export async function cloneRoutineToStudent(
  sourceRoutineId: string,
  targetAlunoId: string,
  options?: { name?: string; startsAt?: string | null; endsAt?: string | null },
) {
  const { data, error } = await supabase.rpc("clone_workout_routine", {
    _source_routine_id: sourceRoutineId,
    _target_aluno_id: targetAlunoId,
    _name: options?.name ?? undefined,
    _starts_at: options?.startsAt ?? undefined,
    _ends_at: options?.endsAt ?? undefined,
  });
  if (error) throw error;
  return data as string;
}
