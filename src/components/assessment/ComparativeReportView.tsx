import {

  buildAssessmentMetrics,

  buildComparativeSections,

} from "@/lib/anthropometry";

import {

  ComparativeReportTable,

  comparativeTableProps,

} from "@/components/assessment/ComparativeReportTable";

import { ExportAssessmentReportButton } from "@/components/assessment/ExportAssessmentReportButton";

import type { Sex } from "@/lib/nutrition-calculator";

import type { Assessment } from "@/lib/tracking";



type Props = {

  before: Assessment;

  after: Assessment;

  studentName?: string;

  sex?: Sex;

  age?: number;

  onClose?: () => void;

};



export function ComparativeReportView({

  before,

  after,

  studentName,

  sex = "M",

  age,

  onClose,

}: Props) {

  const beforeMetrics = buildAssessmentMetrics(before, { sex, age });

  const afterMetrics = buildAssessmentMetrics(after, { sex, age });

  const sections = buildComparativeSections(beforeMetrics, afterMetrics);

  const tableProps = comparativeTableProps(before.assessed_at, after.assessed_at, sections, studentName);



  return (

    <div className="rounded-t-3xl bg-[#060a08] border-t border-emerald-900/40 max-h-[90vh] overflow-y-auto">

      <div className="sticky top-0 z-10 bg-[#060a08] border-b border-emerald-900/40 px-4 py-4">

        <div className="flex items-start justify-between gap-3">

          <div>

            <p className="text-[10px] uppercase tracking-wider text-emerald-200/60">

              Exame físico comparativo

            </p>

          </div>

          {onClose && (

            <button

              type="button"

              onClick={onClose}

              className="text-sm font-bold text-emerald-400 shrink-0"

            >

              Fechar

            </button>

          )}

        </div>

        <div className="mt-3">

          <ExportAssessmentReportButton

            assessments={[before, after]}

            before={before}

            after={after}

            studentName={studentName}

            sex={sex}

            age={age}

            variant="pair"

            label="Exportar PDF"

            className="w-full border-emerald-500/40 bg-emerald-500/10 text-emerald-300"

          />

        </div>

      </div>



      <div className="px-3 py-4 pb-8">

        <ComparativeReportTable {...tableProps} />

      </div>

    </div>

  );

}



export { pickComparativePair } from "@/lib/assessment-comparative";


