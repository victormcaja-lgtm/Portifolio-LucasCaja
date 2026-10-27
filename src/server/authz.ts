import "server-only";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { isRole, ROLES, type Role } from "@/lib/roles";
import { safeAdminRedirect } from "@/lib/safe-redirect";
import { getAuth } from "@/server/auth";

export type { Role } from "@/lib/roles";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Posição de cada papel: quanto menor o índice em ROLES, maior o papel. */
function rank(role: Role): number {
  return ROLES.length - ROLES.indexOf(role);
}

/** OWNER ≥ ADMIN ≥ EDITOR. Um papel desconhecido nunca satisfaz um requisito. */
export function hasRole(userRole: Role, required: Role): boolean {
  if (!isRole(userRole) || !isRole(required)) return false;
  return rank(userRole) >= rank(required);
}

/**
 * Usuário da sessão atual (checagem real, no servidor), com só os campos que a interface usa.
 * Sem sessão, usuário banido ou papel desconhecido → null.
 *
 * Lê os cabeçalhos da requisição: com Cache Components, quem chama precisa estar dentro de um
 * <Suspense> (docs: 02-guides/authentication-with-cache-components.md, "Step 2").
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { id, name, email, role, banned } = session.user;
  if (banned === true || !isRole(role)) return null;
  return { id, name, email, role };
}

/** Exige sessão; sem ela, redireciona para o login com `next` (só destinos seguros do /admin). */
export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const params = new URLSearchParams({ next: safeAdminRedirect(nextPath) });
    redirect(`/admin/entrar?${params.toString()}`);
  }
  return user;
}

/**
 * Exige sessão e papel mínimo. Papel insuficiente → `forbidden()` (403, src/app/admin/forbidden.tsx).
 * Requer `experimental.authInterrupts` no next.config.ts (docs: 04-functions/forbidden.md).
 */
export async function requireRole(required: Role): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasRole(user.role, required)) forbidden();
  return user;
}
