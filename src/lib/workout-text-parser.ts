export type ParsedSet = {
  position: number;
  target_reps: string;
  target_load: number;
  set_type: "normal" | "falha" | "drop" | "rest_pause";
};

export type ParsedExercise = {
  name: string;
  prescription: string;
  sets: ParsedSet[];
};

export type ParsedWorkoutBlock = {
  exercises: ParsedExercise[];
  suggestedTitle: string;
  suggestedMuscles: string;
};

const BLOCK_TITLES = ["Pernas e glúteos", "Peito e tríceps", "Costas e bíceps"] as const;
const BLOCK_MUSCLES = [
  "Posterior, quadríceps, glúteos",
  "Peitoral, ombros, tríceps",
  "Dorsal, bíceps, trapézio",
] as const;

const PRESCRIPTION_RE = /^(\d+)\s*x\s*(.+)$/i;
const INLINE_RE = /^(.+?)\s+(\d+)\s*x\s*(.+)$/i;

function parseRepsPart(repsPart: string, setCount: number): ParsedSet[] {
  const raw = repsPart.trim().toLowerCase();

  if (raw === "falha" || raw.includes("falha")) {
    return Array.from({ length: setCount }, (_, i) => ({
      position: i + 1,
      target_reps: "falha",
      target_load: 0,
      set_type: "falha" as const,
    }));
  }

  const repsLabel = repsPart.trim().replace(/\s+/g, " ");
  return Array.from({ length: setCount }, (_, i) => ({
    position: i + 1,
    target_reps: repsLabel,
    target_load: 0,
    set_type: "normal" as const,
  }));
}

function buildExercise(name: string, setCount: number, repsPart: string): ParsedExercise {
  const sets = parseRepsPart(repsPart, setCount);
  const repsLabel = repsPart.trim().replace(/\s+/g, " ");
  const prescription =
    repsLabel.toLowerCase() === "falha" || repsLabel.includes("falha")
      ? `${setCount}x falha`
      : `${setCount}x ${repsLabel}`;

  return { name: name.trim(), prescription, sets };
}

function parseBlockLines(block: string): ParsedExercise[] {
  const exercises: ParsedExercise[] = [];
  let pendingName = "";

  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    if (!line || /^[*\-_=]+$/.test(line)) continue;

    const inline = line.match(INLINE_RE);
    if (inline) {
      const fullName = pendingName ? `${pendingName} ${inline[1]}`.trim() : inline[1].trim();
      pendingName = "";
      exercises.push(buildExercise(fullName, Number(inline[2]), inline[3]));
      continue;
    }

    const prescriptionOnly = line.match(PRESCRIPTION_RE);
    if (prescriptionOnly && pendingName) {
      exercises.push(buildExercise(pendingName, Number(prescriptionOnly[1]), prescriptionOnly[2]));
      pendingName = "";
      continue;
    }

    pendingName = pendingName ? `${pendingName} ${line}` : line;
  }

  if (pendingName) {
    exercises.push({
      name: pendingName,
      prescription: "—",
      sets: [{ position: 1, target_reps: "12", target_load: 0, set_type: "normal" }],
    });
  }

  return exercises;
}

export function parseWorkoutText(text: string): ParsedWorkoutBlock[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const rawBlocks = normalized.split(/\*{3,}/).map((b) => b.trim()).filter(Boolean);
  const blocks = rawBlocks.length > 0 ? rawBlocks : [normalized];

  return blocks
    .map((block, index) => {
      const exercises = parseBlockLines(block);
      return {
        exercises,
        suggestedTitle: BLOCK_TITLES[index] ?? `Treino ${String.fromCharCode(65 + index)}`,
        suggestedMuscles: BLOCK_MUSCLES[index] ?? "",
      };
    })
    .filter((b) => b.exercises.length > 0);
}

export function parsePrescriptionLine(text: string): ParsedSet[] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+)\s*x\s*(.+)$/i);
  if (!match) return null;
  const setCount = Number(match[1]);
  if (setCount < 1 || setCount > 30) return null;
  return parseRepsPart(match[2], setCount);
}

export function formatPrescriptionFromSets(
  sets: Array<{ target_reps: string; set_type?: string }>,
): string {
  if (sets.length === 0) return "—";
  const labels = sets.map((s) => s.target_reps.trim()).filter(Boolean);
  if (labels.length === 0) return `${sets.length} séries`;
  const allSame = labels.every((l) => l === labels[0]);
  if (allSame) return `${sets.length}x ${labels[0]}`;
  return labels.join(" · ");
}

/** Exemplo real de ficha (3 treinos) para colar no importador */
export const EXAMPLE_WORKOUT_TEXT = `Stiff unilateral 3x15

Stiff 4x 12 a 10

Mesa flexora 4x12 a 10

Cadeia flexora 4x 15 a 10

Flexora em pé 3x15

Cadeira abdutora 4x 12 a 10

Cadeira adultora 4x falha

Agachamento sumo 4x 20

Búlgaro 3x 15 a 10

Elevação pélvica 4x 12 a 8

*****************************
Supino reto com halteres 4x 12 a 8

Supino inclinado 4x12 a 8

Supino inclinado com halteres 4x12 a 8

Cross over 4x12 a 8

Peck deck peitoral 4x12 a8

Paralela 3x falha

Elevação frontal com barra reta 4x 12 a 8

Tríceps corda 4x15 a 8

Tríceps com barra reta no pully
4x 15 a 10
***************************
Barra fixa 3x10

Remada curvada supinação 3x 12 a 8

Remada cavalinho 3x12 a 8

Remada baixa na maquina 4x 12 a 8

Remada unilateral 3x 10 a 8

Meio terra 3x 12 a 6

Peck deck inverso 4x 15 a 8

Puxador pronação 4x12 a 8

Puxador supinação 3x 12 a8

Pulldow 3x12 a 8

Rosca direta no pully 4x12 a 8

Rosca martelo no pully 3x falha`;
