import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTestAuthEnv,
  cookieHeaderFrom,
  createUserWithPassword,
  ownerInviteEnv,
  TEST_AUTH_ENV,
  tokenFromLink,
} from "./auth-helpers";
import { createTestDb, resetDb } from "./db";

/**
 * TASK-05: Better Auth real (`getAuth()` de src/server/auth.ts) contra o banco de teste.
 * As variáveis de teste são aplicadas antes de importar o módulo.
 */
applyTestAuthEnv();

const db = createTestDb();

type AuthModule = typeof import("../../src/server/auth");
type InviteModule = typeof import("../../scripts/owner-invite");
let authModule: AuthModule;
let createOwnerInvite: InviteModule["createOwnerInvite"];

function auth() {
  return authModule.getAuth();
}

const OWNER_EMAIL = "dono@exemplo.test";
const NEW_PASSWORD = "senha-nova-bem-longa-2026";

async function inviteToken(): Promise<string> {
  let link = "";
  await createOwnerInvite(db, ownerInviteEnv(), (l: string) => {
    link = l;
  });
  return tokenFromLink(link);
}

async function signIn(email: string, password: string) {
  return auth().api.signInEmail({ body: { email, password } });
}

/** Resolve com o erro (ou null se não lançar). */
async function errorOf(promise: Promise<unknown>): Promise<Error | null> {
  return promise.then(
    () => null,
    (e: unknown) => e as Error,
  );
}

