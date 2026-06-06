import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, Loader2, Mail, AlertCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar e-mail");
    } finally {
      setLoading(false);
    }
  }

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
          <Link to="/auth" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="size-4" /> Voltar
          </Link>

          <h1 className="text-2xl font-bold mb-1">Esqueceu a senha?</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Digite seu e-mail e enviaremos um link para redefinir.
          </p>

          {sent ? (
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-6 text-center">
              <p className="text-sm">
                E-mail enviado para <strong>{email}</strong>. Verifique sua caixa de entrada.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1.5 block">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="voce@email.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                Enviar link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
