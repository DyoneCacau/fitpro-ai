const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceito",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export function formatInviteStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatAppRole(role: string | null): string {
  if (!role) return "";
  const labels: Record<string, string> = {
    admin: "Administrador",
    personal: "Profissional",
    aluno: "Aluno",
  };
  return labels[role] ?? role;
}
