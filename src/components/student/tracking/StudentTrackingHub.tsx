import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  ClipboardList,
  ExternalLink,
  FileText,
  FlaskConical,
  FolderOpen,
  Pill,
  Ruler,
  Scale,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { AssessmentDetailView } from "@/components/assessment/AssessmentDetailView";
import {
  ComparativeReportView,
  pickComparativePair,
} from "@/components/assessment/ComparativeReportView";
import { ExportAssessmentReportButton } from "@/components/assessment/ExportAssessmentReportButton";
import { EmptyState, FeatureHubCard, SubPageHeader } from "@/components/student/FeatureHub";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from "@/hooks/use-auth";
import {
  assessmentOrdinal,
  buildAssessmentMetrics,
  formatAssessmentDate,
  formatAssessmentNumber,
  sortAssessmentsOldestFirst,
} from "@/lib/anthropometry";
import type { Sex } from "@/lib/nutrition-calculator";
import { fetchStudentActiveDietPlan, sortSupplements } from "@/lib/diet";
import {
  buildAssessmentChartData,
  fetchStudentAssessments,
  fetchStudentLabExams,
  fetchStudentMaterials,
  type Assessment,
} from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";

type TrackingView =
  | "hub"
  | "avaliacoes"
  | "graficos"
  | "exames"
  | "materiais"
  | "prescricoes";

export function StudentTrackingHub({ embedded = false }: { embedded?: boolean }) {
  const [view, setView] = useState<TrackingView>("hub");

  if (view === "hub") {
    return (
      <>
        {!embedded && (
          <header className="bg-gradient-hero px-5 pt-12 pb-5">
            <h1 className="text-2xl font-bold text-foreground">Acompanhamento</h1>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Consulte dados relacionados ao seu acompanhamento nutricional.
            </p>
          </header>
        )}
        <div className={`px-5 space-y-3 pb-8 ${embedded ? "pt-1" : "py-5"}`}>
          <FeatureHubCard
            icon={Scale}
            title="Avaliações Antropométricas"
            description="Consulte seu histórico de avaliações."
            onClick={() => setView("avaliacoes")}
          />
          <FeatureHubCard
            icon={BarChart3}
            title="Gráficos Antropométricos"
            description="Visualize os gráficos obtidos a partir de suas avaliações."
            onClick={() => setView("graficos")}
          />
          <FeatureHubCard
            icon={FlaskConical}
            title="Exames Laboratoriais"
            description="Acompanhe os resultados dos exames e fique de olho na sua saúde."
            onClick={() => setView("exames")}
          />
          <FeatureHubCard
            icon={FolderOpen}
            title="Materiais"
            description="Materiais de apoio sobre nutrição, saúde e bem-estar."
            onClick={() => setView("materiais")}
          />
          <FeatureHubCard
            icon={Stethoscope}
            title="Prescrições"
            description="Consulte as prescrições disponibilizadas pelo seu profissional."
            onClick={() => setView("prescricoes")}
          />
        </div>
      </>
    );
  }

  return (
    <TrackingSubView view={view} onBack={() => setView("hub")} />
  );
}

