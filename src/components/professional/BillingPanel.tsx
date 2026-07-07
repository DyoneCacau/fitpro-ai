import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CreditCard,
  Loader2,
  Plus,
  Receipt,
  X,
} from "lucide-react";
import {
  createBillingPlan,
  createInvoice,
  fetchBillingPlans,
  fetchBillingSummary,
  fetchInvoices,
  formatCurrency,
  markInvoicePaid,
  parseCurrencyInput,
  type Invoice,
} from "@/lib/billing";
import { fetchMyStudents } from "@/lib/students";
import { cn } from "@/lib/utils";

export function BillingPanel({ personalId, alunoId }: { personalId: string; alunoId?: string }) {
  const qc = useQueryClient();
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showNewPlan, setShowNewPlan] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["billingSummary", personalId],
    queryFn: () => fetchBillingSummary(personalId),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", personalId, alunoId],
    queryFn: () => fetchInvoices(personalId, alunoId ? { alunoId } : undefined),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["billingPlans", personalId],
    queryFn: () => fetchBillingPlans(personalId),
  });

  const { data: students = [] } = useQuery({
    queryKey: ["myStudents", personalId],
    queryFn: () => fetchMyStudents(),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => markInvoicePaid(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billingSummary", personalId] });
      void qc.invalidateQueries({ queryKey: ["invoices", personalId] });
    },
  });

  const studentMap = Object.fromEntries(students.map((s) => [s.id, s.full_name ?? "Aluno"]));

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!alunoId && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <SummaryCard
            label="Recebido no mês"
            value={formatCurrency(summary.receivedThisMonth)}
            tone="success"
          />
          <SummaryCard label="Pendentes" value={String(summary.pendingCount)} />
          <SummaryCard
            label="Em atraso"
            value={String(summary.overdueCount)}
            tone={summary.overdueCount > 0 ? "danger" : undefined}
          />
          <SummaryCard label="Planos cadastrados" value={String(plans.length)} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowNewInvoice(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
        >
          <Plus className="size-3.5" />
          Nova cobrança
        </button>
        {!alunoId && (
          <button
            type="button"
            onClick={() => setShowNewPlan(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold"
          >
            <Receipt className="size-3.5" />
            Novo plano mensal
          </button>
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <CreditCard className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-semibold">Nenhuma cobrança registrada</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie faturas manuais e acompanhe pagamentos e inadimplência.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {invoices.map((inv) => (
            <InvoiceRow
              key={inv.id}
              invoice={inv}
              studentName={studentMap[inv.aluno_id]}
              onMarkPaid={() => markPaid.mutate(inv.id)}
              marking={markPaid.isPending && markPaid.variables === inv.id}
            />
          ))}
        </div>
      )}

      {showNewInvoice && (
        <NewInvoiceModal
          personalId={personalId}
          students={students}
          defaultAlunoId={alunoId}
          plans={plans}
          onClose={() => setShowNewInvoice(false)}
          onSaved={() => {
            setShowNewInvoice(false);
            void qc.invalidateQueries({ queryKey: ["billingSummary", personalId] });
            void qc.invalidateQueries({ queryKey: ["invoices", personalId] });
          }}
        />
      )}

      {showNewPlan && (
        <NewPlanModal
          personalId={personalId}
          onClose={() => setShowNewPlan(false)}
          onSaved={() => {
            setShowNewPlan(false);
            void qc.invalidateQueries({ queryKey: ["billingPlans", personalId] });
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-black mt-1",
          tone === "success" && "text-emerald-500",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function InvoiceRow({
  invoice,
  studentName,
  onMarkPaid,
  marking,
}: {
  invoice: Invoice;
  studentName?: string;
  onMarkPaid: () => void;
  marking: boolean;
}) {
  const statusLabel = {
    pending: "Pendente",
    paid: "Pago",
    overdue: "Em atraso",
    cancelled: "Cancelado",
  }[invoice.status];

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{formatCurrency(invoice.amount_cents)}</p>
        <p className="text-xs text-muted-foreground truncate">
          {studentName ?? "Aluno"} · venc.{" "}
          {new Date(invoice.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
        </p>
      </div>
      <span
        className={cn(
          "text-[10px] font-bold uppercase px-2 py-1 rounded-full shrink-0",
          invoice.status === "paid" && "bg-emerald-500/15 text-emerald-600",
          invoice.status === "pending" && "bg-amber-500/15 text-amber-600",
          invoice.status === "overdue" && "bg-destructive/15 text-destructive",
          invoice.status === "cancelled" && "bg-muted text-muted-foreground",
        )}
      >
        {statusLabel}
      </span>
      {(invoice.status === "pending" || invoice.status === "overdue") && (
        <button
          type="button"
          disabled={marking}
          onClick={onMarkPaid}
          className="shrink-0 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[10px] font-bold text-emerald-600"
        >
          {marking ? <Loader2 className="size-3 animate-spin" /> : "Marcar pago"}
        </button>
      )}
    </div>
  );
}

function NewInvoiceModal({
  personalId,
  students,
  defaultAlunoId,
  plans,
  onClose,
  onSaved,
}: {
  personalId: string;
  students: { id: string; full_name: string | null }[];
  defaultAlunoId?: string;
  plans: { id: string; name: string; amount_cents: number }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [alunoId, setAlunoId] = useState(defaultAlunoId ?? students[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const cents = parseCurrencyInput(amount);
      if (!alunoId || cents <= 0) throw new Error("Preencha aluno e valor válido.");
      await createInvoice({
        aluno_id: alunoId,
        personal_id: personalId,
        amount_cents: cents,
        due_date: dueDate,
        notes: notes.trim() || null,
      });
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof Error ? e.message : "Erro ao criar cobrança."),
  });

  return (
    <ModalBackdrop onClose={onClose} title="Nova cobrança">
      {plans.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setAmount((p.amount_cents / 100).toFixed(2).replace(".", ","))}
              className="rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      {!defaultAlunoId && (
        <label className="block text-xs font-semibold mb-1">Aluno</label>
      )}
      {!defaultAlunoId && (
        <select
          value={alunoId}
          onChange={(e) => setAlunoId(e.target.value)}
          className="field-input mb-3 w-full"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name ?? "Aluno"}
            </option>
          ))}
        </select>
      )}
      <label className="block text-xs font-semibold mb-1">Valor (R$)</label>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="297,00"
        className="field-input mb-3 w-full"
      />
      <label className="block text-xs font-semibold mb-1">Vencimento</label>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="field-input mb-3 w-full"
      />
      <label className="block text-xs font-semibold mb-1">Observações</label>
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ex.: Plano mensal · PIX"
        className="field-input mb-3 w-full"
      />
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1 mb-2">
          <AlertCircle className="size-3.5" /> {error}
        </p>
      )}
      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground"
      >
        {save.isPending ? "Salvando…" : "Criar cobrança"}
      </button>
    </ModalBackdrop>
  );
}

function NewPlanModal({
  personalId,
  onClose,
  onSaved,
}: {
  personalId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("Plano mensal");
  const [amount, setAmount] = useState("297,00");

  const save = useMutation({
    mutationFn: async () => {
      const cents = parseCurrencyInput(amount);
      if (!name.trim() || cents <= 0) throw new Error("Nome e valor obrigatórios.");
      await createBillingPlan(personalId, {
        name: name.trim(),
        amount_cents: cents,
        billing_cycle: "monthly",
      });
    },
    onSuccess: onSaved,
  });

  return (
    <ModalBackdrop onClose={onClose} title="Plano de cobrança">
      <label className="block text-xs font-semibold mb-1">Nome</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className="field-input mb-3 w-full" />
      <label className="block text-xs font-semibold mb-1">Valor mensal (R$)</label>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} className="field-input mb-3 w-full" />
      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground"
      >
        {save.isPending ? "Salvando…" : "Salvar plano"}
      </button>
    </ModalBackdrop>
  );
}

function ModalBackdrop({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
