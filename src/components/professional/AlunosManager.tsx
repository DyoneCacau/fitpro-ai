import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Copy,
  Loader2,
  Mail,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";
import { RecurrencePresetPicker } from "@/components/professional/RecurrencePresetPicker";
import { useAuth } from "@/hooks/use-auth";
import {
  APPOINTMENT_KIND_LABELS,
  RECURRENCE_PRESETS,
  type AppointmentKind,
} from "@/lib/appointments";
import { formatInviteStatus } from "@/lib/labels";
import {
  cancelStudentInvitation,
  createStudentInvitation,
  fetchMyInvitations,
  fetchMyStudents,
} from "@/lib/students";

export function AlunosManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [planDays, setPlanDays] = useState(RECURRENCE_PRESETS[0].days);
  const [planKind, setPlanKind] = useState<AppointmentKind>("retorno");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: students,
    isLoading: loadingStudents,
    error: studentsError,
    refetch: refetchStudents,
    isRefetching: syncingStudents,
  } = useQuery({
    queryKey: ["myStudents", user?.id],
    enabled: !!user?.id,
    refetchOnMount: "always",
    queryFn: () => fetchMyStudents(),
  });

  const { data: invitations, isLoading: loadingInvites } = useQuery({
    queryKey: ["myInvitations", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchMyInvitations(user!.id),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      createStudentInvitation({
        email,
        fullName,
        followUpIntervalDays: planDays,
        followUpKind: planKind,
      }),
    onSuccess: (link) => {
      setInviteLink(link);
      setEmail("");
      setFullName("");
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["myInvitations", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["myStudents", user?.id] });
    },
    onError: (err: Error) => setFormError(err.message),
  });

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const pendingInvites = invitations?.filter((invite) => invite.status === "pending") ?? [];
  const historyInvites = invitations?.filter((invite) => invite.status !== "pending") ?? [];

  async function cancelInvite(id: string) {
    try {
      await cancelStudentInvitation(id);
      void queryClient.invalidateQueries({ queryKey: ["myInvitations", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["myStudents", user?.id] });
    } catch {
      // ignore — status may have changed
    }
  }

  const studentsErrorMessage =
    studentsError instanceof Error ? studentsError.message : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="size-5 text-primary" />
          <h2 className="font-semibold">Convidar aluno</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          O envio por e-mail será configurado depois. Por enquanto, copie o link e envie manualmente.
        </p>

        {formError && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail do aluno"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nome do aluno (opcional)"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />

          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
            <p className="text-xs font-semibold text-foreground">Plano de acompanhamento</p>
            <label className="block space-y-1">
              <span className="text-[11px] text-muted-foreground">Tipo principal</span>
              <select
                value={planKind}
                onChange={(e) => setPlanKind(e.target.value as AppointmentKind)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="retorno">{APPOINTMENT_KIND_LABELS.retorno}</option>
                <option value="avaliacao">{APPOINTMENT_KIND_LABELS.avaliacao}</option>
              </select>
            </label>
            <div>
              <span className="text-[11px] text-muted-foreground block mb-1">Periodicidade</span>
              <RecurrencePresetPicker value={planDays} onChange={setPlanDays} />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Será usado nos agendamentos de retorno e reavaliação deste aluno.
            </p>
          </div>

          <button
            type="button"
            disabled={!email || inviteMutation.isPending}
            onClick={() => inviteMutation.mutate()}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {inviteMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
            Gerar link de convite
          </button>
        </div>

        {inviteLink && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground mb-2">Link do convite</p>
            <p className="text-xs break-all font-mono">{inviteLink}</p>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copiado!" : "Copiar link"}
            </button>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <h2 className="font-semibold">Meus alunos</h2>
          </div>
          <button
            type="button"
            disabled={syncingStudents}
            onClick={() => void refetchStudents()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${syncingStudents ? "animate-spin" : ""}`} />
            Sincronizar
          </button>
        </div>
        {studentsError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-2">
            <p className="text-sm text-destructive font-medium">
              Não foi possível carregar seus alunos.
            </p>
            {studentsErrorMessage && (
              <p className="text-xs text-destructive/90">{studentsErrorMessage}</p>
            )}
            <button
              type="button"
              onClick={() => void refetchStudents()}
              className="text-xs font-semibold text-primary"
            >
              Tentar novamente
            </button>
          </div>
        ) : loadingStudents ? (
          <Loader2 className="size-5 animate-spin text-primary mx-auto" />
        ) : students && students.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Toque no aluno para abrir anamnese, treinos e dieta.
            </p>
            {students.map((student) => (
              <Link
                key={student.id}
                to="/alunos/$alunoId"
                params={{ alunoId: student.id }}
                className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between transition-all active:scale-[0.99]"
              >
                <div>
                  <p className="text-sm font-semibold">{student.full_name ?? "Aluno"}</p>
                  <p className="text-xs text-muted-foreground">Treino · Dieta · Anamnese</p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum aluno vinculado ainda.</p>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-1">Convites pendentes</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Alunos aceitos aparecem em &quot;Meus alunos&quot; acima.
        </p>
        {loadingInvites ? (
          <Loader2 className="size-5 animate-spin text-primary mx-auto" />
        ) : pendingInvites.length > 0 ? (
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{invite.email}</p>
                    {invite.full_name && (
                      <p className="text-xs text-muted-foreground">{invite.full_name}</p>
                    )}
                    <p className="text-xs mt-1 text-primary">{formatInviteStatus(invite.status)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void cancelInvite(invite.id)}
                    className="text-xs text-destructive"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
        )}

        {historyInvites.length > 0 && (
          <div className="mt-5 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Histórico</h3>
            {historyInvites.map((invite) => (
              <div key={invite.id} className="rounded-xl border border-border/60 bg-card/60 px-4 py-3">
                <p className="text-sm font-medium">{invite.email}</p>
                <p className="text-xs mt-1 text-muted-foreground">{formatInviteStatus(invite.status)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
