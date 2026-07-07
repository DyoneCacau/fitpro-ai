import type { AssessmentMetrics } from "@/lib/anthropometry";
import { getWaistHipRisk } from "@/lib/anthropometry";
import type { Sex } from "@/lib/nutrition-calculator";

export type BodyZoneId =
  | "chest"
  | "abdomen"
  | "hips"
  | "right_arm"
  | "left_arm"
  | "right_leg"
  | "left_leg";

export type ZoneStatus = "ok" | "attention" | "critical" | "clinical" | "unknown";

export type BodyShape = "lean" | "normal" | "overweight" | "obese";

export type BodyZoneInfo = {
  id: BodyZoneId;
  label: string;
  status: ZoneStatus;
  message: string;
};

export type BodyProfileModel = {
  sex: Sex;
  shape: BodyShape;
  shapeLabel: string;
  bmi: number | null;
  bodyFatPct: number | null;
  weightKg: number | null;
  heightCm: number | null;
  leanMassKg: number | null;
  waistCm: number | null;
  torsoScale: number;
  armScale: number;
  legScale: number;
  hipScale: number;
  zones: BodyZoneInfo[];
  summary: string;
};

const CLINICAL_PATTERNS: { zone: BodyZoneId; patterns: RegExp[] }[] = [
  { zone: "chest", patterns: [/peito|tórax|torax|costela|mama/i] },
  { zone: "abdomen", patterns: [/abd[oô]men|lombar|core|cintura|barriga/i] },
  { zone: "hips", patterns: [/quadril|gl[uú]teo|pelve/i] },
  { zone: "right_arm", patterns: [/bra[çc]o direito|ombro direito|b[ií]ceps direito|tr[ií]ceps direito/i] },
  { zone: "left_arm", patterns: [/bra[çc]o esquerdo|ombro esquerdo|b[ií]ceps esquerdo|tr[ií]ceps esquerdo/i] },
  { zone: "right_leg", patterns: [/coxa direita|joelho direito|perna direita|t[ií]bia direita/i] },
  { zone: "left_leg", patterns: [/coxa esquerda|joelho esquerdo|perna esquerda|t[ií]bia esquerda/i] },
];

function worstStatus(a: ZoneStatus, b: ZoneStatus): ZoneStatus {
  const rank: Record<ZoneStatus, number> = {
    unknown: 0,
    ok: 1,
    attention: 2,
    clinical: 3,
    critical: 4,
  };
  return rank[a] >= rank[b] ? a : b;
}

function shapeFromBmi(bmi: number | null, bodyFatPct: number | null, sex: Sex): BodyShape {
  if (bmi != null) {
    if (bmi < 18.5) return "lean";
    if (bmi < 25) return "normal";
    if (bmi < 30) return "overweight";
    return "obese";
  }
  if (bodyFatPct != null) {
    const high = sex === "M" ? 25 : 32;
    const veryHigh = sex === "M" ? 30 : 38;
    if (bodyFatPct >= veryHigh) return "obese";
    if (bodyFatPct >= high) return "overweight";
    if (bodyFatPct <= (sex === "M" ? 10 : 18)) return "lean";
    return "normal";
  }
  return "normal";
}

function shapeLabel(shape: BodyShape): string {
  switch (shape) {
    case "lean":
      return "Magro";
    case "normal":
      return "Normal";
    case "overweight":
      return "Sobrepeso";
    case "obese":
      return "Obesidade";
  }
}

