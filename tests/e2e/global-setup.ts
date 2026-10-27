import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Client } from "pg";
import { E2E_DATABASE_URL, E2E_OWNER } from "./auth-fixtures";

/**
 * TASK-05: cria (ou atualiza) o OWNER de teste `e2e-owner@exemplo.test` com uma senha conhecida,
 * usando o hasher do Better Auth, no banco LOCAL do E2E. Também limpa as sessões desse usuário e
 * a tabela de rate limit (as tentativas de login de uma execução anterior não podem bloquear a
 * próxima).
 *
 * Usa SQL direto (pg) sobre os modelos do Better Auth no Prisma, sem @@map: "User", "Account",
 * "Session", "RateLimit". Recusa qualquer banco que não seja local.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function assertLocal(url: string): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("E2E_DATABASE_URL inválida (não é uma URL).");
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error("O global setup do E2E só roda contra um banco local (localhost).");
  }
}

export default async function globalSetup(): Promise<void> {
  assertLocal(E2E_DATABASE_URL);
  const client = new Client({ connectionString: E2E_DATABASE_URL, connectionTimeoutMillis: 5_000 });
  try {
    await client.connect();
  } catch {
    throw new Error(
      "Banco do E2E inacessível. Rode `npm run db:up`, `npm run db:deploy` e `npm run db:seed`.",
    );
  }
  try {
    const tables = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'
       AND tablename IN ('User', 'Account', 'Session', 'RateLimit')`,
    );
    if (tables.rowCount !== 4) {
      throw new Error(
        "Tabelas de autenticação ausentes no banco do E2E. Aplique as migrações (`npm run db:deploy`).",
      );
    }

    const hash = await hashPassword(E2E_OWNER.password);
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO "User" ("id", "name", "email", "emailVerified", "role", "banned", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, true, 'OWNER', false, now(), now())
       ON CONFLICT ("email") DO UPDATE
         SET "name" = EXCLUDED."name", "role" = 'OWNER', "banned" = false, "updatedAt" = now()
       RETURNING "id"`,
      [randomUUID(), E2E_OWNER.name, E2E_OWNER.email],
    );
    const userId = rows[0]?.id;
    if (!userId) throw new Error("Falha ao criar o OWNER de teste.");

    await client.query(`DELETE FROM "Session" WHERE "userId" = $1`, [userId]);
    await client.query(
      `DELETE FROM "Account" WHERE "userId" = $1 AND "providerId" = 'credential'`,
      [userId],
    );
    await client.query(
      `INSERT INTO "Account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
       VALUES ($1, $2, 'credential', $2, $3, now(), now())`,
      [randomUUID(), userId, hash],
    );
    await client.query(`DELETE FROM "RateLimit"`);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}
