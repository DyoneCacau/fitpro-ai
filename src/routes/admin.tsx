import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Shield,
  Unlock,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import {
  adminBlockProfessional,
  adminCancelSubscription,
  adminChangePlan,
  adminRecordManualPayment,
  fetchAdminPayments,
  fetchAdminProfessionals,
  formatPlanPrice,
  methodLabel,
  paymentStatusLabel,
  planLabel,
  statusLabel,
  summarizeProfessionals,
  type AdminPaymentRow,
  type AdminProfessionalRow,
  type PaymentMethod,
  PLANS,
} from "@/lib/admin-professionals";
import type { PlanId } from "@/lib/professional-onboarding";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — FitPro AI" }] }),
  component: () => (
    <AuthGate allowedRoles={["admin"]}>
      <AdminPage />
    </AuthGate>
  ),
});

type StatusFilter =
  | "all"
  | "trial"
  | "active"
  | "past_due"
  | "canceled"
  | "blocked"
  | "expiring"
  | "overdue";

type PanelTab = "professionals" | "payments";

function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<PanelTab>("professionals");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [actionFor, setActionFor] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<"release" | "plan" | null>(null);
  const [formPlan, setFormPlan] = useState<PlanId>("standard");
  const [formMethod, setFormMethod] = useState<PaymentMethod>("external");
  const [formDays, setFormDays] = useState(30);
  const [formNotes, setFormNotes] = useState("");

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["adminProfessionals"],
    queryFn: fetchAdminProfessionals,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["adminPayments"],
    queryFn: () => fetchAdminPayments(),
  });

  const summary = useMemo(() => summarizeProfessionals(rows), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "expiring" && !r.isExpiringSoon) return false;
      if (filter === "overdue" && !r.isOverdue) return false;
      if (
        filter !== "all" &&
        filter !== "expiring" &&
        filter !== "overdue" &&
        r.status !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        (r.fullName ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  const release = useMutation({
    mutationFn: () =>
      adminRecordManualPayment({
        professionalId: actionFor!,
        plan: formPlan,
        method: formMethod,
        notes: formNotes || null,
        extendDays: formDays,
      }),
    onSuccess: () => {
      setActionFor(null);
      setActionMode(null);
      void qc.invalidateQueries({ queryKey: ["adminProfessionals"] });
      void qc.invalidateQueries({ queryKey: ["adminPayments"] });
    },
  });

  const changePlan = useMutation({
    mutationFn: () => adminChangePlan(actionFor!, formPlan),
    onSuccess: () => {
      setActionFor(null);
      setActionMode(null);
      void qc.invalidateQueries({ queryKey: ["adminProfessionals"] });
    },
  });

  const block = useMutation({
    mutationFn: (id: string) => adminBlockProfessional(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["adminProfessionals"] }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => adminCancelSubscription(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["adminProfessionals"] }),
  });

  return (
    <AppShell>
      <PageHeader
        title="Painel admin"
        subtitle="Profissionais que usam e pagam a plataforma FitPro"
      />

      <div className="px-5 md:px-8 pb-10 space-y-4 max-w-5xl">
        <div className="flex gap-2">
          <TabBtn active={tab === "professionals"} onClick={() => setTab("professionals")}>
            <Users className="size-3.5" /> Profissionais
          </TabBtn>
          <TabBtn active={tab === "payments"} onClick={() => setTab("payments")}>
            <CreditCard className="size-3.5" /> Pagamentos
          </TabBtn>
        </div>

        {tab === "professionals" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <SummaryCard label="Total" value={String(summary.total)} />
              <SummaryCard label="Trial" value={String(summary.trial)} />
              <SummaryCard label="Adimplentes" value={String(summary.active)} tone="success" />
              <SummaryCard
                label="Aguardando"
                value={String(summary.awaitingPayment)}
                tone={summary.awaitingPayment > 0 ? "warn" : undefined}
              />
              <SummaryCard label="Bloqueados" value={String(summary.blocked)} />
              <SummaryCard
                label="Vencendo"
                value={String(summary.expiringSoon)}
                tone={summary.expiringSoon > 0 ? "warn" : undefined}
              />
              <SummaryCard
                label="Em atraso"
                value={String(summary.overdue)}
                tone={summary.overdue > 0 ? "danger" : undefined}
              />
              <SummaryCard label="Alunos na base" value={String(summary.studentsTotal)} />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nome ou e-mail…"
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as StatusFilter)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Todos</option>
                <option value="trial">Trial</option>
                <option value="active">Adimplentes</option>
                <option value="past_due">Aguardando</option>
                <option value="expiring">Vencendo</option>
                <option value="overdue">Em atraso</option>
                <option value="blocked">Bloqueados</option>
                <option value="canceled">Cancelados</option>
              </select>
            </div>

            {isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive">
                {error instanceof Error ? error.message : "Erro ao carregar"}
              </p>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum profissional encontrado.
              </p>
            )}

            <div className="space-y-3">
              {filtered.map((row) => (
                <ProfessionalCard
                  key={row.professionalId}
                  row={row}
                  acting={actionFor === row.professionalId}
                  actionMode={actionFor === row.professionalId ? actionMode : null}
                  formPlan={formPlan}
                  formMethod={formMethod}
                  formDays={formDays}
                  formNotes={formNotes}
                  onFormPlan={setFormPlan}
                  onFormMethod={setFormMethod}
                  onFormDays={setFormDays}
                  onFormNotes={setFormNotes}
                  onOpenRelease={() => {
                    setActionFor(row.professionalId);
                    setActionMode("release");
                    setFormPlan(row.plan);
                    setFormNotes("");
                    setFormDays(30);
                    setFormMethod("external");
                  }}
                  onOpenPlan={() => {
                    setActionFor(row.professionalId);
                    setActionMode("plan");
                    setFormPlan(row.plan);
                  }}
                  onClose={() => {
                    setActionFor(null);
                    setActionMode(null);
                  }}
                  onConfirmRelease={() => release.mutate()}
                  onConfirmPlan={() => changePlan.mutate()}
                  onBlock={() => {
                    if (window.confirm(`Bloquear ${row.fullName ?? row.email}?`)) {
                      block.mutate(row.professionalId);
                    }
                  }}
                  onCancel={() => {
                    if (window.confirm(`Cancelar assinatura de ${row.fullName ?? row.email}?`)) {
                      cancel.mutate(row.professionalId);
                    }
                  }}
                  releasePending={release.isPending}
                  planPending={changePlan.isPending}
                  blockPending={block.isPending}
                  cancelPending={cancel.isPending}
                />
              ))}
            </div>
          </>
        )}

        {tab === "payments" && (
          <PaymentsPanel payments={payments} loading={loadingPayments} />
        )}
      </div>
    </AppShell>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warn" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3",
        tone === "success" && "border-success/40 bg-success/5",
        tone === "warn" && "border-amber-500/40 bg-amber-500/5",
        tone === "danger" && "border-destructive/40 bg-destructive/5",
        !tone && "border-border bg-card",
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function ProfessionalCard({
  row,
  acting,
  actionMode,
  formPlan,
  formMethod,
  formDays,
  formNotes,
  onFormPlan,
  onFormMethod,
  onFormDays,
  onFormNotes,
  onOpenRelease,
  onOpenPlan,
  onClose,
  onConfirmRelease,
  onConfirmPlan,
  onBlock,
  onCancel,
  releasePending,
  planPending,
  blockPending,
  cancelPending,
}: {
  row: AdminProfessionalRow;
  acting: boolean;
  actionMode: "release" | "plan" | null;
  formPlan: PlanId;
  formMethod: PaymentMethod;
  formDays: number;
  formNotes: string;
  onFormPlan: (p: PlanId) => void;
  onFormMethod: (m: PaymentMethod) => void;
  onFormDays: (n: number) => void;
  onFormNotes: (s: string) => void;
  onOpenRelease: () => void;
  onOpenPlan: () => void;
  onClose: () => void;
  onConfirmRelease: () => void;
  onConfirmPlan: () => void;
  onBlock: () => void;
  onCancel: () => void;
  releasePending: boolean;
  planPending: boolean;
  blockPending: boolean;
  cancelPending: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-foreground">{row.fullName || "Sem nome"}</p>
            <Badge tone={row.status === "past_due" || row.isOverdue ? "warn" : row.status === "blocked" ? "danger" : undefined}>
              {statusLabel(row.status)}
            </Badge>
            <Badge>{planLabel(row.plan)}</Badge>
            <Badge>{paymentStatusLabel(row.status)}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{row.email}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {row.studentCount}
            {row.studentLimit != null ? `/${row.studentLimit}` : ""} alunos
            {row.daysUntilExpiry != null && (
              <>
                {" · "}
                {row.daysUntilExpiry < 0 ? (
                  <span className="text-destructive font-semibold">vencido</span>
                ) : row.isExpiringSoon ? (
                  <span className="text-amber-600 font-semibold inline-flex items-center gap-0.5">
                    <Clock className="size-3" /> {row.daysUntilExpiry}d
                  </span>
                ) : (
                  `${row.daysUntilExpiry}d restantes`
                )}
              </>
            )}
            {row.priceCents > 0 && <> · {formatPlanPrice(row.priceCents)}/mês</>}
          </p>
          {row.lastPaymentAt && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Último pagamento: {new Date(row.lastPaymentAt).toLocaleDateString("pt-BR")}
              {row.lastPaymentAmountCents != null
                ? ` · ${formatPlanPrice(row.lastPaymentAmountCents)}`
                : ""}
            </p>
          )}
        </div>

        {!acting ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenRelease}
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground"
            >
              <Unlock className="size-3.5" />
              Liberar / pagar
            </button>
            <button
              type="button"
              onClick={onOpenPlan}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-[11px] font-bold"
            >
              <CreditCard className="size-3.5" />
              Alterar plano
            </button>
            {row.status !== "blocked" && (
              <button
                type="button"
                disabled={blockPending}
                onClick={onBlock}
                className="inline-flex items-center gap-1 rounded-xl border border-destructive/40 px-3 py-2 text-[11px] font-bold text-destructive disabled:opacity-50"
              >
                <Ban className="size-3.5" />
                Bloquear
              </button>
            )}
            {row.status !== "canceled" && row.status !== "blocked" && (
              <button
                type="button"
                disabled={cancelPending}
                onClick={onCancel}
                className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-[11px] font-bold text-muted-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
            )}
          </div>
        ) : actionMode === "release" ? (
          <div className="w-full space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-primary" />
              Liberar com pagamento
            </p>
            <select
              value={formPlan}
              onChange={(e) => onFormPlan(e.target.value as PlanId)}
              className="w-full rounded-lg border border-input bg-background px-2 py-2 text-xs"
            >
              {PLANS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatPlanPrice(p.priceCents)} · {p.tagline}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={formMethod}
                onChange={(e) => onFormMethod(e.target.value as PaymentMethod)}
                className="rounded-lg border border-input bg-background px-2 py-2 text-xs"
              >
                <option value="external">Fora da plataforma</option>
                <option value="pix">Pix</option>
                <option value="boleto">Boleto</option>
                <option value="card">Cartão</option>
                <option value="transfer">Transferência</option>
                <option value="cash">Dinheiro</option>
                <option value="other">Outro</option>
              </select>
              <input
                type="number"
                min={1}
                value={formDays}
                onChange={(e) => onFormDays(Number(e.target.value) || 30)}
                className="rounded-lg border border-input bg-background px-2 py-2 text-xs"
                placeholder="Dias"
              />
            </div>
            <input
              value={formNotes}
              onChange={(e) => onFormNotes(e.target.value)}
              placeholder="Observação (ex.: Pix recebido 14/07)"
              className="w-full rounded-lg border border-input bg-background px-2 py-2 text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={releasePending}
                onClick={onConfirmRelease}
                className="flex-1 rounded-lg bg-primary py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
              >
                {releasePending ? "Liberando…" : "Confirmar liberação"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-3 py-2 text-[11px] font-bold"
              >
                Voltar
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-bold text-foreground">Alterar plano</p>
            <select
              value={formPlan}
              onChange={(e) => onFormPlan(e.target.value as PlanId)}
              className="w-full rounded-lg border border-input bg-background px-2 py-2 text-xs"
            >
              {PLANS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatPlanPrice(p.priceCents)} · {p.tagline}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={planPending}
                onClick={onConfirmPlan}
                className="flex-1 rounded-lg bg-primary py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
              >
                {planPending ? "Salvando…" : "Salvar plano"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-3 py-2 text-[11px] font-bold"
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
      {(row.isExpiringSoon || row.isOverdue) && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-3.5" />
          {row.isOverdue ? "Período vencido — cobrança em aberto" : "Vencimento próximo"}
        </p>
      )}
    </div>
  );
}

function PaymentsPanel({
  payments,
  loading,
}: {
  payments: AdminPaymentRow[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  if (payments.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        Nenhum pagamento registrado. Use “Liberar / pagar” em um profissional.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {payments.map((p) => (
        <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-foreground">
                {p.professionalName || "Sem nome"}
              </p>
              <p className="text-xs text-muted-foreground">{p.professionalEmail}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge>{planLabel(p.plan)}</Badge>
                <Badge>{methodLabel(p.method)}</Badge>
                <Badge>{formatPlanPrice(p.amountCents)}</Badge>
                {p.gatewayStatus && <Badge>Asaas · {p.gatewayStatus}</Badge>}
              </div>
              {p.notes && (
                <p className="mt-1 text-[11px] text-muted-foreground">{p.notes}</p>
              )}
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              <p>{new Date(p.paidAt).toLocaleString("pt-BR")}</p>
              {p.periodEnd && (
                <p className="mt-0.5">
                  Período até {new Date(p.periodEnd).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "warn" | "danger";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        tone === "danger" && "border-destructive/40 bg-destructive/10 text-destructive",
        tone === "warn" && "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        !tone && "border-border bg-muted/30 text-foreground",
      )}
    >
      {children}
    </span>
  );
}
