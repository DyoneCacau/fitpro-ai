import { supabase } from "@/integrations/supabase/client";
import type { PlanId } from "@/lib/professional-onboarding";
import { formatPlanPrice, PLANS } from "@/lib/professional-onboarding";

export type AdminProfessionalRow = {
  professionalId: string;
  fullName: string | null;
  email: string | null;
  plan: PlanId;
  status: string;
  priceCents: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  studentCount: number;
  studentLimit: number | null;
  createdAt: string | null;
  activatedAt: string | null;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
  isOverdue: boolean;
  lastPaymentAt: string | null;
  lastPaymentAmountCents: number | null;
};

export type AdminProfessionalsSummary = {
  total: number;
  trial: number;
  active: number;
  awaitingPayment: number;
  canceled: number;
  blocked: number;
  studentsTotal: number;
  expiringSoon: number;
  overdue: number;
};

export type AdminPaymentRow = {
  id: string;
  professionalId: string;
  professionalName: string | null;
  professionalEmail: string | null;
  amountCents: number;
  plan: PlanId;
  paidAt: string;
  method: string;
  notes: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  gatewayPaymentId: string | null;
  gatewayStatus: string | null;
  paymentType: string | null;
};

export type PaymentMethod = "external" | "pix" | "transfer" | "cash" | "other" | "card" | "boleto";

export async function fetchAdminProfessionals(): Promise<AdminProfessionalRow[]> {
  const { data, error } = await supabase.rpc("admin_list_professionals" as never);
  if (error) throw error;
  return ((data as unknown as Array<Record<string, unknown>>) ?? []).map((r) => ({
    professionalId: String(r.professional_id),
    fullName: (r.full_name as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    plan: ((r.plan as PlanId) ?? "standard") as PlanId,
    status: (r.status as string) ?? "trial",
    priceCents: Number(r.price_cents ?? 0),
    trialEndsAt: (r.trial_ends_at as string | null) ?? null,
    currentPeriodEnd: (r.current_period_end as string | null) ?? null,
    studentCount: Number(r.student_count ?? 0),
    studentLimit: r.student_limit == null ? null : Number(r.student_limit),
    createdAt: (r.created_at as string | null) ?? null,
    activatedAt: (r.activated_at as string | null) ?? null,
    daysUntilExpiry: r.days_until_expiry == null ? null : Number(r.days_until_expiry),
    isExpiringSoon: Boolean(r.is_expiring_soon),
    isOverdue: Boolean(r.is_overdue),
    lastPaymentAt: (r.last_payment_at as string | null) ?? null,
    lastPaymentAmountCents:
      r.last_payment_amount_cents == null ? null : Number(r.last_payment_amount_cents),
  }));
}

export function summarizeProfessionals(rows: AdminProfessionalRow[]): AdminProfessionalsSummary {
  return {
    total: rows.length,
    trial: rows.filter((r) => r.status === "trial").length,
    active: rows.filter((r) => r.status === "active").length,
    awaitingPayment: rows.filter((r) => r.status === "past_due").length,
    canceled: rows.filter((r) => r.status === "canceled").length,
    blocked: rows.filter((r) => r.status === "blocked").length,
    studentsTotal: rows.reduce((acc, r) => acc + r.studentCount, 0),
    expiringSoon: rows.filter((r) => r.isExpiringSoon).length,
    overdue: rows.filter((r) => r.isOverdue).length,
  };
}

export async function fetchAdminPayments(professionalId?: string): Promise<AdminPaymentRow[]> {
  const { data, error } = await supabase.rpc("admin_list_subscription_payments" as never, {
    _professional_id: professionalId,
  } as never);
  if (error) throw error;
  return ((data as unknown as Array<Record<string, unknown>>) ?? []).map((r) => ({
    id: String(r.id),
    professionalId: String(r.professional_id),
    professionalName: (r.professional_name as string | null) ?? null,
    professionalEmail: (r.professional_email as string | null) ?? null,
    amountCents: Number(r.amount_cents ?? 0),
    plan: ((r.plan as PlanId) ?? "standard") as PlanId,
    paidAt: String(r.paid_at),
    method: (r.method as string) ?? "external",
    notes: (r.notes as string | null) ?? null,
    periodStart: (r.period_start as string | null) ?? null,
    periodEnd: (r.period_end as string | null) ?? null,
    gatewayPaymentId: (r.gateway_payment_id as string | null) ?? null,
    gatewayStatus: (r.gateway_status as string | null) ?? null,
    paymentType: (r.payment_type as string | null) ?? null,
  }));
}

export async function adminActivateSubscription(
  professionalId: string,
  plan: PlanId,
): Promise<void> {
  const { error } = await supabase.rpc("admin_activate_subscription" as never, {
    _professional_id: professionalId,
    _plan: plan,
  } as never);
  if (error) throw error;
}

export async function adminCancelSubscription(professionalId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_cancel_subscription" as never, {
    _professional_id: professionalId,
  } as never);
  if (error) throw error;
}

export async function adminBlockProfessional(professionalId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_block_professional" as never, {
    _professional_id: professionalId,
  } as never);
  if (error) throw error;
}

export async function adminChangePlan(professionalId: string, plan: PlanId): Promise<void> {
  const { error } = await supabase.rpc("admin_change_plan" as never, {
    _professional_id: professionalId,
    _plan: plan,
  } as never);
  if (error) throw error;
}

export async function adminRecordManualPayment(input: {
  professionalId: string;
  plan: PlanId;
  amountCents?: number | null;
  method?: PaymentMethod;
  notes?: string | null;
  extendDays?: number;
}): Promise<void> {
  const { error } = await supabase.rpc("admin_record_manual_payment" as never, {
    _professional_id: input.professionalId,
    _plan: input.plan,
    _amount_cents: input.amountCents ?? undefined,
    _method: input.method ?? "external",
    _notes: input.notes ?? undefined,
    _extend_days: input.extendDays ?? 30,
  } as never);
  if (error) throw error;
}

export function planLabel(plan: string): string {
  return PLANS.find((p) => p.id === plan)?.name ?? plan;
}

export function statusLabel(status: string): string {
  switch (status) {
    case "trial":
      return "Trial";
    case "active":
      return "Adimplente";
    case "past_due":
      return "Aguardando pagamento";
    case "canceled":
      return "Cancelado";
    case "blocked":
      return "Bloqueado";
    default:
      return status;
  }
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Em dia";
    case "trial":
      return "Em trial";
    case "past_due":
      return "Aguardando confirmação";
    case "canceled":
      return "Inadimplente";
    case "blocked":
      return "Bloqueado pelo admin";
    default:
      return status;
  }
}

export function methodLabel(method: string): string {
  switch (method) {
    case "external":
      return "Fora da plataforma";
    case "pix":
      return "Pix";
    case "boleto":
      return "Boleto";
    case "card":
      return "Cartão";
    case "transfer":
      return "Transferência";
    case "cash":
      return "Dinheiro";
    case "other":
      return "Outro";
    default:
      return method;
  }
}

export { formatPlanPrice, PLANS };