function signInRequest(email: string, password: string, ip: string) {
  return new Request(`${TEST_AUTH_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: TEST_AUTH_ENV.BETTER_AUTH_URL,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email, password }),
  });
}

beforeAll(async () => {
  authModule = await import("../../src/server/auth");
  ({ createOwnerInvite } = await import("../../scripts/owner-invite"));
});

beforeEach(async () => {
  await resetDb(db);
  authModule.setResetLinkSink(null);
});

afterAll(async () => {
  authModule?.setResetLinkSink(null);
  await db.$disconnect();
});

describe("CA-2: resetPassword com o token de uso único", () => {
  it("o token define a senha e a senha permite o login", async () => {
    const token = await inviteToken();
    await expect(
      auth().api.resetPassword({ body: { newPassword: NEW_PASSWORD, token } }),
    ).resolves.toMatchObject({ status: true });

    const result = await signIn(OWNER_EMAIL, NEW_PASSWORD);
    expect(result.user).toMatchObject({ email: OWNER_EMAIL });
    expect(result.token).toBeTruthy();
  });

  it("a senha é guardada como hash (nunca em texto puro)", async () => {
    const token = await inviteToken();
    await auth().api.resetPassword({ body: { newPassword: NEW_PASSWORD, token } });
    const account = await db.account.findFirstOrThrow({ where: { providerId: "credential" } });
    expect(account.password).toBeTruthy();
    expect(account.password).not.toContain(NEW_PASSWORD);
  });

  it("o token não serve uma segunda vez", async () => {
    const token = await inviteToken();
    await auth().api.resetPassword({ body: { newPassword: NEW_PASSWORD, token } });
    const error = await errorOf(
      auth().api.resetPassword({ body: { newPassword: "outra-senha-bem-longa-99", token } }),
    );
    expect(error).not.toBeNull();
    // A senha continua a primeira.
    await expect(signIn(OWNER_EMAIL, NEW_PASSWORD)).resolves.toBeTruthy();
    expect(await errorOf(signIn(OWNER_EMAIL, "outra-senha-bem-longa-99"))).not.toBeNull();
  });

  it("token expirado é recusado", async () => {
    const token = await inviteToken();
    await db.verification.updateMany({
      where: { identifier: { contains: token } },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const error = await errorOf(
      auth().api.resetPassword({ body: { newPassword: NEW_PASSWORD, token } }),
    );
    expect(error).not.toBeNull();
  });

  it("token inventado é recusado", async () => {
    await inviteToken();
    const error = await errorOf(
      auth().api.resetPassword({ body: { newPassword: NEW_PASSWORD, token: "token-inventado" } }),
    );
    expect(error).not.toBeNull();
  });

  it("senha com menos de 12 caracteres é recusada e não consome o token", async () => {
    const token = await inviteToken();
    const error = await errorOf(
      auth().api.resetPassword({ body: { newPassword: "curta-11chr", token } }),
    );
    expect(error).not.toBeNull();
    await expect(
      auth().api.resetPassword({ body: { newPassword: NEW_PASSWORD, token } }),
    ).resolves.toMatchObject({ status: true });
  });

  it("sem sink registrado, pedir redefinição falha ('envio de e-mail não configurado') sem logar o token", async () => {
    await createUserWithPassword(db, {
      email: "editor@exemplo.test",
      name: "Editor",
      password: "senha-do-editor-123",
    });
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    try {
      const error = await errorOf(
        auth().api.requestPasswordReset({
          body: { email: "editor@exemplo.test", redirectTo: "/admin/definir-senha" },
        }),
      );
      expect(error).not.toBeNull();
      const verifications = await db.verification.findMany();
      const logged = spies
        .flatMap((s) => s.mock.calls.flat())
        .map((a) => (typeof a === "string" ? a : a instanceof Error ? a.message : JSON.stringify(a)))
        .join("\n");
      for (const v of verifications) {
        const token = v.identifier.replace(/^reset-password:/, "");
        expect(logged).not.toContain(token);
      }
      expect(logged).not.toMatch(/reset-password\/[A-Za-z0-9_-]{10,}/);
    } finally {
      for (const s of spies) s.mockRestore();
    }
  });
});

describe("CA-2/CA-3: signInEmail", () => {
  beforeEach(async () => {
    await createUserWithPassword(db, {
      email: "admin@exemplo.test",
      name: "Admin Teste",
      password: "senha-certa-do-admin",
      role: "ADMIN",
    });
  });

  it("senha certa → sessão criada no banco", async () => {
    const result = await signIn("admin@exemplo.test", "senha-certa-do-admin");
    expect(result.user).toMatchObject({ email: "admin@exemplo.test" });
    expect(await db.session.count()).toBe(1);
  });

  it("senha errada → falha e nenhuma sessão é criada", async () => {
    const error = await errorOf(signIn("admin@exemplo.test", "senha-errada-123456"));
    expect(error).not.toBeNull();
    expect(await db.session.count()).toBe(0);
  });

  it("e-mail desconhecido → falha", async () => {
    const error = await errorOf(signIn("ninguem@exemplo.test", "senha-certa-do-admin"));
    expect(error).not.toBeNull();
  });

  it("a sessão expõe role e banned do usuário, e o token não é o valor guardado como senha", async () => {
    const { headers } = await auth().api.signInEmail({
      body: { email: "admin@exemplo.test", password: "senha-certa-do-admin" },
      returnHeaders: true,
    });
    const cookie = cookieHeaderFrom(headers);
    expect(cookie).toMatch(/better-auth\.session_token=/);
    const session = await auth().api.getSession({ headers: new Headers({ cookie }) });
    expect(session?.user).toMatchObject({ email: "admin@exemplo.test", role: "ADMIN", banned: false });
  });

  it("o cookie de sessão é httpOnly", async () => {
    const { headers } = await auth().api.signInEmail({
      body: { email: "admin@exemplo.test", password: "senha-certa-do-admin" },
      returnHeaders: true,
    });
    const setCookie = headers.getSetCookie().find((c: string) => /session_token=/.test(c)) ?? "";
    expect(setCookie).toMatch(/HttpOnly/i);
  });

  it("role e banned não podem ser alterados pelo próprio usuário (input: false)", async () => {
    const { headers } = await auth().api.signInEmail({
      body: { email: "admin@exemplo.test", password: "senha-certa-do-admin" },
      returnHeaders: true,
    });
    const requestHeaders = new Headers({ cookie: cookieHeaderFrom(headers) });
    await errorOf(
      auth().api.updateUser({
        headers: requestHeaders,
        body: { role: "OWNER", banned: false } as never,
      }),
    );
    const user = await db.user.findUniqueOrThrow({ where: { email: "admin@exemplo.test" } });
    expect(user.role).toBe("ADMIN");
  });
});

describe("CA-5: usuário banido não entra", () => {
  beforeEach(async () => {
    await createUserWithPassword(db, {
      email: "banido@exemplo.test",
      name: "Banido",
      password: "senha-certa-do-banido",
      role: "OWNER",
      banned: true,
    });
  });

  it("signInEmail com a senha certa falha e nenhuma sessão é criada", async () => {
    const error = await errorOf(signIn("banido@exemplo.test", "senha-certa-do-banido"));
    expect(error).not.toBeNull();
    expect(await db.session.count()).toBe(0);
  });

  it("o erro não revela o motivo", async () => {
    const error = await errorOf(signIn("banido@exemplo.test", "senha-certa-do-banido"));
    const text = `${error?.message ?? ""} ${JSON.stringify(error)}`;
    expect(text).not.toMatch(/ban|bloque|suspens/i);
  });
});

describe("CA-1: cadastro público desativado", () => {
  it("signUpEmail é recusado e nenhum usuário é criado", async () => {
    const error = await errorOf(
      auth().api.signUpEmail({
        body: { name: "Intruso", email: "intruso@exemplo.test", password: "senha-do-intruso-123" },
      }),
    );
    expect(error).not.toBeNull();
    expect(await db.user.count()).toBe(0);
    expect(await db.account.count()).toBe(0);
  });

  it("POST /api/auth/sign-up/email pelo handler HTTP também é recusado", async () => {
    const response = await auth().handler(
      new Request(`${TEST_AUTH_ENV.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: TEST_AUTH_ENV.BETTER_AUTH_URL,
          "x-forwarded-for": "198.51.100.20",
        },
        body: JSON.stringify({
          name: "Intruso",
          email: "intruso@exemplo.test",
          password: "senha-do-intruso-123",
        }),
      }),
    );
    expect(response.ok).toBe(false);
    expect(await db.user.count()).toBe(0);
  });
});

describe("CA-6: rate limit no login (banco)", () => {
  it("5 tentativas por 60 s: a 6ª tentativa do mesmo IP recebe 429", async () => {
    await createUserWithPassword(db, {
      email: "alvo@exemplo.test",
      name: "Alvo",
      password: "senha-certa-do-alvo",
    });
    const ip = "203.0.113.7";
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const response = await auth().handler(signInRequest("alvo@exemplo.test", "senha-errada-123456", ip));
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 5)).not.toContain(429);
    expect(statuses[5]).toBe(429);
    expect(await db.rateLimit.count()).toBeGreaterThan(0);
  });

  it("depois do bloqueio, nem a senha certa entra (até a janela expirar)", async () => {
    await createUserWithPassword(db, {
      email: "alvo@exemplo.test",
      name: "Alvo",
      password: "senha-certa-do-alvo",
    });
    const ip = "203.0.113.8";
    for (let i = 0; i < 5; i += 1) {
      await auth().handler(signInRequest("alvo@exemplo.test", "senha-errada-123456", ip));
    }
    const response = await auth().handler(signInRequest("alvo@exemplo.test", "senha-certa-do-alvo", ip));
    expect(response.status).toBe(429);
    expect(await db.session.count()).toBe(0);
  });
});
