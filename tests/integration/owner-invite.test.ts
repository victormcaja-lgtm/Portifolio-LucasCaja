import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTestAuthEnv, ownerInviteEnv, TEST_AUTH_ENV, tokenFromLink } from "./auth-helpers";
import { createTestDb, resetDb } from "./db";

/**
 * TASK-05: `createOwnerInvite(db, env, sink)` em scripts/owner-invite.ts.
 * - `sink(link: string)` recebe o link `<baseURL>/admin/definir-senha?token=…` (único, 60 min);
 * - cria o OWNER se não existir; se existir, garante OWNER e banned=false;
 * - nunca rebaixa ninguém nem altera outros usuários.
 * Importar o script não pode executar o `main`.
 */
applyTestAuthEnv();

const db = createTestDb();
const OWNER_EMAIL = "dono@exemplo.test";
const LINK_PATTERN = new RegExp(
  `^${TEST_AUTH_ENV.BETTER_AUTH_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/admin/definir-senha\\?token=[^&\\s]+$`,
);

type InviteModule = typeof import("../../scripts/owner-invite");
let createOwnerInvite: InviteModule["createOwnerInvite"];

async function invite(env = ownerInviteEnv()): Promise<string> {
  const links: string[] = [];
  await createOwnerInvite(db, env, (link: string) => {
    links.push(link);
  });
  expect(links).toHaveLength(1);
  return links[0] as string;
}

beforeAll(async () => {
  ({ createOwnerInvite } = await import("../../scripts/owner-invite"));
});

beforeEach(async () => {
  await resetDb(db);
});

afterAll(async () => {
  await db.$disconnect();
});

describe("createOwnerInvite — criação e idempotência (CA-1, CA-2)", () => {
  it("cria o usuário OWNER, não banido, com nome e e-mail do ambiente", async () => {
    await invite();
    const users = await db.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      email: OWNER_EMAIL,
      name: "Dono de Teste",
      role: "OWNER",
      banned: false,
    });
  });

  it("não define senha nenhuma (a senha vem só pelo link)", async () => {
    await invite();
    const accounts = await db.account.findMany({ where: { password: { not: null } } });
    expect(accounts).toHaveLength(0);
  });

  it("é idempotente: rodar duas vezes mantém um único usuário", async () => {
    await invite();
    await invite();
    expect(await db.user.count({ where: { email: OWNER_EMAIL } })).toBe(1);
    expect(await db.user.count()).toBe(1);
  });

  it("promove um usuário existente (EDITOR banido) a OWNER e desbane, sem afetar outros", async () => {
    await db.user.create({
      data: { email: OWNER_EMAIL, name: "Nome Antigo", role: "EDITOR", banned: true },
    });
    const admin = await db.user.create({
      data: { email: "admin@exemplo.test", name: "Admin", role: "ADMIN", banned: false },
    });
    const bannedEditor = await db.user.create({
      data: { email: "editor@exemplo.test", name: "Editor", role: "EDITOR", banned: true },
    });

    await invite();

    const owner = await db.user.findUniqueOrThrow({ where: { email: OWNER_EMAIL } });
    expect(owner.role).toBe("OWNER");
    expect(owner.banned).toBe(false);
    expect(await db.user.findUniqueOrThrow({ where: { id: admin.id } })).toMatchObject({
      role: "ADMIN",
      banned: false,
      name: "Admin",
    });
    expect(await db.user.findUniqueOrThrow({ where: { id: bannedEditor.id } })).toMatchObject({
      role: "EDITOR",
      banned: true,
      name: "Editor",
    });
    expect(await db.user.count()).toBe(3);
  });

  it("um OWNER existente continua OWNER (nunca rebaixa)", async () => {
    await db.user.create({ data: { email: OWNER_EMAIL, name: "Dono", role: "OWNER" } });
    await invite();
    expect((await db.user.findUniqueOrThrow({ where: { email: OWNER_EMAIL } })).role).toBe("OWNER");
  });
});

