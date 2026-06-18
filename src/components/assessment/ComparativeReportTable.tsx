import {
  buildComparativeSections,
  formatAssessmentDate,
  type ComparativeRow,
  type ComparativeSection,
} from "@/lib/anthropometry";

type Props = {
  sections: ComparativeSection[];
  studentName?: string;
  beforeDate: string;
  afterDate: string;
  footer?: string;
  compact?: boolean;
};

export function ComparativeReportTable({
  sections,
  studentName,
  beforeDate,
  afterDate,
  footer = "Que tal ter seu plano alimentar no seu smartphone? 📱",
  compact = false,
}: Props) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-emerald-900/40 bg-[#0b120e] text-white ${
        compact ? "text-[10px]" : "text-[11px]"
      }`}
    >
      {studentName && (
        <div className="border-b border-emerald-900/50 px-4 py-3 text-center">
          <p className={`font-bold tracking-wide ${compact ? "text-sm" : "text-base"}`}>
            {studentName}
          </p>
        </div>
      )}

      <div className="grid grid-cols-[1.15fr_1fr_1.25fr] gap-2 border-b border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-100/70">
        <span />
        <span className="text-center">{beforeDate}</span>
        <span className="text-center">{afterDate}</span>
      </div>

      {sections.map((section, sectionIndex) => (
        <div key={section.title ?? `section-${sectionIndex}`}>
          {section.title && (
            <div className="border-y border-emerald-900/40 bg-emerald-950/50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
              {section.title}
            </div>
          )}
          {section.rows.map((row, rowIndex) => (
            <ComparativeReportRow key={`${section.title ?? "body"}-${row.label}`} row={row} zebra={rowIndex % 2 === 1} />
          ))}
        </div>
      ))}

      {footer && (
        <p className="border-t border-emerald-900/40 px-4 py-3 text-center text-[10px] leading-relaxed text-emerald-100/60">
          {footer}
        </p>
      )}
    </div>
  );
}

function ComparativeReportRow({ row, zebra }: { row: ComparativeRow; zebra: boolean }) {
  return (
    <div
      className={`grid grid-cols-[1.15fr_1fr_1.25fr] gap-2 px-3 py-2.5 ${
        zebra ? "bg-emerald-900/15" : "bg-[#0b120e]"
      }`}
    >
      <span className="font-medium text-emerald-50/90">{row.label}</span>
      <span className="text-center text-white/75">{row.before}</span>
      <span className="text-center font-semibold text-white">
        {row.after}
        {row.deltaDisplay && (
          <span className="ml-1 font-bold text-emerald-400">{row.deltaDisplay}</span>
        )}
      </span>
    </div>
  );
}

export function comparativeTableProps(
  beforeAssessedAt: string,
  afterAssessedAt: string,
  sections: ComparativeSection[],
  studentName?: string,
) {
  return {
    sections,
    studentName,
    beforeDate: formatAssessmentDate(beforeAssessedAt),
    afterDate: formatAssessmentDate(afterAssessedAt),
  };
}
