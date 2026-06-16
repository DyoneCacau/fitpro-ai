import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "personal" | "aluno";

export interface AuthProfile {
  is_personal_trainer: boolean;
  is_nutritionist: boolean;
  personal_id: string | null;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: AuthProfile | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setTimeout(() => {
          void loadAuthContext(newSession.user.id).then(({ role, profile }) => {
            setRole(role);
            setProfile(profile);
          });
        }, 0);
      } else {
        setRole(null);
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        void loadAuthContext(data.session.user.id).then(({ role, profile }) => {
          setRole(role);
          setProfile(profile);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, role, profile, loading };
}

async function loadAuthContext(userId: string): Promise<{
  role: AppRole | null;
  profile: AuthProfile | null;
}> {
  const [{ data: roleData }, { data: profileData }] = await Promise.all([
    supabase.rpc("get_primary_role", { _user_id: userId }),
    supabase
      .from("profiles")
      .select("is_personal_trainer, is_nutritionist, personal_id")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const role = (roleData as AppRole | null) ?? null;

  if (role === "aluno") {
    await supabase.rpc("repair_my_student_link");
  }

  return {
    role,
    profile: profileData
      ? {
          is_personal_trainer: profileData.is_personal_trainer,
          is_nutritionist: profileData.is_nutritionist,
          personal_id: profileData.personal_id,
        }
      : null,
  };
}
