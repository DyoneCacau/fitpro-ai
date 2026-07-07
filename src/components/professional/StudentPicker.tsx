import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyStudents } from "@/lib/students";

const storageKey = (userId: string) => `fitpro-selected-student-${userId}`;

export function useSelectedStudent() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["myStudents", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchMyStudents(),
  });

  useEffect(() => {
    if (!user?.id || students.length === 0) {
      setSelectedId(null);
      return;
    }

    const saved = localStorage.getItem(storageKey(user.id));
    const valid = students.some((s) => s.id === saved);
    setSelectedId(valid ? saved : students[0].id);
  }, [user?.id, students]);

  function selectStudent(id: string) {
    setSelectedId(id);
    if (user?.id) localStorage.setItem(storageKey(user.id), id);
  }

  const selected = students.find((s) => s.id === selectedId) ?? null;

  return { students, selected, selectedId, selectStudent, isLoading };
}

interface Props {
  subtitle?: string;
  students: Array<{ id: string; full_name: string | null }>;
  selectedId: string | null;
  selectedName: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
}

export function StudentPicker({
  subtitle,
  students,
  selectedId,
  selectedName,
  isLoading,
  onSelect,
}: Props) {
  if (isLoading) {
    return (
      <div className="px-5 pt-4 flex justify-center">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="mx-5 mt-4 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
        <Users className="size-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-semibold">Nenhum aluno vinculado</p>
        <p className="text-xs text-muted-foreground mt-1">
          Convide alunos em Meus alunos para montar treinos e dietas.
        </p>
        <Link to="/alunos" className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-3">
          Ir para Alunos <ChevronRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Aluno selecionado</p>
          <p className="text-base font-bold mt-0.5">{selectedName ?? "Aluno"}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {selectedId && (
          <Link
            to="/alunos/$alunoId"
            params={{ alunoId: selectedId }}
            className="text-xs text-primary font-medium shrink-0"
          >
            Cadastro completo
          </Link>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:flex-wrap md:overflow-visible">
        {students.map((student) => {
          const active = student.id === selectedId;
          return (
            <button
              key={student.id}
              type="button"
              onClick={() => onSelect(student.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {student.full_name ?? "Aluno"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
