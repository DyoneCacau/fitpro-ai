export function formatProfessionalSpecialties(
  isPersonalTrainer: boolean,
  isNutritionist: boolean,
): string {
  const parts: string[] = [];
  if (isPersonalTrainer) parts.push("Personal Trainer");
  if (isNutritionist) parts.push("Nutricionista");
  return parts.length > 0 ? parts.join(" · ") : "Profissional";
}

export function formatProfessionalRegistry(
  registryType: "cref" | "crn" | null | undefined,
  registryNumber: string | null | undefined,
): string | null {
  if (!registryType || !registryNumber) return null;
  const label = registryType === "cref" ? "CREF" : "CRN";
  return `${label} ${registryNumber}`;
}
