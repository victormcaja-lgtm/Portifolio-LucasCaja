import { execSync } from "node:child_process";
import { Client } from "pg";
import { TEST_DATABASE_URL } from "./test-database-url";

async function assertDatabaseReachable(url: string): Promise<void> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 5_000 });
  try {
    await client.connect();
    await client.query("SELECT 1");
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    const message = error instanceof Error ? error.message : String(error);
    const reason = [code, message].filter(Boolean).join(": ") || "erro de conexão";
    throw new Error(
      `Banco de teste inacessível (${reason}). Rode \`npm run db:up\` e confirme que o banco ` +
        "`portfolio_test` existe (ou defina TEST_DATABASE_URL).",
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}

export default async function setup(): Promise<void> {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  await assertDatabaseReachable(TEST_DATABASE_URL);
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
