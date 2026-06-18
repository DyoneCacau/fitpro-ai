export type PdfWriter = {
  doc: import("jspdf").jsPDF;
  margin: number;
  maxWidth: number;
  y: number;
  addPageIfNeeded: (height?: number) => void;
  writeLine: (
    text: string,
    opts?: { bold?: boolean; size?: number; gap?: number; align?: "left" | "center" | "right" },
  ) => void;
};

export async function createPdfWriter(): Promise<PdfWriter> {
  const { jsPDF: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  const cursor = { y: margin };

  const addPageIfNeeded = (height = 12) => {
    if (cursor.y + height > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      cursor.y = margin;
    }
  };

  const writeLine = (
    text: string,
    opts?: { bold?: boolean; size?: number; gap?: number; align?: "left" | "center" | "right" },
  ) => {
    addPageIfNeeded();
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 10);
    doc.setTextColor(0);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      addPageIfNeeded();
      const x =
        opts?.align === "center"
          ? pageWidth / 2
          : opts?.align === "right"
            ? pageWidth - margin
            : margin;
      doc.text(line, x, cursor.y, opts?.align ? { align: opts.align } : undefined);
      cursor.y += opts?.gap ?? 5;
    }
  };

  return {
    doc,
    margin,
    maxWidth,
    get y() {
      return cursor.y;
    },
    set y(value: number) {
      cursor.y = value;
    },
    addPageIfNeeded,
    writeLine,
  };
}
