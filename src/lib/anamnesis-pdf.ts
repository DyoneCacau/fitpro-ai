import {
  buildAssessmentMetrics,
  buildComparativeSections,
  formatAssessmentDate,
  formatAssessmentNumber,
} from "@/lib/anthropometry";
import { resolveAnamnesisComparativePair } from "@/lib/assessment-comparative";
import { drawComparativeTable } from "@/lib/assessment-report-pdf";
import { createPdfWriter } from "@/lib/pdf-writer";
import type { AnamnesisRow } from "@/lib/anamnesis";
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

  if (anamnesis.restrictions?.trim()) {
    writer.writeLine("Restrições alimentares:", { bold: true, size: 9, gap: 3 });
    writer.writeLine(anamnesis.restrictions.trim(), { size: 9, gap: 4 });
  }
  if (anamnesis.clinical_notes?.trim()) {
    writer.writeLine("Observações clínicas:", { bold: true, size: 9, gap: 3 });
    writer.writeLine(anamnesis.clinical_notes.trim(), { size: 9, gap: 4 });
  }

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
