import { createAuthClient } from "better-auth/react";

/**
 * Cliente do Better Auth para Client Components (signIn.email, resetPassword, signOut).
 * Sem baseURL: no navegador usa a origem da página + /api/auth (mesmo domínio do site).
 */
export const authClient = createAuthClient();
