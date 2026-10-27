// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, hasRole, requireRole, requireUser, type Role } from "./authz";

/**
 * TASK-05: `src/server/authz.ts`.
 * - `getAuth()` (src/server/auth.ts) é mockado: `api.getSession({ headers })`.
 * - `headers()` (next/headers) devolve os cabeçalhos da requisição.
 * - `redirect()`/`forbidden()` (next/navigation) lançam erros identificáveis, como no Next.
 */
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  requestHeaders: new Headers({ cookie: "better-auth.session_token=abc" }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  forbidden: vi.fn(() => {
    throw new Error("NEXT_FORBIDDEN");
  }),
}));

vi.mock("@/server/auth", () => ({
  getAuth: () => ({ api: { getSession: mocks.getSession } }),
}));

vi.mock("next/headers", () => ({
  headers: async () => mocks.requestHeaders,
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, redirect: mocks.redirect, forbidden: mocks.forbidden };
});

const ROLES: Role[] = ["OWNER", "ADMIN", "EDITOR"];

function sessionFor(role: string, overrides: Record<string, unknown> = {}) {
  return {
    session: {
      id: "sess_1",
      token: "token-que-nao-deve-aparecer",
      userId: "user_1",
      expiresAt: new Date(Date.now() + 60_000),
    },
    user: {
      id: "user_1",
      name: "Ana Teste",
      email: "ana@exemplo.test",
      emailVerified: true,
      image: null,
      role,
      banned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    },
  };
}

/** Destino do redirect (string), parseado como URL relativa. */
function redirectTarget(): URL {
  expect(mocks.redirect).toHaveBeenCalled();
  const [target] = mocks.redirect.mock.calls.at(-1) as [string];
  return new URL(target, "http://localhost");
}

beforeEach(() => {
  mocks.getSession.mockReset();
  mocks.redirect.mockClear();
  mocks.forbidden.mockClear();
});

describe("hasRole — matriz completa (OWNER ≥ ADMIN ≥ EDITOR)", () => {
  const MATRIX: Array<[Role, Role, boolean]> = [
    ["OWNER", "OWNER", true],
    ["OWNER", "ADMIN", true],
    ["OWNER", "EDITOR", true],
    ["ADMIN", "OWNER", false],
    ["ADMIN", "ADMIN", true],
    ["ADMIN", "EDITOR", true],
    ["EDITOR", "OWNER", false],
    ["EDITOR", "ADMIN", false],
    ["EDITOR", "EDITOR", true],
  ];

  it("a matriz cobre todas as 9 combinações", () => {
    const combos = new Set(MATRIX.map(([a, b]) => `${a}:${b}`));
    expect(combos.size).toBe(ROLES.length * ROLES.length);
  });

  it.each(MATRIX)("hasRole(%s, %s) → %s", (userRole, required, expected) => {
    expect(hasRole(userRole, required)).toBe(expected);
  });

  it("papel desconhecido (vindo do banco) nunca satisfaz um requisito", () => {
    for (const required of ROLES) {
      expect(hasRole("SUPERUSER" as Role, required)).toBe(false);
    }
  });
});

describe("getCurrentUser", () => {
  it("sem sessão → null", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("consulta a sessão com os cabeçalhos da requisição (next/headers)", async () => {
    mocks.getSession.mockResolvedValue(null);
    await getCurrentUser();
    expect(mocks.getSession).toHaveBeenCalledWith(
      expect.objectContaining({ headers: mocks.requestHeaders }),
    );
  });

  it("com sessão → { id, name, email, role } (sem token nem outros campos)", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("ADMIN"));
    await expect(getCurrentUser()).resolves.toEqual({
      id: "user_1",
      name: "Ana Teste",
      email: "ana@exemplo.test",
      role: "ADMIN",
    });
  });

  it("CA-5: usuário banido com sessão ainda válida → null", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("OWNER", { banned: true }));
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

describe("requireUser", () => {
  it("CA-3: sem sessão → redirect para /admin/entrar com next=<caminho>", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(requireUser("/admin/projetos")).rejects.toThrow(/NEXT_REDIRECT/);
    const target = redirectTarget();
    expect(target.pathname).toBe("/admin/entrar");
    expect(target.searchParams.get("next")).toBe("/admin/projetos");
  });

  it("CA-3: sem sessão e caminho /admin → /admin/entrar?next=/admin", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(requireUser("/admin")).rejects.toThrow(/NEXT_REDIRECT/);
    const target = redirectTarget();
    expect(target.pathname).toBe("/admin/entrar");
    expect(target.searchParams.get("next")).toBe("/admin");
  });

  it("sem sessão e sem caminho → redirect para /admin/entrar", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow(/NEXT_REDIRECT/);
    const target = redirectTarget();
    expect(target.pathname).toBe("/admin/entrar");
    expect([null, "/admin"]).toContain(target.searchParams.get("next"));
  });

  it("CA-5: usuário banido → redirect para o login", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("OWNER", { banned: true }));
    await expect(requireUser("/admin")).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectTarget().pathname).toBe("/admin/entrar");
  });

  it("com sessão → devolve o usuário, sem redirect", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("EDITOR"));
    await expect(requireUser("/admin")).resolves.toMatchObject({
      id: "user_1",
      name: "Ana Teste",
      email: "ana@exemplo.test",
      role: "EDITOR",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("requireRole", () => {
  it.each<[Role, Role]>([
    ["OWNER", "OWNER"],
    ["OWNER", "ADMIN"],
    ["ADMIN", "ADMIN"],
    ["ADMIN", "EDITOR"],
    ["EDITOR", "EDITOR"],
  ])("papel %s passa por requireRole(%s)", async (role, required) => {
    mocks.getSession.mockResolvedValue(sessionFor(role));
    await expect(requireRole(required)).resolves.toMatchObject({ id: "user_1", role });
    expect(mocks.forbidden).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  /**
   * CA-4: papel insuficiente → acesso negado (403). A spec permite `forbidden()` ou uma
   * página "Acesso negado"; em ambos os casos `requireRole` não pode devolver o usuário
   * (interrompe a renderização) e não pode mandar de volta para o painel/login.
   */
  it.each<[Role, Role]>([
    ["EDITOR", "ADMIN"],
    ["EDITOR", "OWNER"],
    ["ADMIN", "OWNER"],
  ])("CA-4: papel %s NÃO passa por requireRole(%s) (403)", async (role, required) => {
    mocks.getSession.mockResolvedValue(sessionFor(role));
    await expect(requireRole(required)).rejects.toThrow();
    const usedForbidden = mocks.forbidden.mock.calls.length > 0;
    const redirectTargets = mocks.redirect.mock.calls.map(([url]) => url as string);
    if (!usedForbidden) {
      expect(redirectTargets.length).toBeGreaterThan(0);
      for (const url of redirectTargets) {
        const { pathname } = new URL(url, "http://localhost");
        expect(pathname).not.toBe("/admin");
        expect(pathname).not.toBe("/admin/entrar");
      }
    }
  });

  it("sem sessão → redirect para /admin/entrar (não 403)", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(requireRole("EDITOR")).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectTarget().pathname).toBe("/admin/entrar");
    expect(mocks.forbidden).not.toHaveBeenCalled();
  });
});
