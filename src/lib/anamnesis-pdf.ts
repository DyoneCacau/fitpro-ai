import {
  buildAssessmentMetrics,
  buildComparativeSections,
  CIRCUMFERENCE_FIELDS,
  formatAssessmentDate,
  formatAssessmentNumber,
  parseMeasurements,
  SKINFOLD_FIELDS,
} from "@/lib/anthropometry";
import { resolveAnamnesisComparativePair } from "@/lib/assessment-comparative";
import { drawComparativeTable } from "@/lib/assessment-report-pdf";
import { createPdfWriter, type PdfWriter } from "@/lib/pdf-writer";
import type { AnamnesisRow } from "@/lib/anamnesis";
import {
  SMOKING_OPTIONS,
  STRESS_OPTIONS,
  TRAINING_EXPERIENCE_OPTIONS,
} from "@/lib/anamnesis-form";
import {
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  type Sex,
} from "@/lib/nutrition-calculator";
import type { Assessment } from "@/lib/tracking";

function labelActivity(id: string) {
  return ACTIVITY_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

function labelGoal(id: string) {
  return GOAL_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

function sexLabel(sex: string) {
  return sex === "F" ? "Feminino" : "Masculino";
}

function optionLabel<T extends string>(
  options: { id: T; label: string }[],
  id: string | null | undefined,
) {
  if (!id) return null;
  return options.find((o) => o.id === id)?.label ?? id;
}

function writeOptionalLine(writer: PdfWriter, label: string, value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return;
  writer.writeLine(`${label}: ${text}`, { size: 9, gap: 4 });
}

function writeOptionalBlock(writer: PdfWriter, label: string, value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return;
  writer.writeLine(`${label}:`, { bold: true, size: 9, gap: 3 });
  writer.writeLine(text, { size: 9, gap: 4 });
}

export async function downloadAnamnesisPdf(input: {
  anamnesis: AnamnesisRow;
  studentName?: string;
  assessments?: Assessment[];
  sex?: Sex;
  age?: number;
}) {
  const writer = await createPdfWriter();
  const { anamnesis } = input;

  writer.writeLine("FitPro AI", { size: 9, gap: 4 });
  writer.writeLine("Anamnese e metas nutricionais", { bold: true, size: 15, gap: 6 });
  if (input.studentName) writer.writeLine(`Aluno: ${input.studentName}`, { size: 10, gap: 5 });
  writer.writeLine(
    `Registrada em ${formatAssessmentDate(anamnesis.assessed_at.slice(0, 10))}`,
    { size: 9, gap: 8 },
  );

  writer.writeLine("DADOS DA ANAMNESE", { bold: true, size: 11, gap: 5 });
  writer.writeLine(`Sexo: ${sexLabel(anamnesis.sex)}`, { size: 9, gap: 4 });
  writer.writeLine(`Idade: ${anamnesis.age} anos`, { size: 9, gap: 4 });
  writer.writeLine(`Peso: ${formatAssessmentNumber(Number(anamnesis.weight_kg))} kg`, { size: 9, gap: 4 });
  writer.writeLine(`Altura: ${formatAssessmentNumber(Number(anamnesis.height_cm), 0)} cm`, { size: 9, gap: 4 });
  writer.writeLine(`Atividade: ${labelActivity(anamnesis.activity_level)}`, { size: 9, gap: 4 });
  writer.writeLine(`Objetivo: ${labelGoal(anamnesis.goal)}`, { size: 9, gap: 4 });
  writeOptionalLine(writer, "Profissão / rotina", anamnesis.occupation);

  writer.y += 2;
  writer.writeLine("EXAME FÍSICO / ANTROPOMETRIA", { bold: true, size: 11, gap: 5 });
  if (anamnesis.body_fat_pct != null) {
    writer.writeLine(`% Gordura: ${formatAssessmentNumber(Number(anamnesis.body_fat_pct))}%`, { size: 9, gap: 4 });
  }
  if (anamnesis.lean_mass_kg != null) {
    writer.writeLine(`Massa magra: ${formatAssessmentNumber(Number(anamnesis.lean_mass_kg))} kg`, {
      size: 9,
      gap: 4,
    });
  }
  const parsedMeasurements = parseMeasurements(anamnesis.measurements);
  for (const field of CIRCUMFERENCE_FIELDS) {
    const value = parsedMeasurements.circumferences?.[field.key];
    if (value != null) {
      writer.writeLine(`${field.label}: ${formatAssessmentNumber(value)} cm`, { size: 9, gap: 4 });
    }
  }
  for (const field of SKINFOLD_FIELDS) {
    const value = parsedMeasurements.skinfolds?.[field.key];
    if (value != null) {
      writer.writeLine(`${field.label}: ${formatAssessmentNumber(value)} mm`, { size: 9, gap: 4 });
    }
  }

  writer.y += 2;
  writer.writeLine("ESTILO DE VIDA", { bold: true, size: 11, gap: 5 });
  if (anamnesis.sleep_hours != null) {
    writer.writeLine(`Sono: ${formatAssessmentNumber(Number(anamnesis.sleep_hours), 1)} h/noite`, {
      size: 9,
      gap: 4,
    });
  }
  writeOptionalLine(writer, "Estresse", optionLabel(STRESS_OPTIONS, anamnesis.stress_level));
  writeOptionalLine(writer, "Disponibilidade semanal", anamnesis.weekly_availability);
  writeOptionalLine(writer, "Tabagismo", optionLabel(SMOKING_OPTIONS, anamnesis.smoking));
  writeOptionalLine(writer, "Álcool", anamnesis.alcohol_use);
  if (anamnesis.meals_per_day != null) {
    writer.writeLine(`Refeições por dia: ${anamnesis.meals_per_day}`, { size: 9, gap: 4 });
  }

  writer.y += 2;
  writer.writeLine("HISTÓRICO DE SAÚDE", { bold: true, size: 11, gap: 5 });
  writeOptionalBlock(writer, "Doenças / condições", anamnesis.medical_history);
  writeOptionalBlock(writer, "Medicamentos", anamnesis.medications);
  writeOptionalBlock(writer, "Lesões", anamnesis.injuries);
  writeOptionalBlock(writer, "Cirurgias", anamnesis.surgeries);
  writeOptionalBlock(writer, "Histórico familiar", anamnesis.family_history);
  writeOptionalBlock(writer, "Dores / limitações", anamnesis.pain_or_limitations);
  if (anamnesis.par_q_cleared === false) {
    writer.writeLine("PAR-Q: requer atenção / liberação médica", { size: 9, gap: 4 });
    writeOptionalBlock(writer, "Detalhes PAR-Q", anamnesis.par_q_notes);
  } else {
    writer.writeLine("PAR-Q: liberado para atividade física", { size: 9, gap: 4 });
  }

  writer.y += 2;
  writer.writeLine("TREINO", { bold: true, size: 11, gap: 5 });
  writeOptionalLine(
    writer,
    "Experiência",
    optionLabel(TRAINING_EXPERIENCE_OPTIONS, anamnesis.training_experience),
  );
  if (anamnesis.training_days_per_week != null) {
    writer.writeLine(`Dias de treino / semana: ${anamnesis.training_days_per_week}`, { size: 9, gap: 4 });
  }
  writeOptionalLine(writer, "Local de treino", anamnesis.training_location);
  writeOptionalBlock(writer, "Histórico de treinos", anamnesis.training_history);

  writer.y += 2;
  writer.writeLine("ALIMENTAÇÃO", { bold: true, size: 11, gap: 5 });
  writeOptionalBlock(writer, "Restrições / alergias", anamnesis.restrictions);
  writeOptionalBlock(writer, "Suplementos", anamnesis.supplements_used);
  writeOptionalBlock(writer, "Preferências alimentares", anamnesis.food_preferences);
  writeOptionalBlock(writer, "Digestão", anamnesis.digestion_notes);

  writer.y += 2;
  writer.writeLine("MOTIVAÇÃO", { bold: true, size: 11, gap: 5 });
  writeOptionalBlock(writer, "Principal motivação", anamnesis.main_motivation);
  writeOptionalBlock(writer, "Expectativas", anamnesis.expectations);
  writeOptionalBlock(writer, "Observações clínicas", anamnesis.clinical_notes);

  writer.y += 3;
  writer.writeLine("METAS CALCULADAS", { bold: true, size: 11, gap: 5 });
  writer.writeLine(`TMB: ${anamnesis.bmr} kcal`, { size: 9, gap: 4 });
  writer.writeLine(`TDEE: ${anamnesis.tdee} kcal`, { size: 9, gap: 4 });
  writer.writeLine(`Meta calórica: ${anamnesis.kcal_target} kcal`, { size: 9, gap: 4 });
  writer.writeLine(
    `Macronutrientes: P ${anamnesis.protein_g} g · C ${anamnesis.carbs_g} g · G ${anamnesis.fat_g} g`,
    { size: 9, gap: 6 },
  );

  const pair = resolveAnamnesisComparativePair(anamnesis, input.assessments ?? []);

  if (pair) {
    const sex = (input.sex ?? anamnesis.sex) as Sex;
    const age = input.age ?? anamnesis.age;
    const beforeMetrics = buildAssessmentMetrics(pair.before, { sex, age });
    const afterMetrics = buildAssessmentMetrics(pair.after, { sex, age });
    const sections = buildComparativeSections(beforeMetrics, afterMetrics);
    const beforeDate =
      pair.before.id === "anamnesis-baseline"
        ? "Anamnese"
        : formatAssessmentDate(pair.before.assessed_at);
    const afterDate = formatAssessmentDate(pair.after.assessed_at);

    writer.doc.addPage();
    writer.y = writer.margin;
    writer.writeLine("EXAME FÍSICO COMPARATIVO", { bold: true, size: 13, gap: 6 });
    if (pair.before.id === "anamnesis-baseline") {
      writer.writeLine(
        "Comparativo entre os dados da anamnese e a última avaliação antropométrica.",
        { size: 9, gap: 6 },
      );
    }

    drawComparativeTable(writer, sections, beforeDate, afterDate, input.studentName);

    writer.writeLine(
      "Que tal ter seu plano alimentar no seu smartphone?",
      { size: 8, gap: 4, align: "center" },
    );
  }

  writer.y += 4;
  writer.writeLine(`Gerado em ${new Date().toLocaleDateString("pt-BR")} · FitPro AI`, {
    size: 8,
    gap: 4,
  });

  const slug = (input.studentName ?? "aluno").trim().replace(/\s+/g, "-").toLowerCase() || "aluno";
  writer.doc.save(`${slug}-anamnese.pdf`);
}

export { resolveAnamnesisComparativePair };
