import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";

export function AuthGate({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: AppRole[];
}) {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold">Acesso negado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área é restrita ({allowedRoles.join(", ")}). Seu perfil: {role ?? "—"}.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
