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

describe("createOwnerInvite — ambiente", () => {
  it.each(["SEED_OWNER_EMAIL", "SEED_OWNER_NAME"])(
    "sem %s → rejeita citando a variável e não cria usuário",
    async (name) => {
      const sink = vi.fn();
      await expect(
        createOwnerInvite(db, ownerInviteEnv({ [name]: undefined }), sink),
      ).rejects.toThrow(new RegExp(name));
      expect(sink).not.toHaveBeenCalled();
      expect(await db.user.count()).toBe(0);
    },
  );

  it("sem BETTER_AUTH_SECRET → rejeita citando a variável, sem vazar valores", async () => {
    const sink = vi.fn();
    const error = await createOwnerInvite(
      db,
      ownerInviteEnv({ BETTER_AUTH_SECRET: undefined }),
      sink,
    ).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/BETTER_AUTH_SECRET/);
    expect(sink).not.toHaveBeenCalled();
  });
});
