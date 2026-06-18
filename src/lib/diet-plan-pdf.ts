import {
  formatFoodItemDietbox,
  getMealMainItems,
  getMealSlotMeta,
  getMealSubstitutionGroups,
  sortSubstitutions,
  sortSupplements,
  type DietPlan,
} from "@/lib/diet";

export type DietPdfScope = "full" | "meals" | "supplements";

const SLOT_ORDER = ["cafe", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"] as const;

export async function downloadDietPlanPdf(
  plan: DietPlan,
  scope: DietPdfScope,
  studentName?: string,
) {
  const { jsPDF: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;

  const addPageIfNeeded = (height = 12) => {
    if (y + height > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLine = (text: string, opts?: { bold?: boolean; size?: number; gap?: number }) => {
    addPageIfNeeded();
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 10);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      addPageIfNeeded();
      doc.text(line, margin, y);
      y += opts?.gap ?? 5;
    }
  };

  const title =
    scope === "meals"
      ? "Plano Alimentar"
      : scope === "supplements"
        ? "Plano Suplementar"
        : "Plano Nutricional Completo";

  writeLine("FitPro AI", { size: 9, gap: 4 });
  writeLine(title, { bold: true, size: 16, gap: 6 });
  writeLine(plan.name, { bold: true, size: 12, gap: 5 });
  if (studentName) writeLine(`Aluno: ${studentName}`, { size: 10, gap: 5 });
  writeLine(
    `Metas: ${plan.kcal_target ?? "—"} kcal · P${plan.protein_g ?? "—"}g · C${plan.carbs_g ?? "—"}g · G${plan.fat_g ?? "—"}g`,
    { size: 9, gap: 8 },
  );

  if (scope === "full" || scope === "meals") {
    writeLine("PLANO ALIMENTAR", { bold: true, size: 12, gap: 6 });

    const meals = (plan.diet_meals ?? []).slice().sort(
      (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot),
    );

    for (const meal of meals) {
      const meta = getMealSlotMeta(meal.slot);
      const mainItems = getMealMainItems(meal);
      const substGroups = getMealSubstitutionGroups(meal);

      if (mainItems.length === 0 && substGroups.length === 0 && !meal.description?.trim()) continue;

      writeLine(`${meta.label} (${meal.time_label ?? meta.time})`, { bold: true, size: 11, gap: 4 });

      for (const item of mainItems) {
        writeLine(`• ${formatFoodItemDietbox(item)}`, { size: 10, gap: 4 });
        if (item.notes?.trim()) writeLine(`  Obs.: ${item.notes}`, { size: 9, gap: 4 });
      }

      if (meal.description?.trim()) {
        writeLine("Observação:", { bold: true, size: 9, gap: 3 });
        for (const line of meal.description.split("\n").filter(Boolean)) {
          writeLine(`- ${line.trim()}`, { size: 9, gap: 4 });
        }
      }

      for (const group of substGroups) {
        writeLine(group.set.name, { bold: true, size: 10, gap: 4 });
        for (const item of group.items) {
          writeLine(`• ${formatFoodItemDietbox(item)}`, { size: 10, gap: 4 });
        }
      }

      y += 3;
    }

    const planSubs = sortSubstitutions(plan.diet_substitutions);
    if (planSubs.length > 0) {
      writeLine("SUBSTITUIÇÕES GERAIS", { bold: true, size: 11, gap: 5 });
      for (const s of planSubs) {
        writeLine(`• ${s.original_food} → ${s.substitute_food}`, { size: 10, gap: 4 });
        if (s.notes?.trim()) writeLine(`  ${s.notes}`, { size: 9, gap: 4 });
      }
    }
  }

  if (scope === "full" || scope === "supplements") {
    if (scope === "full") y += 4;
    writeLine("PLANO SUPLEMENTAR", { bold: true, size: 12, gap: 6 });
    const supplements = sortSupplements(plan.diet_supplements);
    if (supplements.length === 0) {
      writeLine("Nenhum suplemento prescrito.", { size: 10, gap: 5 });
    } else {
      for (const s of supplements) {
        const timing = s.timing?.trim() ? ` · ${s.timing}` : "";
        const dosage = s.dosage?.trim() ? s.dosage : "—";
        writeLine(`• ${s.name} (${dosage}${timing})`, { size: 10, gap: 4 });
        if (s.notes?.trim()) writeLine(`  ${s.notes}`, { size: 9, gap: 4 });
      }
    }
  }

  const date = new Date().toLocaleDateString("pt-BR");
  y += 6;
  writeLine(`Gerado em ${date} · FitPro AI`, { size: 8, gap: 4 });

  const suffix =
    scope === "meals" ? "alimentar" : scope === "supplements" ? "suplementar" : "completo";
  doc.save(`${plan.name.replace(/\s+/g, "-").toLowerCase()}-${suffix}.pdf`);
}