function scalesFromShape(shape: BodyShape, metrics: AssessmentMetrics, sex: Sex) {
  const height = metrics.heightCm ?? 170;
  const waist = metrics.circumferences.waist ?? metrics.circumferences.abdomen;
  const waistRatio = waist != null && height > 0 ? waist / height : null;

  let torsoScale = 1;
  let armScale = 1;
  let legScale = 1;

  switch (shape) {
    case "lean":
      torsoScale = 0.86;
      armScale = 0.88;
      legScale = 0.9;
      break;
    case "normal":
      torsoScale = 1;
      armScale = 1;
      legScale = 1;
      break;
    case "overweight":
      torsoScale = 1.14;
      armScale = 1.08;
      legScale = 1.06;
      break;
    case "obese":
      torsoScale = 1.28;
      armScale = 1.14;
      legScale = 1.12;
      break;
  }

  if (waistRatio != null) {
    const boost = Math.min(0.18, Math.max(0, (waistRatio - 0.48) * 0.9));
    torsoScale += boost;
  }

  const avgArm =
    averageDefined([
      metrics.circumferences.right_arm,
      metrics.circumferences.left_arm,
    ]) ?? null;
  if (avgArm != null && height > 0) {
    const armRatio = avgArm / height;
    armScale *= clamp(0.88 + armRatio * 0.55, 0.85, 1.2);
  }

  const avgThigh =
    averageDefined([
      metrics.circumferences.right_thigh,
      metrics.circumferences.left_thigh,
    ]) ?? null;
  if (avgThigh != null && height > 0) {
    const thighRatio = avgThigh / height;
    legScale *= clamp(0.9 + thighRatio * 0.45, 0.88, 1.18);
  }

  const hipScale = sex === "F" ? 1.1 : 1;

  return {
    torsoScale: clamp(torsoScale, 0.82, 1.38),
    armScale: clamp(armScale, 0.82, 1.25),
    legScale: clamp(legScale, 0.85, 1.22),
    hipScale,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function averageDefined(values: (number | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function asymmetryStatus(left: number | undefined, right: number | undefined): ZoneStatus {
  if (left == null || right == null || left <= 0 || right <= 0) return "unknown";
  const diffPct = (Math.abs(left - right) / Math.max(left, right)) * 100;
  if (diffPct >= 8) return "critical";
  if (diffPct >= 4) return "attention";
  return "ok";
}

function waistStatus(waist: number | undefined, sex: Sex): { status: ZoneStatus; message: string } {
  if (waist == null) return { status: "unknown", message: "Sem medida de cintura" };
  const attention = sex === "M" ? 94 : 80;
  const critical = sex === "M" ? 102 : 88;
  if (waist >= critical) {
    return { status: "critical", message: `Cintura ${waist} cm · risco elevado` };
  }
  if (waist >= attention) {
    return { status: "attention", message: `Cintura ${waist} cm · acima do ideal` };
  }
  return { status: "ok", message: `Cintura ${waist} cm · dentro do esperado` };
}

function clinicalFromText(text: string | null | undefined): Partial<Record<BodyZoneId, string>> {
  const out: Partial<Record<BodyZoneId, string>> = {};
  const blob = text?.trim();
  if (!blob) return out;
  for (const entry of CLINICAL_PATTERNS) {
    if (entry.patterns.some((p) => p.test(blob))) {
      out[entry.zone] = "Limitação ou lesão informada na anamnese";
    }
  }
  if (/ombro|bra[çc]o/i.test(blob) && !out.right_arm && !out.left_arm) {
    out.right_arm = "Atenção em membros superiores";
    out.left_arm = "Atenção em membros superiores";
  }
  if (/joelho|coxa|perna/i.test(blob) && !out.right_leg && !out.left_leg) {
    out.right_leg = "Atenção em membros inferiores";
    out.left_leg = "Atenção em membros inferiores";
  }
  if (/lombar|coluna|cervical/i.test(blob)) {
    out.abdomen = out.abdomen ?? "Atenção lombar/coluna na anamnese";
  }
  return out;
}

export function buildBodyProfile(input: {
  sex: Sex;
  metrics: AssessmentMetrics;
  injuries?: string | null;
  painOrLimitations?: string | null;
}): BodyProfileModel {
  const { sex, metrics } = input;
  const shape = shapeFromBmi(metrics.bmi, metrics.bodyFatPct, sex);
  const scales = scalesFromShape(shape, metrics, sex);
  const clinical = clinicalFromText(
    [input.injuries, input.painOrLimitations].filter(Boolean).join(" · "),
  );

  const waist = metrics.circumferences.waist;
  const abdomen = metrics.circumferences.abdomen;
  const hip = metrics.circumferences.hip;
  const chest = metrics.circumferences.chest;

  const waistInfo = waistStatus(waist ?? abdomen, sex);
  let abdomenStatus: ZoneStatus = waistInfo.status;
  let abdomenMessage = waistInfo.message;

  if (metrics.waistHipRatio != null) {
    const risk = getWaistHipRisk(metrics.waistHipRatio, sex);
    if (risk.includes("muito alto")) {
      abdomenStatus = worstStatus(abdomenStatus, "critical");
      abdomenMessage = `C/Q ${metrics.waistHipRatio.toFixed(2)} · ${risk}`;
    } else if (risk.includes("moderado")) {
      abdomenStatus = worstStatus(abdomenStatus, "attention");
      abdomenMessage = `C/Q ${metrics.waistHipRatio.toFixed(2)} · ${risk}`;
    }
  }

  let chestStatus: ZoneStatus = "unknown";
  let chestMessage = "Sem medida de peitoral";
  if (chest != null) {
    chestStatus = "ok";
    chestMessage = `Peitoral ${chest} cm`;
    if (metrics.bodyFatPct != null) {
      const high = sex === "M" ? 22 : 30;
      if (metrics.bodyFatPct >= high) {
        chestStatus = "attention";
        chestMessage = `% gordura elevada · peitoral ${chest} cm`;
      }
    }
  } else if (metrics.bodyFatPct != null) {
    const high = sex === "M" ? 25 : 32;
    chestStatus = metrics.bodyFatPct >= high ? "attention" : "ok";
    chestMessage =
      metrics.bodyFatPct >= high
        ? `% gordura ${metrics.bodyFatPct.toFixed(1)}% · tronco em atenção`
        : "Composição corporal equilibrada no tronco";
  }

  let hipsStatus: ZoneStatus = hip != null ? "ok" : "unknown";
  let hipsMessage = hip != null ? `Quadril ${hip} cm` : "Sem medida de quadril";
  if (metrics.waistHipRatio != null && hip != null && waist != null) {
    if (metrics.waistHipRatio >= (sex === "M" ? 1 : 0.85)) {
      hipsStatus = worstStatus(hipsStatus, "attention");
      hipsMessage = `Quadril ${hip} cm · distribuição central de gordura`;
    }
  }

  const armAsym = asymmetryStatus(
    metrics.circumferences.left_arm,
    metrics.circumferences.right_arm,
  );
  const legAsym = asymmetryStatus(
    metrics.circumferences.left_thigh,
    metrics.circumferences.right_thigh,
  );

  function armZone(side: "left" | "right", value: number | undefined): BodyZoneInfo {
    const id = side === "left" ? "left_arm" : "right_arm";
    const label = side === "left" ? "Braço esquerdo" : "Braço direito";
    let status: ZoneStatus = value != null ? "ok" : "unknown";
    let message = value != null ? `${label} ${value} cm` : `Sem medida · ${label.toLowerCase()}`;
    if (armAsym !== "unknown" && armAsym !== "ok") {
      status = worstStatus(status, armAsym);
      message = `${message} · assimetria entre braços`;
    }
    if (clinical[id]) {
      status = "clinical";
      message = clinical[id]!;
    }
    return { id, label, status, message };
  }

  function legZone(side: "left" | "right", value: number | undefined): BodyZoneInfo {
    const id = side === "left" ? "left_leg" : "right_leg";
    const label = side === "left" ? "Coxa esquerda" : "Coxa direita";
    let status: ZoneStatus = value != null ? "ok" : "unknown";
    let message = value != null ? `${label} ${value} cm` : `Sem medida · ${label.toLowerCase()}`;
    if (legAsym !== "unknown" && legAsym !== "ok") {
      status = worstStatus(status, legAsym);
      message = `${message} · assimetria entre coxas`;
    }
    if (clinical[id]) {
      status = "clinical";
      message = clinical[id]!;
    }
    return { id, label, status, message };
  }

  const zones: BodyZoneInfo[] = [
    {
      id: "chest",
      label: "Peitoral / tórax",
      status: clinical.chest ? "clinical" : chestStatus,
      message: clinical.chest ?? chestMessage,
    },
    {
      id: "abdomen",
      label: "Abdômen / cintura",
      status: clinical.abdomen ? "clinical" : abdomenStatus,
      message: clinical.abdomen ?? abdomenMessage,
    },
    {
      id: "hips",
      label: "Quadril",
      status: clinical.hips ? "clinical" : hipsStatus,
      message: clinical.hips ?? hipsMessage,
    },
    armZone("left", metrics.circumferences.left_arm),
    armZone("right", metrics.circumferences.right_arm),
    legZone("left", metrics.circumferences.left_thigh),
    legZone("right", metrics.circumferences.right_thigh),
  ];

  const attentionCount = zones.filter((z) => z.status !== "ok" && z.status !== "unknown").length;
  const summary =
    attentionCount === 0
      ? `Perfil ${shapeLabel(shape).toLowerCase()} · sem zonas críticas mapeadas`
      : `${attentionCount} zona(s) em atenção · perfil ${shapeLabel(shape).toLowerCase()}`;

  return {
    sex,
    shape,
    shapeLabel: shapeLabel(shape),
    bmi: metrics.bmi,
    bodyFatPct: metrics.bodyFatPct,
    weightKg: metrics.weightKg,
    heightCm: metrics.heightCm,
    leanMassKg: metrics.leanMassKg,
    waistCm: metrics.circumferences.waist ?? metrics.circumferences.abdomen ?? null,
    ...scales,
    zones,
    summary,
  };
}

export function zoneStatusColor(status: ZoneStatus): { fill: string; stroke: string } {
  switch (status) {
    case "ok":
      return { fill: "rgba(16, 185, 129, 0.35)", stroke: "rgb(16, 185, 129)" };
    case "attention":
      return { fill: "rgba(245, 158, 11, 0.4)", stroke: "rgb(245, 158, 11)" };
    case "critical":
      return { fill: "rgba(239, 68, 68, 0.42)", stroke: "rgb(239, 68, 68)" };
    case "clinical":
      return { fill: "rgba(249, 115, 22, 0.42)", stroke: "rgb(249, 115, 22)" };
    default:
      return { fill: "rgba(148, 163, 184, 0.2)", stroke: "rgba(148, 163, 184, 0.55)" };
  }
}

export function zoneStatusLabel(status: ZoneStatus): string {
  switch (status) {
    case "ok":
      return "Normal";
    case "attention":
      return "Atenção";
    case "critical":
      return "Crítico";
    case "clinical":
      return "Clínico";
    default:
      return "Sem dado";
  }
}
