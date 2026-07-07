import {
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  type ActivityLevel,
  type FitnessGoal,
  type Sex,
} from "@/lib/nutrition-calculator";
import {
  CIRCUMFERENCE_FIELDS,
  SKINFOLD_FIELDS,
  formatAssessmentNumber,
  type AssessmentMetrics,
  type CircumferenceKey,
  type SkinfoldKey,
} from "@/lib/anthropometry";
import {
  SMOKING_OPTIONS,
  STRESS_OPTIONS,
  TRAINING_EXPERIENCE_OPTIONS,
  type AnamnesisFormState,
  type SmokingStatus,
  type StressLevel,
  type TrainingExperience,
} from "@/lib/anamnesis-form";
import {
  CompactBlockField,
  CompactMetricField,
  CompactMetricGrid,
  CompactMetricRow,
  CompactSectionLabel,
  compactInputClass,
  compactSelectClass,
  compactTextareaClass,
} from "@/components/forms/CompactFormFields";
import { PremiumCollapsible } from "@/components/student/ui/PremiumCollapsible";
import { Activity, Apple, HeartPulse, Ruler, Target, User } from "lucide-react";

type Props = {
  form: AnamnesisFormState;
  onChange: <K extends keyof AnamnesisFormState>(key: K, value: AnamnesisFormState[K]) => void;
  onCircumferenceChange: (key: CircumferenceKey, value: string) => void;
  onSkinfoldChange: (key: SkinfoldKey, value: string) => void;
  anthropometryPreview?: AssessmentMetrics | null;
  compact?: boolean;
};

