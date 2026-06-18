import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, FlaskConical, FolderOpen, Loader2, Pencil, Ruler, Trash2 } from "lucide-react";
import { AnthropometricForm } from "@/components/assessment/AnthropometricForm";
import { AssessmentDetailView } from "@/components/assessment/AssessmentDetailView";
import {
  ComparativeReportView,
  pickComparativePair,
} from "@/components/assessment/ComparativeReportView";
import { ExportAssessmentReportButton } from "@/components/assessment/ExportAssessmentReportButton";
import {
  assessmentOrdinal,
  buildAssessmentMetrics,
  formatAssessmentDate,
  formatAssessmentNumber,
  measurementsFromForm,
  sortAssessmentsOldestFirst,
} from "@/lib/anthropometry";
import type { Sex } from "@/lib/nutrition-calculator";
import {
  addStudentLabExam,
  addStudentMaterial,
  createAssessment,
  fetchStudentAnamnesisContext,
  fetchStudentAssessments,
  fetchStudentLabExams,
  fetchStudentMaterials,
  removeAssessment,
  removeStudentLabExam,
  removeStudentMaterial,
  updateAssessment,
  type Assessment,
} from "@/lib/tracking";

type Props = {
  alunoId: string;
  personalId: string;
  studentName?: string;
};

export function StudentTrackingPanel({ alunoId, personalId, studentName }: Props) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["proAssessments", alunoId] });
    void qc.invalidateQueries({ queryKey: ["assessments", alunoId] });
    void qc.invalidateQueries({ queryKey: ["proMaterials", alunoId] });
    void qc.invalidateQueries({ queryKey: ["proLabExams", alunoId] });
  };

  return (
    <div className="space-y-8">
      <AssessmentsSection
        alunoId={alunoId}
        personalId={personalId}
        studentName={studentName}
        onInvalidate={invalidate}
      />
      <MaterialsSection alunoId={alunoId} personalId={personalId} onInvalidate={invalidate} />
      <LabExamsSection alunoId={alunoId} personalId={personalId} onInvalidate={invalidate} />
    </div>
  );
}

