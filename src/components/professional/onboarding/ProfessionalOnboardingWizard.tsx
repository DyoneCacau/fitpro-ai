import { useState } from "react";
import {
  Apple as AppleIcon,
  Check,
  ChevronLeft,
  DollarSign,
  Loader2,
  MessageCircle,
  Monitor,
  PartyPopper,
  Smartphone,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLANS,
  REVENUE_RANGE_OPTIONS,
  STUDENT_RANGE_OPTIONS,
  completeOnboarding,
  formatPlanPrice,
  saveOnboardingProfile,
  selectProfessionalPlan,
  skipOnboarding,
  type PlanId,
  type RevenueRange,
  type StudentRange,
} from "@/lib/professional-onboarding";

const TOTAL_STEPS = 6;

const COMMUNITY_LINK = "https://chat.whatsapp.com/";
const SUPPORT_LINK = "https://wa.me/";
const DEMO_LINK = "https://calendly.com/";

type Props = {
  userId: string;
  firstName: string;
  onFinished: () => void;
  onSkip: () => void;
};

export function ProfessionalOnboardingWizard({ userId, firstName, onFinished, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const [studentRange, setStudentRange] = useState<StudentRange | null>(null);
  const [revenueRange, setRevenueRange] = useState<RevenueRange | null>(null);
  const [plan, setPlan] = useState<PlanId>("standard");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [docType, setDocType] = useState("cpf");
  const [docNumber, setDocNumber] = useState("");
  const [instagram, setInstagram] = useState("");

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSkip() {
    try {
      setSaving(true);
      await skipOnboarding(userId);
    } catch {
      // silencioso: pular não deve travar o usuário
    } finally {
      setSaving(false);
      onSkip();
    }
  }

  async function choosePlanAndAdvance(withTrial: boolean) {
    const selected = PLANS.find((p) => p.id === plan)!;
    try {
      setSaving(true);
      await selectProfessionalPlan(userId, {
        plan: selected.id,
        priceCents: selected.priceCents,
        cardholderName: cardName.trim() || null,
        trialDays: withTrial ? 7 : 30,
      });
      next();
    } catch {
      next();
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    try {
      setSaving(true);
      await saveOnboardingProfile(userId, {
        onboarding_student_range: studentRange,
        onboarding_revenue_range: revenueRange,
        document_type: docType,
        document_number: docNumber.trim() || null,
        instagram: instagram.trim().replace(/^@/, "") || null,
      });
      await completeOnboarding(userId);
    } catch {
      // ainda marca concluído no fluxo do pai (Ir para o dashboard)
    } finally {
      setSaving(false);
      setDone(true);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-elevated">
        {done ? (
          <FinalScreen firstName={firstName} onGoDashboard={onFinished} />
        ) : (
          <div className="p-6 sm:p-8">
            <ProgressBar step={step} total={TOTAL_STEPS} />

            <div className="mt-6">
              {step === 0 && <IntroStep firstName={firstName} />}
              {step === 1 && (
                <ChoiceStep
                  icon={<Users className="size-6 text-primary" />}
                  title="Quantos alunos você atende atualmente?"
                  subtitle="Selecione a faixa que melhor representa a quantidade de clientes ativos."
                  options={STUDENT_RANGE_OPTIONS}
                  value={studentRange}
                  onSelect={(v) => {
                    setStudentRange(v as StudentRange);
                    next();
                  }}
                />
              )}
              {step === 2 && (
                <ChoiceStep
                  icon={<DollarSign className="size-6 text-primary" />}
                  title="Qual é o seu faturamento médio mensal atualmente?"
                  subtitle="Selecione a faixa que melhor representa seu faturamento mensal atual."
                  options={REVENUE_RANGE_OPTIONS}
                  value={revenueRange}
                  onSelect={(v) => {
                    setRevenueRange(v as RevenueRange);
                    next();
                  }}
                />
              )}
              {step === 3 && (
                <PlanStep
                  plan={plan}
                  onPickPlan={setPlan}
                  cardName={cardName}
                  onCardName={setCardName}
                  cardNumber={cardNumber}
                  onCardNumber={setCardNumber}
                  saving={saving}
                  onTrial={() => choosePlanAndAdvance(true)}
                  onSubscribe={() => choosePlanAndAdvance(false)}
                  onSkipCard={next}
                />
              )}
              {step === 4 && (
                <IdentityStep
                  docType={docType}
                  onDocType={setDocType}
                  docNumber={docNumber}
                  onDocNumber={setDocNumber}
                  instagram={instagram}
                  onInstagram={setInstagram}
                />
              )}
              {step === 5 && <MobileStep />}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={back}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="size-4" /> Voltar
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={saving}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pular por enquanto
                </button>
              </div>

              {step !== 1 && step !== 2 && step !== 3 && (
                <button
                  type="button"
                  onClick={step === 5 ? finish : next}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {step === 0 ? "Começar" : step === 5 ? "Concluir" : "Continuar"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= step ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">
        Etapa {step + 1} de {total}
      </p>
    </div>
  );
}

function StepHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/12">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function IntroStep({ firstName }: { firstName: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/12">
        <PartyPopper className="size-7 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Vamos configurar sua conta, {firstName}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        São poucos passos para liberar as vendas na plataforma: entender seu negócio, escolher seu
        plano e confirmar seus dados. Leva menos de 2 minutos.
      </p>
    </div>
  );
}

function ChoiceStep<T extends string>({
  icon,
  title,
  subtitle,
  options,
  value,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  options: { id: T; label: string; hint: string }[];
  value: T | null;
  onSelect: (v: T) => void;
}) {
  return (
    <div>
      <StepHeader icon={icon} title={title} subtitle={subtitle} />
      <div className="mt-6 space-y-2.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={cn(
              "group flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all",
              value === opt.id
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/50 hover:bg-accent",
            )}
          >
            <div>
              <p className="text-sm font-bold text-foreground">{opt.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{opt.hint}</p>
            </div>
            <ChevronLeft className="size-5 rotate-180 text-muted-foreground group-hover:text-primary" />
          </button>
        ))}
      </div>
    </div>
  );
}

function PlanStep({
  plan,
  onPickPlan,
  cardName,
  onCardName,
  cardNumber,
  onCardNumber,
  saving,
  onTrial,
  onSubscribe,
  onSkipCard,
}: {
  plan: PlanId;
  onPickPlan: (p: PlanId) => void;
  cardName: string;
  onCardName: (v: string) => void;
  cardNumber: string;
  onCardNumber: (v: string) => void;
  saving: boolean;
  onTrial: () => void;
  onSubscribe: () => void;
  onSkipCard: () => void;
}) {
  return (
    <div>
      <div className="rounded-2xl border border-primary/30 bg-primary/8 p-3 text-center">
        <p className="text-sm font-bold text-foreground">Oferta especial: primeiro mês por R$ 1,00</p>
        <p className="text-xs text-muted-foreground">Teste toda a plataforma sem compromisso. Cancele quando quiser.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {PLANS.map((p) => {
          const active = plan === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPickPlan(p.id)}
              className={cn(
                "relative flex flex-col rounded-2xl border p-4 text-left transition-all",
                active ? "border-primary bg-primary/10 shadow-glow" : "border-border hover:border-primary/50",
              )}
            >
              {p.recommended && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  Recomendado
                </span>
              )}
              <p className="text-[11px] font-semibold text-muted-foreground">{p.tagline}</p>
              <p className="mt-1 text-base font-bold text-foreground">{p.name}</p>
              <p className="mt-1 text-2xl font-black text-foreground">
                {formatPlanPrice(p.firstMonthCents)}
                <span className="text-xs font-medium text-muted-foreground">/mês</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatPlanPrice(p.priceCents)} após
              </p>
              <ul className="mt-3 space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11px] text-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <label className="text-xs font-semibold text-foreground">Nome no cartão</label>
          <input
            value={cardName}
            onChange={(e) => onCardName(e.target.value)}
            placeholder="Nome completo como aparece no cartão"
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground">Número do cartão</label>
          <input
            value={cardNumber}
            onChange={(e) => onCardNumber(e.target.value)}
            inputMode="numeric"
            placeholder="0000 0000 0000 0000"
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          Ao assinar, você concorda com nossos Termos de Serviço e Política de Privacidade.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onTrial}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-accent disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Testar grátis por 7 dias
        </button>
        <button
          type="button"
          onClick={onSubscribe}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Aproveitar oferta por R$ 1,00
        </button>
      </div>
      <button
        type="button"
        onClick={onSkipCard}
        className="mt-2 block w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Sem cartão agora
      </button>
    </div>
  );
}

function IdentityStep({
  docType,
  onDocType,
  docNumber,
  onDocNumber,
  instagram,
  onInstagram,
}: {
  docType: string;
  onDocType: (v: string) => void;
  docNumber: string;
  onDocNumber: (v: string) => void;
  instagram: string;
  onInstagram: (v: string) => void;
}) {
  return (
    <div>
      <StepHeader
        icon={<ShieldCheck className="size-6 text-primary" />}
        title="Confirme sua identidade"
        subtitle="Para garantir a segurança da sua conta e emitir notas fiscais, precisamos confirmar alguns dados."
      />
      <div className="mt-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-foreground">Tipo de documento</label>
          <select
            value={docType}
            onChange={(e) => onDocType(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="cpf">CPF (Brasil)</option>
            <option value="cnpj">CNPJ (Brasil)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground">Número do documento</label>
          <input
            value={docNumber}
            onChange={(e) => onDocNumber(e.target.value)}
            inputMode="numeric"
            placeholder={docType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Informe o documento do titular da conta. Necessário para emissão de notas fiscais.
          </p>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground">Instagram</label>
          <div className="mt-1 flex items-center rounded-xl border border-input bg-background focus-within:border-primary">
            <span className="pl-3 text-sm text-muted-foreground">@</span>
            <input
              value={instagram}
              onChange={(e) => onInstagram(e.target.value)}
              placeholder="seu_instagram"
              className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileStep() {
  return (
    <div>
      <StepHeader
        icon={<Smartphone className="size-6 text-primary" />}
        title="Seu negócio também no celular"
        subtitle="Web e app trabalham juntos — cada um no que faz melhor."
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Monitor className="size-4 text-primary" /> No computador
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Onde você monta tudo: treinos, dietas, prescrições e a estrutura da consultoria.
          </p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Smartphone className="size-4 text-primary" /> No app
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Onde você acompanha o dia a dia: vendas, saldo e conversas, de onde estiver.
          </p>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Baixe o app na sua loja para acompanhar tudo pelo celular:
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-semibold text-foreground">
          <AppleIcon className="size-4" /> App Store
        </div>
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-semibold text-foreground">
          <Smartphone className="size-4" /> Google Play
        </div>
      </div>
    </div>
  );
}

function FinalScreen({
  firstName,
  onGoDashboard,
}: {
  firstName: string;
  onGoDashboard: () => void;
}) {
  const links = [
    {
      icon: <Users className="size-5 text-primary" />,
      title: "Comunidade",
      subtitle: "Grupo no WhatsApp",
      href: COMMUNITY_LINK,
    },
    {
      icon: <MessageCircle className="size-5 text-success" />,
      title: "Suporte",
      subtitle: "Atendimento via WhatsApp",
      href: SUPPORT_LINK,
    },
    {
      icon: <Video className="size-5 text-primary" />,
      title: "Call demonstrativa",
      subtitle: "Agendar demonstração",
      href: DEMO_LINK,
    },
  ];
  return (
    <div className="p-6 sm:p-8 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-success/15">
        <Check className="size-8 text-success" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Seja muito bem-vindo, {firstName} 🎉</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Que tal se conectar com nossa comunidade ou tirar suas dúvidas?
      </p>

      <div className="mt-6 space-y-2.5 text-left">
        {links.map((l) => (
          <a
            key={l.title}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4 hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                {l.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{l.title}</p>
                <p className="text-xs text-muted-foreground">{l.subtitle}</p>
              </div>
            </div>
            <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
              Abrir
            </span>
          </a>
        ))}
      </div>

      <p className="mt-5 text-[11px] text-muted-foreground">
        Ao concluir, você concorda com os Termos de Uso e a Política de Privacidade.
      </p>

      <button
        type="button"
        onClick={onGoDashboard}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow"
      >
        Ir para o dashboard
      </button>
    </div>
  );
}
