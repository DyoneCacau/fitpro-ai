import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { AnthropometricMeasurements } from "@/lib/anthropometry";

export type Assessment = {
  id: string;
  assessed_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  lean_mass_kg: number | null;
  measurements: AnthropometricMeasurements | Record<string, number> | null;
  photos: string[] | null;
  notes: string | null;
};

export type StudentMaterial = {
  id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  category: string;
  created_at: string;
};

export type StudentLabExam = {
  id: string;
  exam_name: string;
  exam_date: string | null;
  results: string | null;
  notes: string | null;
  created_at: string;
};

export async function fetchStudentAssessments(alunoId: string) {
  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("assessed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Assessment[];
}

export async function fetchStudentMaterials(alunoId: string) {
  const { data, error } = await supabase
    .from("student_materials")
    .select("id, title, description, link_url, category, created_at")
    .eq("aluno_id", alunoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StudentMaterial[];
}

export async function fetchStudentLabExams(alunoId: string) {
  const { data, error } = await supabase
    .from("student_lab_exams")
    .select("id, exam_name, exam_date, results, notes, created_at")
    .eq("aluno_id", alunoId)
    .order("exam_date", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as StudentLabExam[];
}

export async function createAssessment(input: {
  personalId: string;
  alunoId: string;
  assessedAt: string;
  weightKg?: number | null;
  heightCm?: number | null;
  bodyFatPct?: number | null;
  leanMassKg?: number | null;
  measurements?: AnthropometricMeasurements | null;
  notes?: string | null;
}) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError ?? new Error("Não autenticado");

  const { error } = await supabase.from("assessments").insert({
    personal_id: authData.user.id,
    aluno_id: input.alunoId,
    assessed_at: input.assessedAt,
    weight_kg: input.weightKg ?? null,
    height_cm: input.heightCm ?? null,
    body_fat_pct: input.bodyFatPct ?? null,
    lean_mass_kg: input.leanMassKg ?? null,
    measurements: (input.measurements ?? {}) as Json,
    notes: input.notes?.trim() || null,
  });
  if (error) throw error;
}

export async function updateAssessment(input: {
  id: string;
  assessedAt: string;
  weightKg?: number | null;
  heightCm?: number | null;
  bodyFatPct?: number | null;
  leanMassKg?: number | null;
  measurements?: AnthropometricMeasurements | null;
  notes?: string | null;
}) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError ?? new Error("Não autenticado");

  const { error } = await supabase
    .from("assessments")
    .update({
      personal_id: authData.user.id,
      assessed_at: input.assessedAt,
      weight_kg: input.weightKg ?? null,
      height_cm: input.heightCm ?? null,
      body_fat_pct: input.bodyFatPct ?? null,
      lean_mass_kg: input.leanMassKg ?? null,
      measurements: (input.measurements ?? {}) as Json,
      notes: input.notes?.trim() || null,
    })
    .eq("id", input.id);
  if (error) throw error;
}

export async function removeAssessment(id: string) {
  const { error } = await supabase.from("assessments").delete().eq("id", id);
  if (error) throw error;
}

export type { AnamnesisContext } from "@/lib/anamnesis";
export { fetchStudentAnamnesisContext } from "@/lib/anamnesis";

export type { StudentProfile } from "@/lib/students";
export { fetchStudentProfile } from "@/lib/students";

export async function addStudentMaterial(input: {
  personalId: string;
  alunoId: string;
  title: string;
  description?: string;
  linkUrl?: string;
  category?: string;
}) {
  const { error } = await supabase.from("student_materials").insert({
    personal_id: input.personalId,
    aluno_id: input.alunoId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    link_url: input.linkUrl?.trim() || null,
    category: input.category ?? "nutricao",
  });
  if (error) throw error;
}

export async function removeStudentMaterial(id: string) {
  const { error } = await supabase.from("student_materials").delete().eq("id", id);
  if (error) throw error;
}

export async function addStudentLabExam(input: {
  personalId: string;
  alunoId: string;
  examName: string;
  examDate?: string | null;
  results?: string;
  notes?: string;
}) {
  const { error } = await supabase.from("student_lab_exams").insert({
    personal_id: input.personalId,
    aluno_id: input.alunoId,
    exam_name: input.examName.trim(),
    exam_date: input.examDate || null,
    results: input.results?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  if (error) throw error;
}

export async function removeStudentLabExam(id: string) {
  const { error } = await supabase.from("student_lab_exams").delete().eq("id", id);
  if (error) throw error;
}

export function buildAssessmentChartData(assessments: Assessment[]) {
  return [...assessments]
    .reverse()
    .map((a) => ({
      date: new Date(a.assessed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      peso: a.weight_kg != null ? Number(a.weight_kg) : null,
      gordura: a.body_fat_pct != null ? Number(a.body_fat_pct) : null,
      massaMagra: a.lean_mass_kg != null ? Number(a.lean_mass_kg) : null,
    }))
    .filter((row) => row.peso != null || row.gordura != null || row.massaMagra != null);
}
