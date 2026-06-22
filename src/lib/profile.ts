import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl, uploadUserFile } from "@/lib/storage";

export type UserProfile = {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export const PROFILE_QUERY_KEY = "userProfile";

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, phone, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function resolveAvatarUrl(avatarPath: string | null | undefined): Promise<string | null> {
  if (!avatarPath) return null;
  return getSignedUrl("avatars", avatarPath);
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }
  return uploadUserFile("avatars", userId, file);
}

export async function updateProfileFields(
  userId: string,
  fields: Partial<Pick<UserProfile, "full_name" | "phone" | "avatar_url">>,
) {
  const { error } = await supabase.from("profiles").update(fields).eq("id", userId);
  if (error) throw error;

  if (fields.full_name !== undefined) {
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fields.full_name },
    });
    if (authError) throw authError;
  }
}

export async function updateUserEmail(email: string) {
  const trimmed = email.trim();
  if (!trimmed) throw new Error("Informe um e-mail válido.");
  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) throw error;
}

export async function updateUserPassword(password: string) {
  if (password.length < 6) {
    throw new Error("A senha deve ter pelo menos 6 caracteres.");
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export function getProfileErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Erro ao salvar alterações.";
}