describe("createOwnerInvite — link de uso único (CA-2, CA-8)", () => {
  it("entrega ao sink um único link <baseURL>/admin/definir-senha?token=…", async () => {
    const link = await invite();
    expect(link).toMatch(LINK_PATTERN);
    expect(link).not.toContain("/api/auth/");
  });

  it("o token do link está registrado e expira em 60 minutos", async () => {
    const before = Date.now();
    const token = tokenFromLink(await invite());
    const verification = await db.verification.findFirst({
      where: { identifier: { contains: token } },
    });
    expect(verification).not.toBeNull();
    const ttl = (verification as { expiresAt: Date }).expiresAt.getTime() - before;
    expect(ttl).toBeGreaterThan(58 * 60_000);
    expect(ttl).toBeLessThanOrEqual(61 * 60_000);
  });

  it("cada execução gera um token diferente", async () => {
    const first = tokenFromLink(await invite());
    const second = tokenFromLink(await invite());
    expect(first).not.toBe(second);
  });

  it("não escreve o link nem o token no console", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    try {
      const token = tokenFromLink(await invite());
      const logged = spies
        .flatMap((s) => s.mock.calls.flat())
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join("\n");
      expect(logged).not.toContain(token);
    } finally {
      for (const s of spies) s.mockRestore();
    }
  });
});

/**
 * Ciclo 1 da spec ("Script do OWNER"): o script NÃO exige BETTER_AUTH_SECRET. Para garantir que
 * ele não "pega emprestado" o segredo de `process.env` (definido por applyTestAuthEnv), esses
 * testes também o removem do ambiente do processo enquanto rodam.
 */
async function withoutProcessSecret<T>(fn: () => Promise<T>): Promise<T> {
  const saved = process.env.BETTER_AUTH_SECRET;
  delete process.env.BETTER_AUTH_SECRET;
  try {
    return await fn();
  } finally {
    process.env.BETTER_AUTH_SECRET = saved;
  }
}

const NO_SECRET = { BETTER_AUTH_SECRET: undefined };

async function errorOf(promise: Promise<unknown>): Promise<Error | null> {
  return promise.then(
    () => null,
    (e: unknown) => e as Error,
  );
}

describe("createOwnerInvite — ambiente", () => {
  describe.each([
    ["com BETTER_AUTH_SECRET", {}],
    ["sem BETTER_AUTH_SECRET", NO_SECRET],
  ] as const)("%s", (_label, base) => {
    it.each(["SEED_OWNER_EMAIL", "SEED_OWNER_NAME"])(
      "sem %s → rejeita citando a variável e não cria usuário",
      async (name) => {
        const sink = vi.fn();
        await withoutProcessSecret(async () => {
          await expect(
            createOwnerInvite(db, ownerInviteEnv({ ...base, [name]: undefined }), sink),
          ).rejects.toThrow(new RegExp(name));
        });
        expect(sink).not.toHaveBeenCalled();
        expect(await db.user.count()).toBe(0);
      },
    );

    it("sem BETTER_AUTH_URL nem VERCEL_URL → rejeita citando BETTER_AUTH_URL e não cria usuário", async () => {
      const sink = vi.fn();
      const error = await withoutProcessSecret(() =>
        errorOf(
          createOwnerInvite(
            db,
            ownerInviteEnv({ ...base, BETTER_AUTH_URL: undefined, VERCEL_URL: undefined }),
            sink,
          ),
        ),
      );
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/BETTER_AUTH_URL/);
      expect((error as Error).message).not.toContain(TEST_AUTH_ENV.BETTER_AUTH_SECRET);
      expect(sink).not.toHaveBeenCalled();
      expect(await db.user.count()).toBe(0);
    });

    it("sem BETTER_AUTH_URL, usa VERCEL_URL (https) para montar o link", async () => {
      const link = await withoutProcessSecret(() =>
        invite(
          ownerInviteEnv({
            ...base,
            BETTER_AUTH_URL: undefined,
            VERCEL_URL: "projeto-abc123.vercel.app",
          }),
        ),
      );
      expect(link).toMatch(
        /^https:\/\/projeto-abc123\.vercel\.app\/admin\/definir-senha\?token=[^&\s]+$/,
      );
    });
  });

  it("sem BETTER_AUTH_SECRET (nem no processo) → cria o OWNER e entrega o link", async () => {
    const link = await withoutProcessSecret(() => invite(ownerInviteEnv(NO_SECRET)));
    expect(link).toMatch(LINK_PATTERN);
    expect(await db.user.findUniqueOrThrow({ where: { email: OWNER_EMAIL } })).toMatchObject({
      role: "OWNER",
      banned: false,
    });
    const token = tokenFromLink(link);
    expect(
      await db.verification.count({ where: { identifier: { contains: token } } }),
    ).toBe(1);
  });

  it("sem BETTER_AUTH_SECRET → não escreve o token no console", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    try {
      const token = tokenFromLink(
        await withoutProcessSecret(() => invite(ownerInviteEnv(NO_SECRET))),
      );
      const logged = spies
        .flatMap((s) => s.mock.calls.flat())
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join("\n");
      expect(logged).not.toContain(token);
    } finally {
      for (const s of spies) s.mockRestore();
    }
  });

  it("com BETTER_AUTH_SECRET → o link não contém nem expõe o segredo", async () => {
    const link = await invite();
    const decoded = decodeURIComponent(link);
    expect(decoded).not.toContain(TEST_AUTH_ENV.BETTER_AUTH_SECRET);
    expect(link).not.toContain(encodeURIComponent(TEST_AUTH_ENV.BETTER_AUTH_SECRET));
    expect(decoded).not.toContain(Buffer.from(TEST_AUTH_ENV.BETTER_AUTH_SECRET).toString("base64"));
    // Só o parâmetro token, e ele não é o segredo.
    expect([...new URL(link).searchParams.keys()]).toEqual(["token"]);
    expect(tokenFromLink(link)).not.toContain(TEST_AUTH_ENV.BETTER_AUTH_SECRET);
  });
});