function AssessmentsSection({
  alunoId,
  personalId,
  studentName,
  onInvalidate,
}: {
  alunoId: string;
  personalId: string;
  studentName?: string;
  onInvalidate: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailAssessment, setDetailAssessment] = useState<Assessment | null>(null);
  const [compareAssessment, setCompareAssessment] = useState<Assessment | null>(null);

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["proAssessments", alunoId],
    queryFn: () => fetchStudentAssessments(alunoId),
  });

  const { data: anamnesis } = useQuery({
    queryKey: ["anamnesisContext", alunoId],
    queryFn: () => fetchStudentAnamnesisContext(alunoId, personalId),
  });

  const sex = (anamnesis?.sex as Sex | undefined) ?? "M";
  const age = anamnesis?.age ?? undefined;
  const sorted = sortAssessmentsOldestFirst(assessments);
  const comparePair = compareAssessment ? pickComparativePair(assessments, compareAssessment) : null;

  async function handleSubmit(payload: {
    assessedAt: string;
    weightKg: number | null;
    heightCm: number | null;
    bodyFatPct: number | null;
    leanMassKg: number | null;
    measurements: ReturnType<typeof measurementsFromForm>;
    notes: string | null;
  }) {
    setSaving(true);
    try {
      await createAssessment({
        personalId,
        alunoId,
        assessedAt: payload.assessedAt,
        weightKg: payload.weightKg,
        heightCm: payload.heightCm,
        bodyFatPct: payload.bodyFatPct,
        leanMassKg: payload.leanMassKg,
        measurements: payload.measurements,
        notes: payload.notes,
      });
      setShowForm(false);
      onInvalidate();
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(payload: {
    assessedAt: string;
    weightKg: number | null;
    heightCm: number | null;
    bodyFatPct: number | null;
    leanMassKg: number | null;
    measurements: ReturnType<typeof measurementsFromForm>;
    notes: string | null;
  }) {
    if (!editingAssessment) return;
    setSaving(true);
    try {
      await updateAssessment({
        id: editingAssessment.id,
        assessedAt: payload.assessedAt,
        weightKg: payload.weightKg,
        heightCm: payload.heightCm,
        bodyFatPct: payload.bodyFatPct,
        leanMassKg: payload.leanMassKg,
        measurements: payload.measurements,
        notes: payload.notes,
      });
      setEditingAssessment(null);
      onInvalidate();
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(assessment: Assessment) {
    const label = formatAssessmentDate(assessment.assessed_at);
    if (!window.confirm(`Excluir a avaliação de ${label}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setDeletingId(assessment.id);
    try {
      await removeAssessment(assessment.id);
      if (detailAssessment?.id === assessment.id) setDetailAssessment(null);
      if (compareAssessment?.id === assessment.id) setCompareAssessment(null);
      if (editingAssessment?.id === assessment.id) setEditingAssessment(null);
      onInvalidate();
    } finally {
      setDeletingId(null);
    }
  }

  function openNewForm() {
    setEditingAssessment(null);
    setShowForm((v) => !v);
  }

  function openEditForm(assessment: Assessment) {
    setShowForm(false);
    setEditingAssessment(assessment);
  }

  function closeForm() {
    setShowForm(false);
    setEditingAssessment(null);
  }

  const formOpen = showForm || !!editingAssessment;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Ruler className="size-5 text-primary" />
          <h3 className="font-semibold">Avaliações antropométricas</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {assessments.length > 0 && (
            <ExportAssessmentReportButton
              assessments={assessments}
              studentName={studentName}
              sex={sex}
              age={age}
              label="Exportar PDF"
            />
          )}
          <button
            type="button"
            onClick={openNewForm}
            className="text-[11px] font-bold text-primary"
          >
            {showForm ? "Fechar formulário" : "+ Nova avaliação"}
          </button>
        </div>
      </div>

      {formOpen && (
        <AnthropometricForm
          key={editingAssessment?.id ?? "new"}
          alunoId={alunoId}
          personalId={personalId}
          assessment={editingAssessment ?? undefined}
          saving={saving}
          onCancel={closeForm}
          onSubmit={editingAssessment ? handleUpdate : handleSubmit}
        />
      )}

      {isLoading && <Loader2 className="size-5 animate-spin text-primary mx-auto" />}

      {!isLoading && assessments.length === 0 && !formOpen && (
        <p className="text-xs text-muted-foreground">
          Nenhuma avaliação registrada. Use o formulário acima para cadastrar a 1ª avaliação.
        </p>
      )}

      {assessments.length > 0 && (
        <div className="space-y-2">
          {sorted
            .slice()
            .reverse()
            .map((assessment, reverseIndex) => {
              const index = sorted.length - 1 - reverseIndex;
              const metrics = buildAssessmentMetrics(assessment, { sex, age });
              const canCompare = sorted.length >= 2 && index > 0;

              return (
                <div key={assessment.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
                      <ClipboardList className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{assessmentOrdinal(sorted.length, index)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatAssessmentDate(assessment.assessed_at)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {metrics.weightKg != null ? `${formatAssessmentNumber(metrics.weightKg)} kg` : "—"}
                        {metrics.bodyFatPct != null && ` · ${formatAssessmentNumber(metrics.bodyFatPct)}% gordura`}
                        {metrics.bmi != null && ` · IMC ${formatAssessmentNumber(metrics.bmi)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <ActionChip onClick={() => setDetailAssessment(assessment)}>Visualizar</ActionChip>
                    {canCompare && (
                      <ActionChip onClick={() => setCompareAssessment(assessment)}>Comparativo</ActionChip>
                    )}
                    <ActionChip onClick={() => openEditForm(assessment)}>
                      <span className="inline-flex items-center gap-1">
                        <Pencil className="size-3" />
                        Editar
                      </span>
                    </ActionChip>
                    <button
                      type="button"
                      disabled={deletingId === assessment.id}
                      onClick={() => void handleDelete(assessment)}
                      className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-[11px] font-bold text-destructive disabled:opacity-50"
                    >
                      {deletingId === assessment.id ? (
                        <Loader2 className="size-3 animate-spin inline" />
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Trash2 className="size-3" />
                          Excluir
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {detailAssessment && (
        <ModalOverlay onClose={() => setDetailAssessment(null)}>
          <AssessmentDetailView
            assessment={detailAssessment}
            assessments={assessments}
            sex={sex}
            age={age}
            onClose={() => setDetailAssessment(null)}
          />
        </ModalOverlay>
      )}

      {comparePair && (
        <ModalOverlay onClose={() => setCompareAssessment(null)}>
          <ComparativeReportView
            before={comparePair.before}
            after={comparePair.after}
            studentName={studentName}
            sex={sex}
            age={age}
            onClose={() => setCompareAssessment(null)}
          />
        </ModalOverlay>
      )}
    </section>
  );
}

function ActionChip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary"
    >
      {children}
    </button>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function MaterialsSection({
  alunoId,
  personalId,
  onInvalidate,
}: {
  alunoId: string;
  personalId: string;
  onInvalidate: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: materials = [] } = useQuery({
    queryKey: ["proMaterials", alunoId],
    queryFn: () => fetchStudentMaterials(alunoId),
  });

  const remove = useMutation({
    mutationFn: removeStudentMaterial,
    onSuccess: onInvalidate,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await addStudentMaterial({ personalId, alunoId, title, description, linkUrl });
      setTitle("");
      setDescription("");
      setLinkUrl("");
      onInvalidate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <FolderOpen className="size-5 text-primary" />
        <h3 className="font-semibold">Materiais de apoio</h3>
      </div>
      <form onSubmit={(e) => void submit(e)} className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <MiniField label="Título" value={title} onChange={setTitle} />
        <MiniField label="Descrição" value={description} onChange={setDescription} />
        <MiniField label="Link (URL)" value={linkUrl} onChange={setLinkUrl} />
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="w-full rounded-xl border border-primary text-primary py-2 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Adicionar material"}
        </button>
      </form>
      {materials.map((m) => (
        <div key={m.id} className="flex items-start justify-between gap-2 rounded-xl border border-border px-3 py-2">
          <div>
            <p className="text-sm font-medium">{m.title}</p>
            {m.link_url && <p className="text-[10px] text-primary truncate">{m.link_url}</p>}
          </div>
          <button type="button" onClick={() => remove.mutate(m.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
    </section>
  );
}

function LabExamsSection({
  alunoId,
  personalId,
  onInvalidate,
}: {
  alunoId: string;
  personalId: string;
  onInvalidate: () => void;
}) {
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [results, setResults] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: exams = [] } = useQuery({
    queryKey: ["proLabExams", alunoId],
    queryFn: () => fetchStudentLabExams(alunoId),
  });

  const remove = useMutation({
    mutationFn: removeStudentLabExam,
    onSuccess: onInvalidate,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!examName.trim()) return;
    setSaving(true);
    try {
      await addStudentLabExam({ personalId, alunoId, examName, examDate: examDate || null, results, notes });
      setExamName("");
      setExamDate("");
      setResults("");
      setNotes("");
      onInvalidate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="size-5 text-primary" />
        <h3 className="font-semibold">Exames laboratoriais</h3>
      </div>
      <form onSubmit={(e) => void submit(e)} className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <MiniField label="Nome do exame" value={examName} onChange={setExamName} />
        <MiniField label="Data" value={examDate} onChange={setExamDate} type="date" />
        <label className="block">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Resultados</span>
          <textarea value={results} onChange={(e) => setResults(e.target.value)} className="field-input mt-1 min-h-[72px] text-xs" />
        </label>
        <MiniField label="Observações" value={notes} onChange={setNotes} />
        <button
          type="submit"
          disabled={saving || !examName.trim()}
          className="w-full rounded-xl border border-primary text-primary py-2 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Registrar exame"}
        </button>
      </form>
      {exams.map((e) => (
        <div key={e.id} className="flex items-start justify-between gap-2 rounded-xl border border-border px-3 py-2">
          <div>
            <p className="text-sm font-medium">{e.exam_name}</p>
            {e.exam_date && (
              <p className="text-[10px] text-muted-foreground">
                {new Date(e.exam_date + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
          <button type="button" onClick={() => remove.mutate(e.id)} className="text-muted-foreground hover:text-destructive">
            {remove.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </button>
        </div>
      ))}
    </section>
  );
}

function MiniField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="field-input mt-1 text-xs" />
    </label>
  );
}
