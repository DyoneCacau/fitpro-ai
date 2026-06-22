import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Camera, CheckCircle2, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchUserProfile,
  getProfileErrorMessage,
  PROFILE_QUERY_KEY,
  resolveAvatarUrl,
  updateProfileFields,
  updateUserEmail,
  updateUserPassword,
  uploadProfileAvatar,
} from "@/lib/profile";

type Props = {
  embedded?: boolean;
  onAvatarChange?: (url: string | null) => void;
  onNameChange?: (name: string) => void;
};

export function ProfileSettingsForm({ embedded = false, onAvatarChange, onNameChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: [PROFILE_QUERY_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchUserProfile(user!.id),
  });

  const { data: avatarPreview } = useQuery({
    queryKey: [PROFILE_QUERY_KEY, user?.id, "avatar", profile?.avatar_url],
    enabled: !!profile?.avatar_url,
    queryFn: () => resolveAvatarUrl(profile!.avatar_url),
  });

  useEffect(() => {
    if (!profile && !user) return;
    setFullName(
      profile?.full_name ??
        (user?.user_metadata?.full_name as string | undefined) ??
        "",
    );
    setPhone(profile?.phone ?? "");
    setEmail(user?.email ?? "");
  }, [profile, user]);

  useEffect(() => {
    onAvatarChange?.(avatarPreview ?? null);
  }, [avatarPreview, onAvatarChange]);

  useEffect(() => {
    const name =
      profile?.full_name ??
      (user?.user_metadata?.full_name as string | undefined) ??
      user?.email ??
      "";
    if (name) onNameChange?.(name);
  }, [profile, user, onNameChange]);

  const invalidateProfile = () => {
    void qc.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY, user?.id] });
  };

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const path = await uploadProfileAvatar(user!.id, file);
      await updateProfileFields(user!.id, { avatar_url: path });
    },
    onSuccess: () => invalidateProfile(),
    onError: (err) => setDataError(getProfileErrorMessage(err)),
  });

  const saveData = useMutation({
    mutationFn: async () => {
      await updateProfileFields(user!.id, {
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      });
    },
    onSuccess: () => {
      setDataError(null);
      setDataMessage("Dados salvos com sucesso.");
      onNameChange?.(fullName.trim() || user?.email || "");
      invalidateProfile();
    },
    onError: (err) => {
      setDataMessage(null);
      setDataError(getProfileErrorMessage(err));
    },
  });

  const saveEmail = useMutation({
    mutationFn: async () => updateUserEmail(email),
    onSuccess: () => {
      setEmailError(null);
      setEmailMessage(
        "Enviamos um link de confirmação para o novo e-mail. Confirme para concluir a alteração.",
      );
    },
    onError: (err) => {
      setEmailMessage(null);
      setEmailError(getProfileErrorMessage(err));
    },
  });

  const savePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("As senhas não coincidem.");
      }
      await updateUserPassword(newPassword);
    },
    onSuccess: () => {
      setPasswordError(null);
      setPasswordMessage("Senha alterada com sucesso.");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      setPasswordMessage(null);
      setPasswordError(getProfileErrorMessage(err));
    },
  });

  const displayName =
    fullName.trim() ||
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    "Usuário";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (isLoading) {
    return (
      <div className={`flex justify-center ${embedded ? "py-4" : "py-8"}`}>
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const sectionClass = embedded
    ? "space-y-3 pt-4 border-t border-border first:border-0 first:pt-0"
    : "rounded-2xl border border-border bg-card p-4 space-y-3";

  return (
    <div className={embedded ? "space-y-0" : "space-y-4"}>
      <section className={embedded ? "space-y-3 pb-4 border-b border-border" : sectionClass}>
        <h3 className={`text-sm font-bold ${embedded ? "" : "mb-1"}`}>Foto do perfil</h3>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadAvatar.isPending}
            className="relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Alterar foto do perfil"
          >
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              {avatarPreview && <AvatarImage src={avatarPreview} alt={displayName} />}
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
              {uploadAvatar.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
            </span>
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Alterar foto</p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG ou PNG, até 5 MB. Toque na imagem para escolher.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) uploadAvatar.mutate(file);
            }}
          />
        </div>
        {dataError && uploadAvatar.isError && (
          <p className="mt-3 text-xs text-destructive">{dataError}</p>
        )}
      </section>

      <section className={sectionClass}>
        <h3 className="text-sm font-bold">Dados pessoais</h3>
        <Field label="Nome completo" icon={User}>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="field-input pl-9"
            placeholder="Seu nome"
            disabled={saveData.isPending}
          />
        </Field>
        <Field label="Telefone" icon={Phone}>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="field-input pl-9"
            placeholder="(00) 00000-0000"
            inputMode="tel"
            disabled={saveData.isPending}
          />
        </Field>
        {dataError && !uploadAvatar.isError && (
          <Message type="error" text={dataError} />
        )}
        {dataMessage && <Message type="success" text={dataMessage} />}
        <button
          type="button"
          onClick={() => {
            setDataMessage(null);
            setDataError(null);
            saveData.mutate();
          }}
          disabled={saveData.isPending}
          className="w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {saveData.isPending ? "Salvando…" : "Salvar dados"}
        </button>
      </section>

      <section className={sectionClass}>
        <h3 className="text-sm font-bold">E-mail</h3>
        <Field label="Endereço de e-mail" icon={Mail}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input pl-9"
            placeholder="seu@email.com"
            disabled={saveEmail.isPending}
          />
        </Field>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Ao alterar o e-mail, enviaremos um link de confirmação para o novo endereço.
        </p>
        {emailError && <Message type="error" text={emailError} />}
        {emailMessage && <Message type="success" text={emailMessage} />}
        <button
          type="button"
          onClick={() => {
            setEmailMessage(null);
            setEmailError(null);
            saveEmail.mutate();
          }}
          disabled={saveEmail.isPending || email.trim() === (user?.email ?? "")}
          className="w-full rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-sm font-bold text-primary disabled:opacity-50"
        >
          {saveEmail.isPending ? "Enviando…" : "Atualizar e-mail"}
        </button>
      </section>

      <section className={sectionClass}>
        <h3 className="text-sm font-bold">Nova senha</h3>
        <Field label="Nova senha" icon={Lock}>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="field-input pl-9"
            placeholder="••••••••"
            minLength={6}
            disabled={savePassword.isPending}
          />
        </Field>
        <Field label="Confirmar nova senha" icon={Lock}>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="field-input pl-9"
            placeholder="••••••••"
            minLength={6}
            disabled={savePassword.isPending}
          />
        </Field>
        {passwordError && <Message type="error" text={passwordError} />}
        {passwordMessage && <Message type="success" text={passwordMessage} />}
        <button
          type="button"
          onClick={() => {
            setPasswordMessage(null);
            setPasswordError(null);
            savePassword.mutate();
          }}
          disabled={savePassword.isPending || !newPassword.trim()}
          className="w-full rounded-xl border border-border py-2.5 text-sm font-bold text-foreground hover:bg-muted/30 disabled:opacity-50"
        >
          {savePassword.isPending ? "Alterando…" : "Alterar senha"}
        </button>
      </section>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="relative mt-1">
        <Icon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
        {children}
      </div>
    </div>
  );
}

function Message({ type, text }: { type: "error" | "success"; text: string }) {
  const isError = type === "error";
  return (
    <div
      className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${
        isError
          ? "bg-destructive/10 text-destructive border border-destructive/20"
          : "bg-primary/10 text-primary border border-primary/20"
      }`}
    >
      {isError ? (
        <AlertCircle className="size-4 shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
      )}
      <span>{text}</span>
    </div>
  );
}
