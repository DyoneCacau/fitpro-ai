import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notifications";

export type BillingPlan = {
  id: string;
  personal_id: string;
  name: string;
  amount_cents: number;
  billing_cycle: "monthly" | "quarterly" | "yearly";
  created_at: string;
};

export type StudentSubscription = {
  id: string;
  aluno_id: string;
  personal_id: string;
  plan_id: string | null;
  amount_cents: number;
  status: "active" | "paused" | "cancelled";
  starts_at: string;
  next_due_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  subscription_id: string | null;
  aluno_id: string;
  personal_id: string;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
};

export type InvoiceWithStudent = Invoice & {
  student_name: string | null;
};

export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const num = Number.parseFloat(cleaned);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

export async function fetchBillingPlans(personalId: string): Promise<BillingPlan[]> {
  const { data, error } = await supabase
    .from("billing_plans")
    .select("*")
    .eq("personal_id", personalId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BillingPlan[];
}

export async function createBillingPlan(
  personalId: string,
  input: { name: string; amount_cents: number; billing_cycle: BillingPlan["billing_cycle"] },
): Promise<BillingPlan> {
  const { data, error } = await supabase
    .from("billing_plans")
    .insert({ personal_id: personalId, ...input })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as BillingPlan;
}

export async function fetchStudentSubscriptions(
  personalId: string,
  alunoId?: string,
): Promise<StudentSubscription[]> {
  let q = supabase
    .from("student_subscriptions")
    .select("*")
    .eq("personal_id", personalId)
    .order("created_at", { ascending: false });
  if (alunoId) q = q.eq("aluno_id", alunoId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as StudentSubscription[];
}

export async function createStudentSubscription(input: {
  aluno_id: string;
  personal_id: string;
  plan_id?: string | null;
  amount_cents: number;
  next_due_date: string;
  notes?: string | null;
}): Promise<StudentSubscription> {
  const { data, error } = await supabase
    .from("student_subscriptions")
    .insert({ ...input, status: "active" })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as StudentSubscription;
}

export async function fetchInvoices(
  personalId: string,
  opts?: { alunoId?: string; status?: Invoice["status"] },
): Promise<Invoice[]> {
  let q = supabase
    .from("invoices")
    .select("*")
    .eq("personal_id", personalId)
    .order("due_date", { ascending: false });
  if (opts?.alunoId) q = q.eq("aluno_id", opts.alunoId);
  if (opts?.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Invoice[];
}

export async function createInvoice(input: {
  aluno_id: string;
  personal_id: string;
  subscription_id?: string | null;
  amount_cents: number;
  due_date: string;
  notes?: string | null;
}): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .insert({ ...input, status: "pending" })
    .select("*")
    .single();
  if (error) throw error;
  const invoice = data as unknown as Invoice;
  await createNotification(
    input.aluno_id,
    "billing_new",
    "Nova cobrança disponível",
    `Valor: ${formatCurrency(input.amount_cents)} · vencimento ${new Date(input.due_date + "T12:00:00").toLocaleDateString("pt-BR")}`,
    "/perfil",
  );
  return invoice;
}

export async function markInvoicePaid(
  invoiceId: string,
  paymentMethod?: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod ?? "manual",
    })
    .eq("id", invoiceId)
    .select("aluno_id, amount_cents")
    .single();
  if (error) throw error;
  const row = data as unknown as { aluno_id: string; amount_cents: number };
  await createNotification(
    row.aluno_id,
    "billing_paid",
    "Pagamento confirmado",
    `Sua mensalidade de ${formatCurrency(row.amount_cents)} foi registrada.`,
    "/perfil",
  );
}

export async function refreshOverdueInvoices(): Promise<void> {
  await supabase.rpc("mark_overdue_invoices");
}

export async function fetchBillingSummary(personalId: string) {
  await refreshOverdueInvoices();
  const invoices = await fetchInvoices(personalId);
  const paid = invoices.filter((i) => i.status === "paid");
  const pending = invoices.filter((i) => i.status === "pending");
  const overdue = invoices.filter((i) => i.status === "overdue");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const receivedThisMonth = paid
    .filter((i) => i.paid_at && i.paid_at.slice(0, 10) >= monthStart)
    .reduce((s, i) => s + i.amount_cents, 0);

  return {
    receivedThisMonth,
    pendingCount: pending.length,
    pendingTotal: pending.reduce((s, i) => s + i.amount_cents, 0),
    overdueCount: overdue.length,
    overdueTotal: overdue.reduce((s, i) => s + i.amount_cents, 0),
    recentInvoices: invoices.slice(0, 8),
  };
}
