import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { StudentPicker, useSelectedStudent } from "./StudentPicker";

interface Props {
  subtitle: string;
  children: (ctx: { alunoId: string; personalId: string }) => ReactNode;
}

export function ProfessionalStudentWorkspace({ subtitle, children }: Props) {
  const { user } = useAuth();
  const { students, selected, selectedId, selectStudent, isLoading } = useSelectedStudent();

  if (!user) return null;

  return (
    <>
      <StudentPicker
        subtitle={subtitle}
        students={students}
        selectedId={selectedId}
        selectedName={selected?.full_name ?? null}
        isLoading={isLoading}
        onSelect={selectStudent}
      />
      {!isLoading && selectedId && selected && (
        <div className="px-5 py-5 pb-10 md:px-8">
          {children({ alunoId: selectedId, personalId: user.id })}
        </div>
      )}
    </>
  );
}