/**
 * Ciclo de correção 2, item 9: um link novo invalida os anteriores do mesmo OWNER, sem apagar
 * tokens de outros usuários. O consumo usa o Better Auth real do app (`getAuth()`).
 */
describe("ciclo 2, item 9: link novo invalida os anteriores", () => {
  const NEW_PASSWORD = "senha-nova-bem-longa-2026";

  async function appAuth() {
    const { getAuth } = await import("../../src/server/auth");
    return getAuth();
  }

  it("o token do link anterior é recusado pelo resetPassword; o novo funciona", async () => {
    const oldToken = tokenFromLink(await invite());
    const newToken = tokenFromLink(await invite());
    expect(oldToken).not.toBe(newToken);
    expect(await db.verification.count({ where: { identifier: { contains: oldToken } } })).toBe(0);

    const auth = await appAuth();
    const error = await errorOf(
      auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token: oldToken } }),
    );
    expect(error).not.toBeNull();
    await expect(
      auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token: newToken } }),
    ).resolves.toMatchObject({ status: true });
  });

  it("tokens de outros usuários (e outras verificações) não são apagados", async () => {
    const other = await db.user.create({
      data: { email: "editor@exemplo.test", name: "Editor", role: "EDITOR" },
    });
    const expiresAt = new Date(Date.now() + 30 * 60_000);
    const otherReset = await db.verification.create({
      data: { identifier: "reset-password:token-do-outro-usuario", value: other.id, expiresAt },
    });
    const unrelated = await db.verification.create({
      data: { identifier: "email-verification:qualquer", value: "valor-qualquer", expiresAt },
    });

    await invite();
    await invite();

    expect(await db.verification.findUnique({ where: { id: otherReset.id } })).not.toBeNull();
    expect(await db.verification.findUnique({ where: { id: unrelated.id } })).not.toBeNull();
  });

  it("o token real de outro usuário continua válido depois de um novo link do OWNER", async () => {
    await db.user.create({
      data: { email: "editor@exemplo.test", name: "Editor", role: "EDITOR" },
    });
    const auth = await appAuth();
    const { setResetLinkSink } = await import("../../src/server/auth");
    let otherToken = "";
    setResetLinkSink(({ token }) => {
      otherToken = token;
    });
    try {
      await auth.api.requestPasswordReset({
        body: { email: "editor@exemplo.test", redirectTo: "/admin/definir-senha" },
      });
    } finally {
      setResetLinkSink(null);
    }
    expect(otherToken).not.toBe("");

    await invite();

    await expect(
      auth.api.resetPassword({ body: { newPassword: NEW_PASSWORD, token: otherToken } }),
    ).resolves.toMatchObject({ status: true });
  });
});