function TrackingSubView({ view, onBack }: { view: TrackingView; onBack: () => void }) {
  const { user } = useAuth();

  const { data: assessments = [], isLoading: loadingAssessments } = useQuery({
    queryKey: ["assessments", user?.id],
    enabled: !!user?.id && (view === "avaliacoes" || view === "graficos"),
    queryFn: () => fetchStudentAssessments(user!.id),
  });

  const { data: exams = [] } = useQuery({
    queryKey: ["labExams", user?.id],
    enabled: !!user?.id && view === "exames",
    queryFn: () => fetchStudentLabExams(user!.id),
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["materials", user?.id],
    enabled: !!user?.id && view === "materiais",
    queryFn: () => fetchStudentMaterials(user!.id),
  });

  const { data: plan } = useQuery({
    queryKey: ["dietPlanFull", user?.id],
    enabled: !!user?.id && view === "prescricoes",
    queryFn: () => fetchStudentActiveDietPlan(user!.id),
  });

  const { data: workoutCount = 0 } = useQuery({
    queryKey: ["studentWorkoutCount", user?.id],
    enabled: !!user?.id && view === "prescricoes",
    queryFn: async () => {
      const { count, error } = await supabase
        .from("workouts")
        .select("*", { count: "exact", head: true })
        .eq("aluno_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  switch (view) {
    case "avaliacoes":
      return (
        <AssessmentsView assessments={assessments} loading={loadingAssessments} onBack={onBack} />
      );
    case "graficos":
      return <ChartsView assessments={assessments} loading={loadingAssessments} onBack={onBack} />;
    case "exames":
      return <LabExamsView exams={exams} onBack={onBack} />;
    case "materiais":
      return <MaterialsView materials={materials} onBack={onBack} />;
    case "prescricoes":
      return (
        <PrescriptionsView plan={plan ?? null} workoutCount={workoutCount} onBack={onBack} />
      );
    default:
      return null;
  }
}

function AssessmentsView({
  assessments,
  loading,
  onBack,
}: {
  assessments: Assessment[];
  loading: boolean;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [detailAssessment, setDetailAssessment] = useState<Assessment | null>(null);
  const [compareAssessment, setCompareAssessment] = useState<Assessment | null>(null);

  const { data: anamnesis } = useQuery({
    queryKey: ["studentAnamnesisContext", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("personal_id")
        .eq("id", user!.id)
        .maybeSingle();
      if (!profile?.personal_id) return null;
      const { data } = await supabase
        .from("anamnesis")
        .select("sex, age")
        .eq("aluno_id", user!.id)
        .eq("personal_id", profile.personal_id)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
  });

  const sex = (anamnesis?.sex as Sex | undefined) ?? "M";
  const age = anamnesis?.age ?? undefined;
  const sorted = sortAssessmentsOldestFirst(assessments);
  const latest = assessments[0];
  const previous = assessments[1];
  const latestMetrics = latest ? buildAssessmentMetrics(latest, { sex, age }) : null;
  const comparePair = compareAssessment ? pickComparativePair(assessments, compareAssessment) : null;
  const deltaWeight =
    latest?.weight_kg && previous?.weight_kg
      ? Number(latest.weight_kg) - Number(previous.weight_kg)
      : 0;

  return (
    <>
      <SubPageHeader title="Antropometria" subtitle="Acompanhe os seus resultados" onBack={onBack} />
      <div className="px-5 py-5 pb-8 space-y-5">
        {assessments.length > 0 && (
          <ExportAssessmentReportButton
            assessments={assessments}
            sex={sex}
            age={age}
            label="Exportar avaliação (PDF)"
            className="w-full"
          />
        )}
        {loading && <p className="text-sm text-muted-foreground text-center">Carregando…</p>}
        {!loading && assessments.length === 0 && (
          <EmptyState
            icon={Ruler}
            title="Nenhuma avaliação"
            description="Seu profissional ainda não cadastrou avaliações antropométricas."
          />
        )}

        {latestMetrics && (
          <div className="rounded-3xl bg-gradient-card border border-border p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Última avaliação</p>
                <p className="text-sm font-bold">{formatAssessmentDate(latest!.assessed_at)}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={Scale}
                label="Peso"
                value={latestMetrics.weightKg ? `${formatAssessmentNumber(latestMetrics.weightKg)} kg` : "—"}
                delta={deltaWeight ? `${deltaWeight > 0 ? "+" : ""}${formatAssessmentNumber(deltaWeight)} kg` : undefined}
              />
              <StatCard
                icon={Activity}
                label="% Gordura"
                value={latestMetrics.bodyFatPct ? `${formatAssessmentNumber(latestMetrics.bodyFatPct)}%` : "—"}
              />
              <StatCard
                icon={Ruler}
                label="IMC"
                value={latestMetrics.bmi ? formatAssessmentNumber(latestMetrics.bmi) : "—"}
                delta={latestMetrics.bmiStatus ?? undefined}
              />
              <StatCard
                icon={Activity}
                label="Massa magra"
                value={latestMetrics.leanMassKg ? `${formatAssessmentNumber(latestMetrics.leanMassKg)} kg` : "—"}
              />
            </div>
          </div>
        )}

        {assessments.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Histórico</h2>
            {sorted
              .slice()
              .reverse()
              .map((assessment, reverseIndex) => {
                const index = sorted.length - 1 - reverseIndex;
                const metrics = buildAssessmentMetrics(assessment, { sex, age });
                const canCompare = sorted.length >= 2 && index > 0;

                return (
                  <div
                    key={assessment.id}
                    className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
                      <ClipboardList className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{assessmentOrdinal(sorted.length, index)}</p>
                      <p className="text-xs text-muted-foreground">{formatAssessmentDate(assessment.assessed_at)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {metrics.weightKg != null ? `${formatAssessmentNumber(metrics.weightKg)} kg` : "—"}
                        {metrics.bodyFatPct != null && ` · ${formatAssessmentNumber(metrics.bodyFatPct)}%`}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDetailAssessment(assessment)}
                        className="text-[11px] font-bold text-primary"
                      >
                        Visualizar
                      </button>
                      {canCompare && (
                        <button
                          type="button"
                          onClick={() => setCompareAssessment(assessment)}
                          className="text-[10px] font-bold text-muted-foreground"
                        >
                          Comparativo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {detailAssessment && (
        <StudentModalOverlay onClose={() => setDetailAssessment(null)}>
          <AssessmentDetailView
            assessment={detailAssessment}
            assessments={assessments}
            sex={sex}
            age={age}
            onClose={() => setDetailAssessment(null)}
          />
        </StudentModalOverlay>
      )}

      {comparePair && (
        <StudentModalOverlay onClose={() => setCompareAssessment(null)}>
          <ComparativeReportView
            before={comparePair.before}
            after={comparePair.after}
            sex={sex}
            age={age}
            onClose={() => setCompareAssessment(null)}
          />
        </StudentModalOverlay>
      )}
    </>
  );
}

function StudentModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
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

function ChartsView({
  assessments,
  loading,
  onBack,
}: {
  assessments: Assessment[];
  loading: boolean;
  onBack: () => void;
}) {
  const chartData = buildAssessmentChartData(assessments);

  return (
    <>
      <SubPageHeader title="Gráficos Antropométricos" onBack={onBack} />
      <div className="px-5 py-5 pb-8 space-y-5">
        {loading && <p className="text-sm text-muted-foreground text-center">Carregando…</p>}
        {!loading && chartData.length < 2 && (
          <EmptyState icon={BarChart3} title="Dados insuficientes" description="São necessárias ao menos duas avaliações para exibir gráficos." />
        )}
        {chartData.length >= 2 && (
          <>
            <ChartBlock title="Peso (kg)" data={chartData} dataKey="peso" />
            <ChartBlock title="% Gordura" data={chartData} dataKey="gordura" />
            <ChartBlock title="Massa magra (kg)" data={chartData} dataKey="massaMagra" />
          </>
        )}
      </div>
    </>
  );
}

function ChartBlock({
  title,
  data,
  dataKey,
}: {
  title: string;
  data: ReturnType<typeof buildAssessmentChartData>;
  dataKey: "peso" | "gordura" | "massaMagra";
}) {
  const filtered = data.filter((d) => d[dataKey] != null);
  if (filtered.length < 2) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-bold mb-3">{title}</p>
      <ChartContainer
        config={{ [dataKey]: { label: title, color: "hsl(var(--primary))" } }}
        className="h-[200px] w-full aspect-auto"
      >
        <LineChart data={filtered}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={32} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line type="monotone" dataKey={dataKey} stroke={`var(--color-${dataKey})`} strokeWidth={2} dot />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function LabExamsView({
  exams,
  onBack,
}: {
  exams: Awaited<ReturnType<typeof fetchStudentLabExams>>;
  onBack: () => void;
}) {
  return (
    <>
      <SubPageHeader title="Exames Laboratoriais" onBack={onBack} />
      <div className="px-5 py-5 space-y-3 pb-8">
        {exams.length === 0 ? (
          <EmptyState icon={FlaskConical} title="Nenhum exame" description="Seu profissional ainda não registrou exames." />
        ) : (
          exams.map((e) => (
            <div key={e.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-bold">{e.exam_name}</p>
              {e.exam_date && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(e.exam_date + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
              )}
              {e.results && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{e.results}</p>}
              {e.notes && <p className="text-xs text-muted-foreground mt-2">{e.notes}</p>}
            </div>
          ))
        )}
      </div>
    </>
  );
}

function MaterialsView({
  materials,
  onBack,
}: {
  materials: Awaited<ReturnType<typeof fetchStudentMaterials>>;
  onBack: () => void;
}) {
  return (
    <>
      <SubPageHeader title="Materiais" onBack={onBack} />
      <div className="px-5 py-5 space-y-3 pb-8">
        {materials.length === 0 ? (
          <EmptyState icon={FolderOpen} title="Nenhum material" description="Seu profissional ainda não compartilhou materiais." />
        ) : (
          materials.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{m.title}</p>
                  {m.description && <p className="text-xs text-muted-foreground mt-1">{m.description}</p>}
                  {m.link_url && (
                    <a
                      href={m.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-2"
                    >
                      Abrir material <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function PrescriptionsView({
  plan,
  workoutCount,
  onBack,
}: {
  plan: Awaited<ReturnType<typeof fetchStudentActiveDietPlan>> | null;
  workoutCount: number;
  onBack: () => void;
}) {
  const supplements = sortSupplements(plan?.diet_supplements);

  return (
    <>
      <SubPageHeader title="Prescrições" subtitle="Plano alimentar, suplementos e treinos" onBack={onBack} />
      <div className="px-5 py-5 space-y-3 pb-8">
        <Link to="/dieta" className="block rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-bold">Plano alimentar</p>
              <p className="text-xs text-muted-foreground">{plan?.name ?? "Nenhum plano ativo"}</p>
            </div>
          </div>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3 mb-2">
            <Pill className="h-5 w-5 text-primary" />
            <p className="text-sm font-bold">Suplementos</p>
          </div>
          {supplements.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum suplemento prescrito.</p>
          ) : (
            <ul className="space-y-1.5">
              {supplements.map((s) => (
                <li key={s.id} className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{s.name}</span>
                  {s.dosage && ` · ${s.dosage}`}
                  {s.timing && ` · ${s.timing}`}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link to="/treinos" className="block rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold">Treinos prescritos</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {workoutCount} {workoutCount === 1 ? "rotina ativa" : "rotinas ativas"}
          </p>
        </Link>
      </div>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: typeof Scale;
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <div className="rounded-2xl bg-background/40 border border-border p-3">
      <Icon className="h-4 w-4 text-primary mb-1.5" />
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
      {delta && <p className="text-[10px] font-bold mt-1 text-muted-foreground">{delta}</p>}
    </div>
  );
}
