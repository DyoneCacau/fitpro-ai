import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { StudentDietPanel } from "@/components/professional/StudentDietPanel";
import {
  cloneDietPlan,
  createEmptyDietTemplate,
  deleteDietTemplate,
  fetchDietTemplates,
  getDietErrorMessage,
} from "@/lib/diet";
import { useAuth } from "@/hooks/use-auth";
import { useSelectedStudent } from "./StudentPicker";

export function DietTemplateLibrary() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { students, selectedId } = useSelectedStudent();
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [cloneTarget, setCloneTarget] = useState<{ id: string; name: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["dietTemplates", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchDietTemplates(user!.id),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["dietTemplates", user?.id] });

  const remove = useMutation({
    mutationFn: deleteDietTemplate,
    onSuccess: () => {
      setOpenedId(null);
      invalidate();
    },
  });

  async function createTemplate() {
    if (!user || !newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const id = await createEmptyDietTemplate(user.id, newName.trim());
      setNewName("");
      invalidate();
      setOpenedId(id);
    } catch (err) {
      setError(getDietErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function applyToStudent(templateId: string, alunoId: string) {
    setError(null);
    try {
      await cloneDietPlan({ sourcePlanId: templateId, targetAlunoId: alunoId });
      setCloneTarget(null);
    } catch (err) {
      setError(getDietErrorMessage(err));
    }
  }

  if (!user) return null;

  if (openedId) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setOpenedId(null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar à biblioteca
        </button>
        <StudentDietPanel personalId={user.id} templatePlanId={openedId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-hero border border-border px-4 py-3">
        <h2 className="text-base font-bold">Biblioteca de Planos Alimentares</h2>
        <p className="text-[11px] text-muted-foreground mt-1">
          Crie modelos reutilizáveis e aplique nos alunos.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do novo modelo"
          className="field-input flex-1"
        />
        <button
          type="button"
          disabled={creating || !newName.trim()}
          onClick={() => void createTemplate()}
          className="shrink-0 rounded-xl bg-primary px-3 py-2 text-primary-foreground"
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {isLoading ? (
        <Loader2 className="size-5 animate-spin text-primary mx-auto" />
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum modelo ainda. Crie um acima ou salve um plano de aluno como modelo.
        </p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => setOpenedId(t.id)} className="text-left flex-1">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t.kcal_target} kcal · P{t.protein_g} · C{t.carbs_g} · G{t.fat_g}
                  </p>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCloneTarget({ id: t.id, name: t.name })}
                    className="text-[10px] font-bold text-primary"
                  >
                    Aplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(t.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {cloneTarget && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-4">
            <h3 className="text-sm font-bold">Aplicar &quot;{cloneTarget.name}&quot;</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Selecione o aluno</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => void applyToStudent(cloneTarget.id, s.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                    selectedId === s.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  {s.full_name ?? "Aluno"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCloneTarget(null)}
              className="mt-3 text-xs text-muted-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
