import {
  buildAssessmentMetrics,
  buildComparativeSections,
  CIRCUMFERENCE_FIELDS,
  SKINFOLD_FIELDS,
  formatAssessmentDate,
  formatAssessmentNumber,
  formatHeight,
  type ComparativeRow,
  type ComparativeSection,
} from "@/lib/anthropometry";
import { pickComparativePair, pickLatestComparativePair } from "@/lib/assessment-comparative";
import { createPdfWriter, type PdfWriter } from "@/lib/pdf-writer";
import type { Sex } from "@/lib/nutrition-calculator";
import type { Assessment } from "@/lib/tracking";

function formatAfterColumn(row: ComparativeRow) {
  if (!row.deltaDisplay) return row.after;
  return `${row.after} ${row.deltaDisplay}`;
}

export function drawComparativeTable(
  writer: PdfWriter,
  sections: ComparativeSection[],
  beforeDate: string,
  afterDate: string,
  studentName?: string,
) {
  const { doc, margin } = writer;
  const pageWidth = doc.internal.pageSize.getWidth();
  const colLabel = margin;
  const colBefore = margin + pageWidth * 0.34;
  const colAfter = margin + pageWidth * 0.58;

  if (studentName) {
    writer.addPageIfNeeded(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(studentName, pageWidth / 2, writer.y, { align: "center" });
    writer.y += 8;
  }

  writer.addPageIfNeeded(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(beforeDate, colBefore, writer.y, { align: "center" });
  doc.text(afterDate, colAfter, writer.y, { align: "center" });
  writer.y += 5;
  doc.setDrawColor(180);
  doc.line(margin, writer.y, pageWidth - margin, writer.y);
  writer.y += 4;

  for (const section of sections) {
    if (section.title) {
      writer.addPageIfNeeded(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(40);
      doc.text(section.title.toUpperCase(), margin, writer.y);
      writer.y += 5;
    }

    for (const row of section.rows) {
      writer.addPageIfNeeded(7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.text(row.label, colLabel, writer.y);

      doc.setFontSize(8.5);
      doc.setTextColor(90);
      doc.text(truncate(row.before, 22), colBefore, writer.y, { align: "center" });

      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(truncate(formatAfterColumn(row), 28), colAfter, writer.y, { align: "center" });

      writer.y += 5.2;
    }
  }

  writer.y += 3;
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function drawAssessmentDetails(writer: PdfWriter, assessment: Assessment, sex: Sex, age?: number) {
  const metrics = buildAssessmentMetrics(assessment, { sex, age });
  writer.writeLine("DETALHAMENTO DA AVALIAÇÃO", { bold: true, size: 11, gap: 5 });
  writer.writeLine(`Data: ${formatAssessmentDate(metrics.assessedAt)}`, { size: 9, gap: 4 });
  if (metrics.weightKg != null) {
    writer.writeLine(`Peso: ${formatAssessmentNumber(metrics.weightKg)} kg`, { size: 9, gap: 4 });
  }
  writer.writeLine(`Altura: ${formatHeight(metrics.heightCm)}`, { size: 9, gap: 4 });
  if (metrics.bmi != null) {
    writer.writeLine(`IMC: ${formatAssessmentNumber(metrics.bmi)}`, { size: 9, gap: 4 });
  }
  if (metrics.bodyFatPct != null) {
    writer.writeLine(`% Massa gorda: ${formatAssessmentNumber(metrics.bodyFatPct)}%`, { size: 9, gap: 4 });
  }
  if (metrics.leanMassKg != null) {
    writer.writeLine(`Massa magra: ${formatAssessmentNumber(metrics.leanMassKg)} kg`, { size: 9, gap: 4 });
  }

  const circumferences = CIRCUMFERENCE_FIELDS.filter((f) => metrics.circumferences[f.key] != null);
  if (circumferences.length > 0) {
    writer.y += 2;
    writer.writeLine("Circunferências", { bold: true, size: 10, gap: 4 });
    for (const field of circumferences) {
      writer.writeLine(
        `• ${field.label}: ${formatAssessmentNumber(metrics.circumferences[field.key]!)} cm`,
        { size: 9, gap: 3.5 },
      );
    }
  }

  const skinfolds = SKINFOLD_FIELDS.filter((f) => metrics.skinfolds[f.key] != null);
  if (skinfolds.length > 0) {
    writer.y += 2;
    writer.writeLine("Dobras Cutâneas", { bold: true, size: 10, gap: 4 });
    for (const field of skinfolds) {
      writer.writeLine(
        `• ${field.label}: ${formatAssessmentNumber(metrics.skinfolds[field.key]!)} mm`,
        { size: 9, gap: 3.5 },
      );
    }
  }

  if (metrics.notes?.trim()) {
    writer.y += 2;
    writer.writeLine("Observações", { bold: true, size: 10, gap: 4 });
    writer.writeLine(metrics.notes.trim(), { size: 9, gap: 4 });
  }
}

function fileSlug(studentName?: string) {
  const base = (studentName ?? "aluno").trim().replace(/\s+/g, "-").toLowerCase();
  return base || "aluno";
}

export async function downloadComparativeAssessmentPdf(input: {
  before: Assessment;
  after: Assessment;
  studentName?: string;
  sex?: Sex;
  age?: number;
}) {
  const writer = await createPdfWriter();
  const sex = input.sex ?? "M";
  const beforeMetrics = buildAssessmentMetrics(input.before, { sex, age: input.age });
  const afterMetrics = buildAssessmentMetrics(input.after, { sex, age: input.age });
  const sections = buildComparativeSections(beforeMetrics, afterMetrics);

  writer.writeLine("FitPro AI", { size: 8, gap: 3 });
  drawComparativeTable(
    writer,
    sections,
    formatAssessmentDate(input.before.assessed_at),
    formatAssessmentDate(input.after.assessed_at),
    input.studentName,
  );

  writer.writeLine(
    "Que tal ter seu plano alimentar no seu smartphone?",
    { size: 8, gap: 4, align: "center" },
  );
  writer.writeLine(`Gerado em ${new Date().toLocaleDateString("pt-BR")} · FitPro AI`, {
    size: 7,
    gap: 3,
    align: "center",
  });

  const date = formatAssessmentDate(input.after.assessed_at).replace(/\//g, "-");
  writer.doc.save(`${fileSlug(input.studentName)}-exame-fisico-${date}.pdf`);
}

export async function downloadAssessmentReportPdf(input: {
  assessments: Assessment[];
  studentName?: string;
  sex?: Sex;
  age?: number;
  selected?: Assessment;
}) {
  const pair = input.selected
    ? pickComparativePair(input.assessments, input.selected)
    : pickLatestComparativePair(input.assessments);

  if (pair) {
    await downloadComparativeAssessmentPdf({
      ...pair,
      studentName: input.studentName,
      sex: input.sex,
      age: input.age,
    });
    return;
  }

  const latest = input.selected ?? input.assessments[0];
  if (!latest) return;

  const writer = await createPdfWriter();
  writer.writeLine("FitPro AI", { size: 9, gap: 4 });
  writer.writeLine("Avaliação antropométrica", { bold: true, size: 15, gap: 6 });
  if (input.studentName) writer.writeLine(`Aluno: ${input.studentName}`, { size: 10, gap: 5 });
  writer.y += 2;
  drawAssessmentDetails(writer, latest, input.sex ?? "M", input.age);
  writer.y += 4;
  writer.writeLine(`Gerado em ${new Date().toLocaleDateString("pt-BR")} · FitPro AI`, { size: 8, gap: 4 });

  const date = formatAssessmentDate(latest.assessed_at).replace(/\//g, "-");
  writer.doc.save(`${fileSlug(input.studentName)}-avaliacao-${date}.pdf`);
}
