import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type StudentRange = "ate_25" | "26_50" | "51_100" | "mais_100";
export type RevenueRange = "ate_5k" | "5k_10k" | "10k_30k" | "acima_30k";
export type PlanId = "standard" | "premium" | "pro";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  tagline: string;
  /** preço mensal recorrente após o primeiro mês, em centavos (provisório) */
  priceCents: number;
  /** valor promocional do primeiro mês, em centavos (provisório) */
  firstMonthCents: number;
  recommended?: boolean;
  features: string[];
};

/**
 * Valores provisórios — ajuste livremente depois.
 * O primeiro mês sai por R$1,00 (oferta de teste).
 */
export const PLANS: PlanDefinition[] = [
  {
    id: "standard",
    name: "Starter",
    tagline: "Até 15 alunos",
    priceCents: 4990,
    firstMonthCents: 4990,
    features: [
      "Treinos + dietas juntos",
      "Anamnese e avaliações",
      "Agenda",
      "Área do aluno no app",
    ],
  },
  {
    id: "premium",
    name: "Pro",
    tagline: "Até 40 alunos",
    priceCents: 7990,
    firstMonthCents: 7990,
    recommended: true,
    features: [
      "Tudo do Starter",
      "Mais capacidade de alunos",
      "Wearables",
      "Feed da comunidade",
    ],
  },
  {
    id: "pro",
    name: "Clinic",
    tagline: "Alunos ilimitados",
    priceCents: 12990,
    firstMonthCents: 12990,
    features: [
      "Tudo do Pro",
      "Alunos ilimitados",
      "Prioridade no suporte",
    ],
  },
];

export const STUDENT_RANGE_OPTIONS: { id: StudentRange; label: string; hint: string }[] = [
  { id: "ate_25", label: "Até 25 alunos", hint: "Estou iniciando ou mantendo atendimentos mais exclusivos" },
  { id: "26_50", label: "26 a 50 alunos", hint: "Negócio em crescimento com base consolidada de clientes" },
  { id: "51_100", label: "51 a 100 alunos", hint: "Profissional consolidado ou pequena equipe de atendimento" },
  { id: "mais_100", label: "Mais de 100 alunos", hint: "Empreendimento de grande porte com equipe estruturada" },
];

export const REVENUE_RANGE_OPTIONS: { id: RevenueRange; label: string; hint: string }[] = [
  { id: "ate_5k", label: "Até R$ 5.000", hint: "Estou iniciando meu negócio ou com poucos clientes" },
  { id: "5k_10k", label: "De R$ 5.000 a R$ 10.000", hint: "Negócio em crescimento com boa base de clientes" },
  { id: "10k_30k", label: "De R$ 10.000 a R$ 30.000", hint: "Profissional consolidado com negócio estruturado" },
  { id: "acima_30k", label: "Acima de R$ 30.000", hint: "Empreendimento de grande porte com alto volume de negócios" },
];

export function formatPlanPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type ProfessionalSubscription = {
  id: string;
  professional_id: string;
  plan: PlanId;
  status: "trial" | "active" | "past_due" | "canceled";
  price_cents: number;
  cardholder_name: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type OnboardingState = {
  completedAt: string | null;
  skipped: boolean;
  studentRange: StudentRange | null;
  revenueRange: RevenueRange | null;
  documentType: string | null;
  documentNumber: string | null;
  instagram: string | null;
  tourCompletedAt: string | null;
  subscription: ProfessionalSubscription | null;
};

type ProfileOnboardingRow = {
  onboarding_completed_at: string | null;
  onboarding_skipped: boolean | null;
  onboarding_student_range: string | null;
  onboarding_revenue_range: string | null;
  document_type: string | null;
  document_number: string | null;
  instagram: string | null;
  tour_completed_at: string | null;
};

export async function fetchOnboardingState(userId: string): Promise<OnboardingState> {
  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "onboarding_completed_at, onboarding_skipped, onboarding_student_range, onboarding_revenue_range, document_type, document_number, instagram, tour_completed_at",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("professional_subscriptions")
      .select("*")
      .eq("professional_id", userId)
      .maybeSingle(),
  ]);

  const p = (profile ?? {}) as Partial<ProfileOnboardingRow>;
  return {
    completedAt: p.onboarding_completed_at ?? null,
    skipped: Boolean(p.onboarding_skipped),
    studentRange: (p.onboarding_student_range as StudentRange | null) ?? null,
    revenueRange: (p.onboarding_revenue_range as RevenueRange | null) ?? null,
    documentType: p.document_type ?? null,
    documentNumber: p.document_number ?? null,
    instagram: p.instagram ?? null,
    tourCompletedAt: p.tour_completed_at ?? null,
    subscription: (sub as unknown as ProfessionalSubscription | null) ?? null,
  };
}

export async function saveOnboardingProfile(
  userId: string,
  fields: ProfileUpdate,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", userId);
  if (error) throw error;
}

export async function selectProfessionalPlan(
  userId: string,
  input: { plan: PlanId; priceCents: number; cardholderName?: string | null; trialDays?: number },
): Promise<ProfessionalSubscription> {
  const trialDays = input.trialDays ?? 7;
  const trialEnds = new Date(Date.now() + trialDays * 86400000).toISOString();
  const { data, error } = await supabase
    .from("professional_subscriptions")
    .upsert(
      {
        professional_id: userId,
        plan: input.plan,
        price_cents: input.priceCents,
        cardholder_name: input.cardholderName ?? null,
        status: "trial",
        trial_ends_at: trialEnds,
        current_period_end: trialEnds,
      },
      { onConflict: "professional_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as ProfessionalSubscription;
}

export async function completeOnboarding(userId: string): Promise<void> {
  await saveOnboardingProfile(userId, {
    onboarding_completed_at: new Date().toISOString(),
    onboarding_skipped: false,
  });
}

export async function skipOnboarding(userId: string): Promise<void> {
  await saveOnboardingProfile(userId, {
    onboarding_skipped: true,
    onboarding_completed_at: new Date().toISOString(),
  });
}

/** Marca onboarding como concluído (idempotente) — evita reabrir no Início. */
export async function markOnboardingDone(userId: string): Promise<void> {
  await saveOnboardingProfile(userId, {
    onboarding_completed_at: new Date().toISOString(),
  });
  try {
    localStorage.setItem(onboardingLocalKey(userId), "1");
  } catch {
    // ignore
  }
}

export function onboardingLocalKey(userId: string): string {
  return `fitpro:onboarding-done:${userId}`;
}

export function isOnboardingDoneLocally(userId: string): boolean {
  try {
    return localStorage.getItem(onboardingLocalKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function isOnboardingFinished(state: {
  completedAt: string | null;
  skipped: boolean;
} | null | undefined): boolean {
  if (!state) return false;
  return Boolean(state.completedAt || state.skipped);
}

export async function completeTour(userId: string): Promise<void> {
  await saveOnboardingProfile(userId, { tour_completed_at: new Date().toISOString() });
}
