import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { StudentTrackingHub } from "@/components/student/tracking/StudentTrackingHub";

export const Route = createFileRoute("/acompanhamento")({
  head: () => ({ meta: [{ title: "Acompanhamento — FitPro AI" }] }),
  component: () => (
    <AuthGate allowedRoles={["aluno"]}>
      <AppShell>
        <StudentTrackingHub />
      </AppShell>
    </AuthGate>
  ),
});
