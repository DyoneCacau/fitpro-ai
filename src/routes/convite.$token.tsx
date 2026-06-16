import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Dumbbell, Loader2, Lock, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatProfessionalSpecialties } from "@/lib/professional";
import { formatInviteStatus } from "@/lib/labels";

export const Route = createFileRoute("/convite/$token")({
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const { data: invite, isLoading, error: loadError } = useQuery({
    queryKey: ["invitation", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invitation_public", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  useEffect(() => {
    if (invite?.full_name) setFullName(invite.full_name);
  }, [invite?.full_name]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;

    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            role: "aluno",
            invitation_token: token,
          },
        },
      });
      if (error) throw error;

      if (signUpData.session) {
        await supabase.rpc("complete_student_invitation", { _token: token });
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: invite.email,
          password,
        });
        if (!loginError) {
          await supabase.rpc("complete_student_invitation", { _token: token });
        }
      }

      setInfo("Conta criada! Você já pode entrar com seu e-mail e senha.");
      setTimeout(() => navigate({ to: "/auth", replace: true }), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      if (message.includes("already registered")) {
        setError("Este e-mail já possui conta. Faça login em /auth.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError || !invite) {
    return (
      <InviteShell title="Convite não encontrado">
        <p className="text-sm text-muted-foreground">
          Este link é inválido ou já foi utilizado.
        </p>
      </InviteShell>
    );
  }

  if (invite.status !== "pending") {
    return (
      <InviteShell title="Convite indisponível">
        <p className="text-sm text-muted-foreground">
          Este convite já foi {formatInviteStatus(invite.status).toLowerCase()}.
        </p>
      </InviteShell>
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <InviteShell title="Convite expirado">
        <p className="text-sm text-muted-foreground">
          Peça ao seu profissional para enviar um novo convite.
        </p>
      </InviteShell>
    );
  }

  return (
    <InviteShell title="Aceitar convite">
      <div className="mb-5 rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Convidado por</p>
        <p className="mt-1 font-semibold">{invite.personal_name ?? "Profissional"}</p>
        <p className="text-xs text-primary mt-1">
          {formatProfessionalSpecialties(invite.is_personal_trainer, invite.is_nutritionist)}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {info && (
        <div className="mb-4 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-primary">
          {info}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="E-mail">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              readOnly
              value={invite.email}
              className="w-full rounded-lg border border-input bg-muted/40 pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </Field>

        <Field label="Seu nome">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Nome completo"
            />
          </div>
        </Field>

        <Field label="Criar senha">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </Field>

        <Field label="Confirmar senha">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Repita a senha"
            />
          </div>
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Criar conta e vincular
        </button>
      </form>
    </InviteShell>
  );
}

function InviteShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Dumbbell className="size-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight">FitPro AI</span>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <h1 className="text-2xl font-bold mb-4">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
