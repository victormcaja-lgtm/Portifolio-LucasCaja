const FALLBACK = "/admin";

/** Telas de autenticação: voltar para elas depois do login não faz sentido (e criaria laços). */
const AUTH_PAGES = ["/admin/entrar", "/admin/definir-senha"];

// Caracteres de controle (navegadores removem tab e quebras de linha: "/\t/evil.com" vira
// "//evil.com") e barra invertida (tratada como "/" pelos navegadores).
const FORBIDDEN_CHARS = /[\u0000-\u001F\u007F\\]/;

const PARSE_BASE = "http://destino.invalid";

/**
 * Destino seguro depois do login (prevenção de open redirect). Aceita só caminhos relativos do
 * próprio site dentro de /admin, sem "//", esquema, "\", caracteres de controle, segmentos "." ou
 * ".." (mesmo codificados) e sem as telas de autenticação. Qualquer outro valor vira "/admin".
 */
export function safeAdminRedirect(next: string | null | undefined): string {
  if (typeof next !== "string" || next === "") return FALLBACK;
  if (FORBIDDEN_CHARS.test(next)) return FALLBACK;
  if (next !== "/admin" && !next.startsWith("/admin/") && !next.startsWith("/admin?") && !next.startsWith("/admin#")) {
    return FALLBACK;
  }

  const rawPath = next.split(/[?#]/, 1)[0] ?? "";
  if (rawPath.includes("//")) return FALLBACK;

  let url: URL;
  try {
    url = new URL(next, PARSE_BASE);
  } catch {
    return FALLBACK;
  }
  if (url.origin !== PARSE_BASE) return FALLBACK;
  // O parser resolve "." e ".." (inclusive "%2e%2e"); se o caminho mudou, havia travessia.
  if (url.pathname !== rawPath) return FALLBACK;

  const path = rawPath.replace(/\/+$/, "");
  if (AUTH_PAGES.some((page) => path === page || path.startsWith(`${page}/`))) return FALLBACK;

  return next;
}
