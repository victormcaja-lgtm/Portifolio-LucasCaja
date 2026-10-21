import { afterAll, describe, expect, it } from "vitest";
import { createTestDb } from "./db";

const db = createTestDb();

afterAll(async () => {
  await db.$disconnect();
});

describe("migrações (CA-02)", () => {
  it("CA-02: _prisma_migrations registra ao menos uma migração aplicada", async () => {
    const rows = await db.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    expect(Number(rows[0].count)).toBeGreaterThanOrEqual(1);
  });

  it("CA-02: as tabelas do domínio existem", async () => {
    const rows = await db.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    const names = rows.map((r) => r.tablename);
    expect(names).toEqual(
      expect.arrayContaining(["User", "Category", "Project", "ProjectCategory", "Media"]),
    );
  });
});
