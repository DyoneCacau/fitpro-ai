import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, Check, Clock, Info, X, Trophy, Flame, Timer, Dumbbell } from "lucide-react";
import { todayWorkout, type Exercise } from "@/lib/mock-data";

export const Route = createFileRoute("/treino/$id")({
  head: () => ({
    meta: [{ title: "Execução do treino — FitPro AI" }],
  }),
  component: WorkoutRunner,
});

interface SetLog {
  load: number;
  reps: number;
  note?: string;
  done: boolean;
}

type LogMap = Record<string, Record<string, SetLog>>; // exerciseId -> setId -> log

function WorkoutRunner() {
  const router = useRouter();
  const workout = todayWorkout;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [logs, setLogs] = useState<LogMap>({});
  const [editing, setEditing] = useState<{ ex: Exercise; setId: string } | null>(null);
  const [finished, setFinished] = useState(false);

  const totals = useMemo(() => {
    let doneSets = 0;
    let totalSets = 0;
    let doneExercises = 0;
    let volume = 0;
    workout.exercises.forEach((ex) => {
      totalSets += ex.sets.length;
      const exLog = logs[ex.id] || {};
      const exDone = ex.sets.every((s) => exLog[s.id]?.done);
      if (exDone) doneExercises++;
      ex.sets.forEach((s) => {
        const log = exLog[s.id];
        if (log?.done) {
          doneSets++;
          volume += (log.load || 0) * (log.reps || 0);
        }
      });
    });
    return {
      doneSets,
      totalSets,
      doneExercises,
      volume,
      pct: totalSets ? Math.round((doneSets / totalSets) * 100) : 0,
    };
  }, [logs, workout]);

  const current = workout.exercises[currentIdx];
  const currentLog = logs[current.id] || {};
  const currentDone = current.sets.every((s) => currentLog[s.id]?.done);

  const saveSet = (load: number, reps: number, note?: string) => {
    if (!editing) return;
    setLogs((prev) => ({
      ...prev,
      [editing.ex.id]: {
        ...(prev[editing.ex.id] || {}),
        [editing.setId]: { load, reps, note, done: true },
      },
    }));
    setEditing(null);
  };

  const next = () => {
    if (currentIdx < workout.exercises.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <FinishScreen
        doneExercises={totals.doneExercises}
        doneSets={totals.doneSets}
        volume={totals.volume}
        onExit={() => router.navigate({ to: "/" })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Sticky top progress */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="mx-auto max-w-md px-4 pt-3 pb-3">
          <div className="flex items-center justify-between mb-2.5">
            <button
              onClick={() => router.navigate({ to: "/" })}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Treino {workout.letter}</p>
              <p className="text-sm font-semibold leading-tight">{totals.doneExercises}/{workout.exercises.length} exercícios</p>
            </div>
            <div className="flex h-9 w-14 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-xs">
              {totals.pct}%
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-gradient-primary transition-all duration-500 ease-out"
              style={{ width: `${totals.pct}%` }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-5">
        {/* Exercise number pill */}
        <div className="flex items-center gap-2 mb-3">
          <span className="rounded-full bg-card border border-border px-3 py-1 text-xs font-bold">
            Exercício {currentIdx + 1} / {workout.exercises.length}
          </span>
          <span className="rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-bold">
            {current.muscleGroup}
          </span>
        </div>

        {/* Exercise card */}
        <div className="rounded-3xl overflow-hidden bg-gradient-card border border-border shadow-elevated">
          {/* Visual */}
          <div className="relative h-44 bg-gradient-to-br from-primary/20 via-card to-card flex items-center justify-center text-7xl">
            <span>{current.image}</span>
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur px-3 py-1.5 text-xs font-medium">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {current.restSeconds}s descanso
            </div>
          </div>

          <div className="p-5">
            <h2 className="text-xl font-bold leading-tight">{current.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {current.sets.length} séries · {current.sets[0]?.reps} reps
            </p>

            {current.note && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/30 p-3">
                <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning-foreground/90">{current.note}</p>
              </div>
            )}

            {/* Sets */}
            <div className="mt-5 space-y-2">
              {current.sets.map((s, i) => {
                const log = currentLog[s.id];
                const done = log?.done;
                return (
                  <button
                    key={s.id}
                    onClick={() => setEditing({ ex: current, setId: s.id })}
                    className={`w-full flex items-center gap-3 rounded-2xl border p-3 transition-all active:scale-[0.99] ${
                      done
                        ? "bg-success/10 border-success/40"
                        : "bg-background/40 border-border hover:border-primary/40"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${
                        done ? "bg-gradient-success text-success-foreground" : "bg-card border border-border"
                      }`}
                    >
                      {done ? <Check className="h-5 w-5" strokeWidth={3} /> : i + 1}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold">
                        Série {i + 1}
                        {s.type === "drop" && <span className="ml-2 text-[10px] font-bold text-warning">DROP SET</span>}
                        {s.type === "failure" && <span className="ml-2 text-[10px] font-bold text-destructive">ATÉ FALHA</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {done
                          ? `${log.load}kg × ${log.reps} reps`
                          : `Meta: ${s.reps} reps · Anterior: ${s.prevLoad}kg`}
                      </p>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {done ? "Editar" : "Registrar"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Next CTA */}
        <button
          onClick={next}
          disabled={!currentDone}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold transition-all ${
            currentDone
              ? "bg-gradient-primary text-primary-foreground shadow-glow active:scale-[0.98]"
              : "bg-card text-muted-foreground border border-border cursor-not-allowed"
          }`}
        >
          {currentDone ? (
            <>
              <Check className="h-5 w-5" strokeWidth={3} />
              {currentIdx === workout.exercises.length - 1 ? "FINALIZAR TREINO" : "PRÓXIMO EXERCÍCIO"}
            </>
          ) : (
            "Conclua todas as séries"
          )}
        </button>

        {/* Mini exercise list */}
        <div className="mt-6">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            Próximos
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {workout.exercises.map((e, i) => {
              const exLog = logs[e.id] || {};
              const exDone = e.sets.every((s) => exLog[s.id]?.done);
              return (
                <button
                  key={e.id}
                  onClick={() => setCurrentIdx(i)}
                  className={`shrink-0 rounded-xl border p-2 w-20 text-center transition-all ${
                    i === currentIdx
                      ? "bg-primary text-primary-foreground border-primary"
                      : exDone
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  <div className="text-xl">{e.image}</div>
                  <div className="text-[10px] font-semibold mt-1 line-clamp-1">{e.name.split(" ")[0]}</div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {editing && (
        <SetEditor
          exercise={editing.ex}
          setId={editing.setId}
          initial={logs[editing.ex.id]?.[editing.setId]}
          onClose={() => setEditing(null)}
          onSave={saveSet}
        />
      )}
    </div>
  );
}

function SetEditor({
  exercise,
  setId,
  initial,
  onClose,
  onSave,
}: {
  exercise: Exercise;
  setId: string;
  initial?: SetLog;
  onClose: () => void;
  onSave: (load: number, reps: number, note?: string) => void;
}) {
  const set = exercise.sets.find((s) => s.id === setId)!;
  const [load, setLoad] = useState<number>(initial?.load ?? set.prevLoad ?? 0);
  const [reps, setReps] = useState<number>(initial?.reps ?? parseInt(set.reps) ?? 0);
  const [note, setNote] = useState(initial?.note ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl bg-card border-t border-border p-5 pb-8 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold">Registrar série</h3>
          <button onClick={onClose} className="rounded-full bg-secondary p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{exercise.name}</p>

        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Carga (kg)" value={load} onChange={setLoad} step={2.5} />
          <NumberField label="Repetições" value={reps} onChange={setReps} step={1} />
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Observação
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: fácil, pesado, falhei na última..."
            className="mt-1.5 w-full rounded-xl bg-background border border-input px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <button
          onClick={() => onSave(load, reps, note)}
          className="mt-5 w-full rounded-2xl bg-gradient-primary py-4 font-bold text-primary-foreground shadow-glow active:scale-[0.98]"
        >
          Salvar série
        </button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step: number;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-1 rounded-xl bg-background border border-input p-1">
        <button
          onClick={() => onChange(Math.max(0, +(value - step).toFixed(1)))}
          className="h-10 w-10 rounded-lg bg-secondary text-lg font-bold"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 bg-transparent text-center text-xl font-bold outline-none"
        />
        <button
          onClick={() => onChange(+(value + step).toFixed(1))}
          className="h-10 w-10 rounded-lg bg-primary text-lg font-bold text-primary-foreground"
        >
          +
        </button>
      </div>
    </div>
  );
}

function FinishScreen({
  doneExercises,
  doneSets,
  volume,
  onExit,
}: {
  doneExercises: number;
  doneSets: number;
  volume: number;
  onExit: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-5">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-primary shadow-glow animate-pulse-glow">
          <Trophy className="h-12 w-12 text-primary-foreground" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Treino finalizado!</h1>
        <p className="mt-2 text-muted-foreground">Você arrasou hoje, Dyone 🔥</p>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <ResultStat icon={Dumbbell} value={doneExercises.toString()} label="Exercícios" />
          <ResultStat icon={Timer} value={doneSets.toString()} label="Séries" />
          <ResultStat icon={Flame} value={`${(volume / 1000).toFixed(1)}t`} label="Volume" />
        </div>

        <div className="mt-8 rounded-2xl bg-card border border-border p-4 text-left">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Resumo</p>
          <div className="mt-2 space-y-1.5 text-sm">
            <Row label="Data" value="06/06/2026" />
            <Row label="Tempo total" value="1h 15min" />
            <Row label="Volume total" value={`${volume.toLocaleString("pt-BR")} kg`} />
            <Row label="Streak" value="13 dias 🔥" />
          </div>
        </div>

        <button
          onClick={onExit}
          className="mt-6 w-full rounded-2xl bg-gradient-primary py-4 font-bold text-primary-foreground shadow-glow active:scale-[0.98]"
        >
          Concluir
        </button>
      </div>
    </div>
  );
}

function ResultStat({ icon: Icon, value, label }: { icon: typeof Trophy; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <Icon className="h-5 w-5 text-primary mx-auto mb-1.5" />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