export function AnamnesisFormSections({
  form,
  onChange,
  onCircumferenceChange,
  onSkinfoldChange,
  anthropometryPreview,
  compact = false,
}: Props) {
  return (
    <div className="space-y-2">
      <Section title="Dados antropométricos e objetivo" icon={User} defaultOpen>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0 sm:grid-cols-4">
          <CompactBlockField label="Sexo">
            <select
              value={form.sex}
              onChange={(e) => onChange("sex", e.target.value as Sex)}
              className={compactSelectClass}
            >
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </CompactBlockField>
          <CompactBlockField label="Idade">
            <input
              type="number"
              value={form.age}
              onChange={(e) => onChange("age", e.target.value)}
              className={compactInputClass}
            />
          </CompactBlockField>
          <CompactBlockField label="Peso (kg)">
            <input
              type="number"
              value={form.weightKg}
              onChange={(e) => onChange("weightKg", e.target.value)}
              className={compactInputClass}
            />
          </CompactBlockField>
          <CompactBlockField label="Altura (cm)">
            <input
              type="number"
              value={form.heightCm}
              onChange={(e) => onChange("heightCm", e.target.value)}
              className={compactInputClass}
            />
          </CompactBlockField>
        </div>
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-x-3">
          <CompactBlockField label="Nível de atividade">
            <select
              value={form.activity}
              onChange={(e) => onChange("activity", e.target.value as ActivityLevel)}
              className={compactSelectClass}
            >
              {ACTIVITY_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </CompactBlockField>
          <CompactBlockField label="Objetivo principal">
            <select
              value={form.goal}
              onChange={(e) => onChange("goal", e.target.value as FitnessGoal)}
              className={compactSelectClass}
            >
              {GOAL_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </CompactBlockField>
        </div>
        <CompactBlockField label="Profissão / rotina diária">
          <input
            value={form.occupation}
            onChange={(e) => onChange("occupation", e.target.value)}
            placeholder="Ex.: analista, estudante…"
            className={`${compactInputClass} text-left`}
          />
        </CompactBlockField>
      </Section>

      <Section title="Exame físico / antropometria" icon={Ruler} defaultOpen>
        <CompactMetricRow>
          <CompactMetricField label="% Gordura">
            <input
              type="number"
              value={form.bodyFatPct}
              onChange={(e) => onChange("bodyFatPct", e.target.value)}
              placeholder="—"
              className={compactInputClass}
            />
          </CompactMetricField>
        </CompactMetricRow>
        <CompactSectionLabel>Circunferências (cm)</CompactSectionLabel>
        <CompactMetricGrid>
          {CIRCUMFERENCE_FIELDS.map((field) => (
            <CompactMetricField key={field.key} label={field.label}>
              <input
                type="number"
                inputMode="decimal"
                value={form.circumferences[field.key]}
                onChange={(e) => onCircumferenceChange(field.key, e.target.value)}
                className={compactInputClass}
              />
            </CompactMetricField>
          ))}
        </CompactMetricGrid>
        <CompactSectionLabel>Dobras cutâneas (mm)</CompactSectionLabel>
        <CompactMetricGrid>
          {SKINFOLD_FIELDS.map((field) => (
            <CompactMetricField key={field.key} label={field.label}>
              <input
                type="number"
                inputMode="decimal"
                value={form.skinfolds[field.key]}
                onChange={(e) => onSkinfoldChange(field.key, e.target.value)}
                className={compactInputClass}
              />
            </CompactMetricField>
          ))}
        </CompactMetricGrid>
        {anthropometryPreview && (
          <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
            {anthropometryPreview.bmi != null && (
              <PreviewStat label="IMC" value={formatAssessmentNumber(anthropometryPreview.bmi)} />
            )}
            {anthropometryPreview.fatMassKg != null && (
              <PreviewStat
                label="Massa gorda"
                value={`${formatAssessmentNumber(anthropometryPreview.fatMassKg)} kg`}
              />
            )}
            {anthropometryPreview.bodyFatPct != null && (
              <PreviewStat
                label="% Gordura"
                value={`${formatAssessmentNumber(anthropometryPreview.bodyFatPct)}%`}
              />
            )}
            {anthropometryPreview.leanMassKg != null && (
              <PreviewStat
                label="Massa magra"
                value={`${formatAssessmentNumber(anthropometryPreview.leanMassKg)} kg`}
              />
            )}
            {anthropometryPreview.waistHipRatio != null && (
              <PreviewStat
                label="C/Q"
                value={formatAssessmentNumber(anthropometryPreview.waistHipRatio)}
              />
            )}
            {anthropometryPreview.skinfoldSum != null && (
              <PreviewStat
                label="Σ dobras"
                value={`${formatAssessmentNumber(anthropometryPreview.skinfoldSum)} mm`}
              />
            )}
          </div>
        )}
      </Section>

      <Section title="Estilo de vida" icon={Activity} defaultOpen={!compact}>
        <CompactMetricGrid>
          <CompactMetricField label="Sono (h)">
            <input
              type="number"
              step="0.5"
              value={form.sleepHours}
              onChange={(e) => onChange("sleepHours", e.target.value)}
              placeholder="7"
              className={compactInputClass}
            />
          </CompactMetricField>
          <CompactMetricField label="Refeições/dia">
            <input
              type="number"
              value={form.mealsPerDay}
              onChange={(e) => onChange("mealsPerDay", e.target.value)}
              placeholder="4"
              className={compactInputClass}
            />
          </CompactMetricField>
        </CompactMetricGrid>
        <CompactBlockField label="Nível de estresse">
          <select
            value={form.stressLevel}
            onChange={(e) => onChange("stressLevel", e.target.value as StressLevel)}
            className={compactSelectClass}
          >
            {STRESS_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </CompactBlockField>
        <CompactBlockField label="Disponibilidade semanal">
          <input
            value={form.weeklyAvailability}
            onChange={(e) => onChange("weeklyAvailability", e.target.value)}
            placeholder="Seg/qua/sex 7h"
            className={`${compactInputClass} text-left`}
          />
        </CompactBlockField>
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-x-3">
          <CompactBlockField label="Tabagismo">
            <select
              value={form.smoking}
              onChange={(e) => onChange("smoking", e.target.value as SmokingStatus)}
              className={compactSelectClass}
            >
              {SMOKING_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </CompactBlockField>
          <CompactBlockField label="Álcool">
            <input
              value={form.alcoholUse}
              onChange={(e) => onChange("alcoholUse", e.target.value)}
              placeholder="Social, não bebe…"
              className={`${compactInputClass} text-left`}
            />
          </CompactBlockField>
        </div>
      </Section>

      <Section title="Histórico de saúde" icon={HeartPulse} defaultOpen={!compact}>
        <TextField
          label="Doenças / condições"
          value={form.medicalHistory}
          onChange={(v) => onChange("medicalHistory", v)}
          placeholder="Hipertensão, diabetes…"
        />
        <TextField
          label="Medicamentos"
          value={form.medications}
          onChange={(v) => onChange("medications", v)}
          placeholder="Nome, dose e horário"
        />
        <TextField
          label="Lesões"
          value={form.injuries}
          onChange={(v) => onChange("injuries", v)}
          placeholder="Joelho, lombar…"
        />
        <TextField label="Cirurgias" value={form.surgeries} onChange={(v) => onChange("surgeries", v)} />
        <TextField
          label="Histórico familiar"
          value={form.familyHistory}
          onChange={(v) => onChange("familyHistory", v)}
          placeholder="Cardíacas, diabetes…"
        />
        <TextField
          label="Dores / limitações"
          value={form.painOrLimitations}
          onChange={(v) => onChange("painOrLimitations", v)}
          placeholder="Movimentos a evitar…"
        />
        <div className="mt-1.5 rounded-lg border border-border bg-muted/20 p-2 space-y-1.5">
          <label className="flex items-start gap-2 text-xs leading-snug">
            <input
              type="checkbox"
              checked={form.parQCleared}
              onChange={(e) => onChange("parQCleared", e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold">PAR-Q:</span> sem contraindicação para atividade física
              (ou liberação médica).
            </span>
          </label>
          {!form.parQCleared && (
            <TextField
              label="Detalhes PAR-Q"
              value={form.parQNotes}
              onChange={(v) => onChange("parQNotes", v)}
            />
          )}
        </div>
      </Section>

      <Section title="Treino e experiência" icon={Activity} defaultOpen={!compact}>
        <CompactBlockField label="Experiência">
          <select
            value={form.trainingExperience}
            onChange={(e) => onChange("trainingExperience", e.target.value as TrainingExperience)}
            className={compactSelectClass}
          >
            {TRAINING_EXPERIENCE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </CompactBlockField>
        <div className="grid grid-cols-2 gap-x-3">
          <CompactMetricField label="Dias/sem">
            <input
              type="number"
              min={1}
              max={7}
              value={form.trainingDaysPerWeek}
              onChange={(e) => onChange("trainingDaysPerWeek", e.target.value)}
              className={compactInputClass}
            />
          </CompactMetricField>
          <CompactBlockField label="Local">
            <input
              value={form.trainingLocation}
              onChange={(e) => onChange("trainingLocation", e.target.value)}
              placeholder="Academia, casa…"
              className={`${compactInputClass} text-left`}
            />
          </CompactBlockField>
        </div>
        <TextField
          label="Histórico de treinos"
          value={form.trainingHistory}
          onChange={(v) => onChange("trainingHistory", v)}
          placeholder="Modalidades, tempo…"
        />
      </Section>

      <Section title="Alimentação" icon={Apple} defaultOpen={!compact}>
        <TextField
          label="Restrições / alergias"
          value={form.restrictions}
          onChange={(v) => onChange("restrictions", v)}
          placeholder="Lactose, glúten…"
        />
        <TextField
          label="Suplementos"
          value={form.supplementsUsed}
          onChange={(v) => onChange("supplementsUsed", v)}
          placeholder="Whey, creatina…"
        />
        <TextField
          label="Preferências"
          value={form.foodPreferences}
          onChange={(v) => onChange("foodPreferences", v)}
        />
        <TextField label="Digestão" value={form.digestionNotes} onChange={(v) => onChange("digestionNotes", v)} />
      </Section>

      <Section title="Motivação e observações" icon={Target} defaultOpen>
        <TextField
          label="Principal motivação"
          value={form.mainMotivation}
          onChange={(v) => onChange("mainMotivation", v)}
        />
        <TextField label="Expectativas" value={form.expectations} onChange={(v) => onChange("expectations", v)} />
        <TextField
          label="Observações clínicas"
          value={form.clinicalNotes}
          onChange={(v) => onChange("clinicalNotes", v)}
          rows={2}
        />
      </Section>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <CompactBlockField label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={compactTextareaClass}
      />
    </CompactBlockField>
  );
}

function Section({
  title,
  icon: Icon,
  defaultOpen,
  children,
}: {
  title: string;
  icon: typeof User;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <PremiumCollapsible title={title} icon={Icon} defaultOpen={defaultOpen ?? false}>
      <div className="pt-0.5">{children}</div>
    </PremiumCollapsible>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
