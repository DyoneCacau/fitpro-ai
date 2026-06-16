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
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "personal:profiles!profiles_personal_id_fkey(id, full_name, phone, is_personal_trainer, is_nutritionist, registry_type, registry_number)",
        )
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;

      return (
        (data as { personal?: LinkedProfessional | null } | null)?.personal ?? null
      );
    },
  });

  return {
    professional: query.data ?? null,
    isLoading: query.isLoading,
    isStudent,
  };
}
