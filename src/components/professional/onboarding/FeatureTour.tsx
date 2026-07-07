import { useEffect, useLayoutEffect, useState, useCallback } from "react";

export type TourStep = {
  selector: string;
  title: string;
  body: string;
};

export const PROFESSIONAL_TOUR: TourStep[] = [
  { selector: '[data-tour="home"]', title: "Seu resumo", body: "Vendas, agenda do dia, clientes ativos e metas — tudo num panorama rápido." },
  { selector: '[data-tour="primeiros-passos"]', title: "Primeiros passos", body: "Siga o checklist para deixar sua conta pronta para começar a vender." },
  { selector: '[data-tour="faturamento"]', title: "Faturamento", body: "Acompanhe o quanto entrou hoje, na semana, no mês e no ano." },
  { selector: '[data-tour="agenda"]', title: "Agenda", body: "Veja os atendimentos de hoje e dos próximos dias, e agende com poucos toques." },
  { selector: '[data-tour="clientes"]', title: "Clientes", body: "Cadastre alunos, envie convites e acompanhe cada aluno individualmente." },
  { selector: '[data-tour="treinos"]', title: "Treinos", body: "Monte rotinas, periodização e prescrições, e reaproveite sua biblioteca." },
  { selector: '[data-tour="dieta"]', title: "Dieta", body: "Crie cardápios completos com substituições e envie para seus alunos." },
  { selector: '[data-tour="financeiro"]', title: "Financeiro", body: "Cobranças automáticas, faturas e controle de recebimentos dos alunos." },
  { selector: '[data-tour="feed"]', title: "Feed", body: "Publique conteúdos e novidades para engajar seus alunos." },
  { selector: '[data-tour="perfil"]', title: "Perfil", body: "Ajuste seus dados, especialidades e preferências da conta." },
  { selector: '[data-tour="notificacoes"]', title: "Notificações", body: "Fique por dentro de tudo: pagamentos, retornos e mensagens." },
];

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;

export function FeatureTour({ steps, onFinish }: { steps: TourStep[]; onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[index];

  const measure = useCallback(() => {
    const el = document.querySelector(step?.selector ?? "");
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step?.selector]);

  useLayoutEffect(() => {
    measure();
    const t = setTimeout(measure, 350);
    return () => clearTimeout(t);
  }, [measure]);

  useEffect(() => {
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [measure]);

  const isLast = index >= steps.length - 1;

  function next() {
    if (isLast) onFinish();
    else setIndex((i) => i + 1);
  }
  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  const spotlight: Rect | null = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  const tooltipStyle = computeTooltipStyle(spotlight);

  return (
    <div className="fixed inset-0 z-[95]">
      {spotlight ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-200"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/72" />
      )}

      <div
        className="absolute w-[19rem] max-w-[calc(100vw-2rem)] rounded-2xl bg-card border border-border p-4 shadow-elevated"
        style={tooltipStyle}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Etapa {index + 1} de {steps.length}
        </p>
        <h3 className="mt-1 text-base font-bold text-foreground">{step?.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{step?.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onFinish}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Pular tour
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={prev}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
              >
                Voltar
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow"
            >
              {isLast ? "Concluir" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function computeTooltipStyle(spot: Rect | null): React.CSSProperties {
  const TT_W = 304;
  const TT_H = 168;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;

  if (!spot) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  // Prefer placing to the right of the target (sidebar case); fall back to below/above.
  const spaceRight = vw - (spot.left + spot.width);
  const spaceBelow = vh - (spot.top + spot.height);

  let top: number;
  let left: number;

  if (spaceRight > TT_W + 24) {
    left = spot.left + spot.width + 16;
    top = clamp(spot.top, 12, vh - TT_H - 12);
  } else if (spaceBelow > TT_H + 24) {
    top = spot.top + spot.height + 12;
    left = clamp(spot.left, 12, vw - TT_W - 12);
  } else {
    top = clamp(spot.top - TT_H - 12, 12, vh - TT_H - 12);
    left = clamp(spot.left, 12, vw - TT_W - 12);
  }

  return { top, left };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
