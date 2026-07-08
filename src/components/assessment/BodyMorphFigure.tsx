import { useId } from "react";
import type { BodyProfileModel } from "@/lib/body-profile";
import { cn } from "@/lib/utils";

type Props = {
  profile: BodyProfileModel;
  className?: string;
};

type Pt = { x: number; y: number };

const CX = 100;

// Meia-largura base (px no viewBox) por sexo, no formato "normal".
function baseWidths(sex: BodyProfileModel["sex"]) {
  return sex === "F"
    ? { neck: 8, shoulder: 34, chest: 30, waist: 22, hip: 41, arm: 8, thigh: 15, calf: 9 }
    : { neck: 10, shoulder: 43, chest: 37, waist: 27, hip: 34, arm: 10, thigh: 16, calf: 10 };
}

/**
 * Spline fechada suave (Catmull-Rom → Bézier) passando por todos os pontos.
 * Usada para desenhar tronco, pernas e braços com contorno arredondado.
 */
function smoothClosedPath(points: Pt[]): string {
  const n = points.length;
  if (n < 3) return "";
  const f = (v: number) => v.toFixed(1);
  let d = `M ${f(points[0].x)} ${f(points[0].y)} `;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(p2.x)} ${f(p2.y)} `;
  }
  return d + "Z";
}

export function BodyMorphFigure({ profile, className }: Props) {
  const gradId = useId();
  const base = baseWidths(profile.sex);

  const shoulderHalf = base.shoulder * (0.55 + profile.chestScale * 0.45);
  const chestHalf = base.chest * profile.chestScale;
  const waistHalf = base.waist * profile.waistScale;
  const hipHalf = base.hip * profile.hipScale;
  const armHalf = base.arm * profile.armScale;
  const thighHalf = base.thigh * profile.legScale;
  const calfHalf = base.calf * profile.calfScale;
  const neckHalf = base.neck;

  // Coordenadas verticais.
  const yNeck = 70;
  const yShoulder = 88;
  const yChest = 120;
  const yWaist = 170;
  const yHip = 205;
  const yHipBottom = 226;
  const yKnee = 315;
  const yAnkle = 416;

  // Contorno do tronco (lado direito, de cima para baixo, depois espelhado).
  const torso: Pt[] = [
    { x: CX + neckHalf, y: yNeck },
    { x: CX + shoulderHalf, y: yShoulder },
    { x: CX + chestHalf, y: yChest },
    { x: CX + waistHalf, y: yWaist },
    { x: CX + hipHalf, y: yHip },
    { x: CX + hipHalf * 0.78, y: yHipBottom },
    { x: CX, y: yHipBottom + 4 },
    { x: CX - hipHalf * 0.78, y: yHipBottom },
    { x: CX - hipHalf, y: yHip },
    { x: CX - waistHalf, y: yWaist },
    { x: CX - chestHalf, y: yChest },
    { x: CX - shoulderHalf, y: yShoulder },
    { x: CX - neckHalf, y: yNeck },
  ];

  // Pernas: cápsulas afuniladas (coxa → joelho → tornozelo).
  const legGap = Math.max(9, hipHalf * 0.42);
  const leg = (dir: -1 | 1): Pt[] => {
    const lx = CX + dir * legGap;
    const wTop = thighHalf;
    const wKnee = calfHalf * 1.05;
    const wAnk = calfHalf * 0.55;
    return [
      { x: lx + wTop, y: yHip - 2 },
      { x: lx + wKnee, y: yKnee },
      { x: lx + wAnk, y: yAnkle },
      { x: lx - wAnk, y: yAnkle },
      { x: lx - wKnee, y: yKnee },
      { x: lx - wTop, y: yHip - 2 },
    ];
  };

  // Braços: cápsulas verticais ao lado do tronco (empurradas para fora quando o tronco cresce).
  const arm = (dir: -1 | 1): Pt[] => {
    const outer = Math.max(shoulderHalf, chestHalf) + armHalf + 1;
    const ax = CX + dir * outer;
    const yTop = yShoulder + 4;
    const yWrist = yWaist + 24;
    return [
      { x: ax + armHalf, y: yTop },
      { x: ax + armHalf * 0.82, y: yWrist },
      { x: ax - armHalf * 0.82, y: yWrist },
      { x: ax - armHalf, y: yTop },
    ];
  };

  const bellyBulge = Math.max(0, profile.waistScale - 1);

  return (
    <svg
      viewBox="0 0 200 440"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="Boneco corporal proporcional às medidas"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <g
        fill={`url(#${gradId})`}
        stroke="#5eead4"
        strokeWidth={1.4}
        strokeLinejoin="round"
      >
        {/* Braços e pernas atrás do tronco */}
        <path d={smoothClosedPath(arm(-1))} />
        <path d={smoothClosedPath(arm(1))} />
        <path d={smoothClosedPath(leg(-1))} />
        <path d={smoothClosedPath(leg(1))} />

        {/* Pescoço */}
        <rect
          x={CX - neckHalf}
          y={60}
          width={neckHalf * 2}
          height={18}
          rx={neckHalf}
          fill={`url(#${gradId})`}
        />

        {/* Tronco */}
        <path d={smoothClosedPath(torso)} />

        {/* Cabeça */}
        <circle cx={CX} cy={40} r={22} />
      </g>

      {/* Volume abdominal cresce com a cintura (efeito "provador") */}
      {bellyBulge > 0.02 && (
        <ellipse
          cx={CX}
          cy={yWaist + 6}
          rx={waistHalf * 0.82}
          ry={18 + bellyBulge * 26}
          fill="#0f766e"
          opacity={Math.min(0.5, 0.18 + bellyBulge * 0.9)}
        />
      )}
    </svg>
  );
}
