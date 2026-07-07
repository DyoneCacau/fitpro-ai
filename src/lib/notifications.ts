import { supabase } from "@/integrations/supabase/client";

export async function createNotification(
  userId: string,
  kind: string,
  title: string,
  body?: string,
  link?: string,
) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    kind,
    title,
    body: body ?? null,
    link: link ?? null,
  });
  if (error) throw error;
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function notifyAnamnesisRequest(
  alunoId: string,
  personalName: string,
) {
  await createNotification(
    alunoId,
    "anamnesis_request",
    "Preencha sua anamnese",
    `${personalName} solicitou que você complete o formulário de anamnese.`,
    "/anamnese",
  );
}

export async function notifyWorkoutPublished(alunoId: string, workoutTitle: string) {
  await createNotification(
    alunoId,
    "workout_published",
    "Novo treino disponível",
    `Seu profissional enviou: ${workoutTitle}`,
    "/treinos",
  );
}

export async function notifyDietPublished(alunoId: string, planName: string) {
  await createNotification(
    alunoId,
    "diet_published",
    "Plano alimentar lançado",
    `Confira: ${planName}`,
    "/dieta",
  );
}

export async function notifyMaterialUploaded(alunoId: string, title: string) {
  await createNotification(
    alunoId,
    "material_uploaded",
    "Novo material disponível",
    title,
    "/acompanhamento",
  );
}
