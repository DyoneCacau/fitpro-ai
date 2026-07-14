import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, Loader2, Mail, Lock, AlertCircle, Apple, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Mode = "login" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isPersonalTrainer, setIsPersonalTrainer] = useState(true);
  const [isNutritionist, setIsNutritionist] = useState(false);
  const [registryType, setRegistryType] = useState<"cref" | "crn">("cref");
  const [registryNumber, setRegistryNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (isPersonalTrainer && !isNutritionist) setRegistryType("cref");
    else if (!isPersonalTrainer && isNutritionist) setRegistryType("crn");
  }, [isPersonalTrainer, isNutritionist]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        navigate({ to: "/", replace: true });
      } else {
        if (!isPersonalTrainer && !isNutritionist) {
          throw new Error("Selecione ao menos uma especialidade.");
        }
        if (!registryNumber.trim()) {
          throw new Error("Informe o número do CREF ou CRN.");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              role: "personal",
              is_personal_trainer: isPersonalTrainer,
              is_nutritionist: isNutritionist,
              registry_type: registryType,
              registry_number: registryNumber.trim(),
            },
          },
        });
        if (error) throw error;
        setInfo("Conta profissional criada! Você já pode entrar e convidar alunos.");
        setMode("login");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      if (message.includes("Invalid login credentials")) {
        setError("E-mail ou senha incorretos.");
      } else if (message.includes("already registered") || message.includes("already been registered")) {
        setError("Este e-mail já está cadastrado. Faça login.");
      } else if (message.toLowerCase().includes("password")) {
        setError("A senha deve ter pelo menos 6 caracteres.");
      } else if (message.includes("especialidade")) {
        setError(message);
      } else {
        setError(message);
      }
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

        {mode === "login" && (
          <p className="text-center text-sm text-muted-foreground -mt-4 mb-6">
            <Link to="/landing" className="text-primary font-semibold hover:underline">
              Conheça o FitPro AI →
            </Link>
          </p>
        )}

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <h1 className="text-2xl font-bold mb-1">
            {mode === "login" ? "Bem-vindo de volta" : "Cadastro profissional"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login"
              ? "Entre com sua conta"
              : "Nutricionista, personal trainer ou ambos"}
          </p>

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

          {mode === "login" && (
            <div className="mb-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Alunos entram pelo link de convite enviado pelo profissional.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nome completo</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Especialidades</label>
                  <div className="grid grid-cols-1 gap-2">
                    <SpecialtyToggle
                      active={isPersonalTrainer}
                      onClick={() => setIsPersonalTrainer((v) => !v)}
                      icon={Dumbbell}
                      label="Personal Trainer"
                    />
                    <SpecialtyToggle
                      active={isNutritionist}
                      onClick={() => setIsNutritionist((v) => !v)}
                      icon={Apple}
                      label="Nutricionista"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Registro profissional</label>
                  {(isPersonalTrainer && isNutritionist) && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setRegistryType("cref")}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                          registryType === "cref"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input bg-background"
                        }`}
                      >
                        CREF
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegistryType("crn")}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                          registryType === "crn"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input bg-background"
                        }`}
                      >
                        CRN
                      </button>
                    </div>
                  )}
                  <input
                    type="text"
                    required
                    value={registryNumber}
                    onChange={(e) => setRegistryNumber(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={registryType === "cref" ? "CREF 000000-G/UF" : "CRN 00000"}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isPersonalTrainer && isNutritionist
                      ? "Escolha qual registro deseja informar no cadastro."
                      : registryType === "cref"
                        ? "Registro de Personal Trainer (CONFEF/CREF)."
                        : "Registro de Nutricionista (CRN)."}
                  </p>
                </div>
              </>
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

            <div>
              <label className="text-sm font-medium mb-1.5 block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {mode === "login" && (
                <div className="text-right mt-1.5">
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    Esqueceu a senha?
                  </Link>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar conta profissional"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "É profissional e ainda não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
                setInfo(null);
              }}
              className="text-primary font-medium hover:underline"
            >
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecialtyToggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Dumbbell;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-input bg-background hover:bg-accent"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
