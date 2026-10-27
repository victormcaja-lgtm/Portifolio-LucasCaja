import { afterAll, describe, expect, it } from "vitest";
import { createTestDb } from "./db";

/**
 * TASK-05: a migração `auth` aplica sobre o banco de teste (global-setup roda
 * `prisma migrate deploy`) e cria as tabelas exigidas pelo Better Auth.
 */
const db = createTestDb();

afterAll(async () => {
  await db.$disconnect();
});

async function columnsOf(table: string): Promise<string[]> {
  const rows = await db.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}`;
  return rows.map((r) => r.column_name);
}

describe("TASK-05: migração de autenticação", () => {
  it("existe uma migração aplicada cujo nome termina em _auth", async () => {
    const rows = await db.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    expect(rows.map((r) => r.migration_name).some((name) => /_auth$/.test(name))).toBe(true);
  });

  it("as tabelas Session, Account, Verification e RateLimit existem, e as antigas continuam", async () => {
    const rows = await db.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    expect(rows.map((r) => r.tablename)).toEqual(
      expect.arrayContaining([
        "User",
        "Category",
        "Project",
        "ProjectCategory",
        "Media",
        "Session",
        "Account",
        "Verification",
        "RateLimit",
      ]),
    );
  });

  it("Session tem token, expiresAt, ipAddress, userAgent e userId", async () => {
    expect(await columnsOf("Session")).toEqual(
      expect.arrayContaining(["id", "token", "expiresAt", "ipAddress", "userAgent", "userId"]),
    );
  });

  it("Session.token é único", async () => {
    const rows = await db.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'Session'`;
    // O PostgreSQL só põe aspas em identificadores que precisam delas: `(token)` ou `("token")`.
    expect(
      rows.some((r) => /UNIQUE/i.test(r.indexdef) && /\(\s*"?token"?\s*\)/.test(r.indexdef)),
    ).toBe(true);
  });

  it("Account tem accountId, providerId, password e userId", async () => {
    expect(await columnsOf("Account")).toEqual(
      expect.arrayContaining(["id", "accountId", "providerId", "password", "userId"]),
    );
  });

  it("Verification tem identifier, value e expiresAt", async () => {
    expect(await columnsOf("Verification")).toEqual(
      expect.arrayContaining(["id", "identifier", "value", "expiresAt"]),
    );
  });

  it("RateLimit tem key, count e lastRequest", async () => {
    expect(await columnsOf("RateLimit")).toEqual(
      expect.arrayContaining(["key", "count", "lastRequest"]),
    );
  });

  it("User mantém os campos existentes (role, banned, emailVerified, image)", async () => {
    expect(await columnsOf("User")).toEqual(
      expect.arrayContaining(["id", "name", "email", "emailVerified", "image", "role", "banned"]),
    );
  });

  it("Session e Account apagam em cascata com o User", async () => {
    const rows = await db.$queryRaw<{ table_name: string; delete_rule: string }[]>`
      SELECT tc.table_name, rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        AND tc.table_name IN ('Session', 'Account')`;
    const byTable = new Map(rows.map((r) => [r.table_name, r.delete_rule]));
    expect(byTable.get("Session")).toBe("CASCADE");
    expect(byTable.get("Account")).toBe("CASCADE");
  });
});
