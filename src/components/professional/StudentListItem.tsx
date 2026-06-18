import { Link } from "@tanstack/react-router";
import { CalendarClock, ChevronRight } from "lucide-react";
import type { StudentRow } from "@/lib/students";

type Props = {
  student: StudentRow;
  onSchedule: () => void;
  subtitle?: string;
};

export function StudentListItem({ student, onSchedule, subtitle }: Props) {
  const name = student.full_name?.trim() || "Aluno";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex items-stretch">
      <Link
        to="/alunos/$alunoId"
        params={{ alunoId: student.id }}
        className="flex flex-1 items-center gap-3 px-4 py-3 min-w-0 active:bg-muted/30"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold text-sm">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
      <button
        type="button"
        onClick={onSchedule}
        className="flex flex-col items-center justify-center gap-0.5 border-l border-border px-3 text-primary hover:bg-primary/5 shrink-0"
        aria-label={`Agendar com ${name}`}
      >
        <CalendarClock className="size-4" />
        <span className="text-[9px] font-bold">Agendar</span>
      </button>
    </div>
  );
}
