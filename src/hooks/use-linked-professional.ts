import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type LinkedProfessional = {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_personal_trainer: boolean;
  is_nutritionist: boolean;
  registry_type: "cref" | "crn" | null;
  registry_number: string | null;
};

export function useLinkedProfessional() {
  const { user, role } = useAuth();
  const isStudent = role === "aluno";

  const query = useQuery({
    queryKey: ["linkedProfessional", user?.id],
    enabled: !!user?.id && isStudent,
    queryFn: async () => {
      const { data: mine, error: mineError } = await supabase
        .from("profiles")
        .select("personal_id")
        .eq("id", user!.id)
        .maybeSingle();

      if (mineError) throw mineError;
      if (!mine?.personal_id) return null;

      const { data: pro, error: proError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, phone, is_personal_trainer, is_nutritionist, registry_type, registry_number",
        )
        .eq("id", mine.personal_id)
        .maybeSingle();

      if (proError) throw proError;
      return (pro as LinkedProfessional | null) ?? null;
    },
  });

  return {
    professional: query.data ?? null,
    isLoading: query.isLoading,
    isStudent,
  };
}
