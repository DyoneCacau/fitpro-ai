import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/alunos")({
  beforeLoad: ({ location }) => {
    const path = location.pathname.replace(/\/$/, "");
    if (path === "/alunos") {
      throw redirect({ to: "/perfil", search: { tab: "alunos" } });
    }
  },
  component: AlunosLayout,
});

function AlunosLayout() {
  return <Outlet />;
}
