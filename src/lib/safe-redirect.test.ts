import { describe, expect, it } from "vitest";
import { safeAdminRedirect } from "./safe-redirect";

/**
 * TASK-05: `safeAdminRedirect(next)` aceita só caminhos relativos que começam com /admin
 * (sem //, sem esquema, sem \, sem /admin/entrar e sem /admin/definir-senha). Qualquer outro
 * valor vira /admin (prevenção de open redirect).
 */
describe("safeAdminRedirect — caminhos aceitos", () => {
  it.each([
    "/admin",
    "/admin/",
    "/admin/projetos",
    "/admin/projetos/novo",
    "/admin/projetos?pagina=2",
  ])("aceita %s sem alterações", (next) => {
    expect(safeAdminRedirect(next)).toBe(next);
  });
});

describe("safeAdminRedirect — valores ausentes", () => {
  it.each([null, undefined, ""])("%s → /admin", (next) => {
    expect(safeAdminRedirect(next)).toBe("/admin");
  });
});

describe("safeAdminRedirect — casos maliciosos ou fora do /admin viram /admin", () => {
  it.each([
    // protocolo relativo e esquemas
    "//evil.com",
    "//evil.com/admin",
    "https://evil.com",
    "https://evil.com/admin",
    "http://localhost:3000/admin",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    // barra invertida (navegadores tratam \ como /)
    "/\\evil",
    "/\\evil.com/admin",
    "\\\\evil.com",
    "/admin\\..\\x",
    "/admin/\\evil.com",
    // travessia de diretório
    "/admin/../x",
    "/admin/..",
    "/admin/./../x",
    "/admin/%2e%2e/x",
    "/admin/%2E%2E/x",
    // prefixo parecido
    "/adminx",
    "/admin-x",
    "/administrar",
    "/admin.evil.com",
    // // dentro do caminho
    "/admin//evil.com",
    // outras rotas e relativos
    "/",
    "/trabalhos/estudo-i",
    "admin",
    "admin/projetos",
    "evil.com",
    " /admin",
    // controle: tab/quebra de linha são removidos por navegadores (/\t/evil.com → //evil.com)
    "/\t/evil.com",
    "/admin\n//evil.com",
    // as próprias telas de autenticação
    "/admin/entrar",
    "/admin/entrar/",
    "/admin/entrar?next=/admin",
    "/admin/definir-senha",
    "/admin/definir-senha/",
    "/admin/definir-senha?token=abc",
  ])("%j → /admin", (next) => {
    expect(safeAdminRedirect(next)).toBe("/admin");
  });
});
