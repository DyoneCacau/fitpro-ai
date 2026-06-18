import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, GraduationCap, Loader2, Search, Users } from "lucide-react";
import {
  QuickAppointmentModal,
  type StudentOption,
} from "@/components/professional/QuickAppointmentModal";
import { StudentListItem } from "@/components/professional/StudentListItem";
import {
  filterStudentsByName,
  HOME_CLIENT_PREVIEW,
  type StudentRow,
} from "@/lib/students";

type Props = {
  personalId: string;
  students: StudentRow[];
  loading?: boolean;
  onAppointmentSaved: () => void;
};

export function StudentDirectorySection({
  personalId,
  students,
  loading,
  onAppointmentSaved,
}: Props) {
  const [search, setSearch] = useState("");
  const [scheduleFor, setScheduleFor] = useState<StudentOption | null>(null);

  const studentOptions: StudentOption[] = students.map((s) => ({
    id: s.id,
    full_name: s.full_name,
  }));

  const filtered = useMemo(
    () => filterStudentsByName(students, search),
    [students, search],
  );

  const isSearching = search.trim().length > 0;
  const visible = isSearching ? filtered.slice(0, 10) : filtered.slice(0, HOME_CLIENT_PREVIEW);
  const hasMore = !isSearching && students.length > HOME_CLIENT_PREVIEW;
  const hiddenCount = students.length - HOME_CLIENT_PREVIEW;
  const searchOverflow = isSearching && filtered.length > visible.length;

  function todayDefaultTime(): string {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    if (d.getHours() >= 18) d.setHours(18, 0, 0, 0);
    else d.setHours(Math.max(d.getHours() + 1, 9), 0, 0, 0);
    return d.toISOString().slice(0, 16);
  }

  return (
    <section className="px-5 pb-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Users className="size-4 text-primary" />
          Meus clientes
          {students.length > 0 && (
            <span className="text-[10px] font-semibold text-muted-foreground">
              ({students.length})
            </span>
          )}
        </h2>
        {hasMore && (
          <Link
            to="/clientes"
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary"
          >
            Ver todos
            <ChevronRight className="size-3.5" />
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : students.length === 0 ? (
        <Link
          to="/perfil"
          search={{ tab: "alunos" }}
          className="block rounded-2xl border border-dashed border-border bg-card/40 p-5 text-center"
        >
          <GraduationCap className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum aluno vinculado ainda.</p>
          <p className="text-xs text-primary mt-2 font-semibold">Convidar aluno</p>
        </Link>
      ) : (
        <>
          {students.length >= HOME_CLIENT_PREVIEW && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente"
                className="field-input pl-9 bg-card text-sm"
              />
            </div>
          )}

          {isSearching && filtered.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-4">
              Nenhum cliente encontrado.
            </p>
          ) : (
            <div className="space-y-2">
              {visible.map((student) => (
                <StudentListItem
                  key={student.id}
                  student={student}
                  subtitle="Anamnese · Treino · Dieta · Agenda"
                  onSchedule={() =>
                    setScheduleFor({ id: student.id, full_name: student.full_name })
                  }
                />
              ))}
            </div>
          )}

          {hasMore && !isSearching && (
            <Link
              to="/clientes"
              className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-border bg-muted/20 py-2.5 text-xs font-semibold text-primary"
            >
              Ver todos ({students.length})
              <ChevronRight className="size-3.5" />
            </Link>
          )}

          {searchOverflow && (
            <Link
              to="/clientes"
              search={{ q: search.trim() }}
              className="mt-3 block text-center text-[11px] font-semibold text-primary"
            >
              +{filtered.length - visible.length} resultados — ver lista completa
            </Link>
          )}

          {!isSearching && hasMore && (
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Mostrando {HOME_CLIENT_PREVIEW} de {students.length}
              {hiddenCount > 0 ? ` · +${hiddenCount} na lista completa` : ""}
            </p>
          )}
        </>
      )}

      {scheduleFor && (
        <QuickAppointmentModal
          personalId={personalId}
          students={studentOptions}
          defaultAlunoId={scheduleFor.id}
          defaultScheduledAt={todayDefaultTime()}
          title={`Agendar · ${scheduleFor.full_name?.trim() || "Aluno"}`}
          onClose={() => setScheduleFor(null)}
          onSaved={() => {
            onAppointmentSaved();
            setScheduleFor(null);
          }}
        />
      )}
    </section>
  );
}
