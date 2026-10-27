/** Papéis da área administrativa, do maior para o menor (OWNER ≥ ADMIN ≥ EDITOR). */
export const ROLES = ["OWNER", "ADMIN", "EDITOR"] as const;

export type Role = (typeof ROLES)[number];

const LABELS: Record<Role, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  EDITOR: "Editor",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Nome do papel em português, para exibir na interface. */
export function roleLabel(role: Role): string {
  return LABELS[role];
}
