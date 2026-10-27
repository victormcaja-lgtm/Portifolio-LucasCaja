import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// O Prisma 7 não carrega `.env` sozinho. Carregamos `.env.local` e `.env` (nessa ordem de
// prioridade) quando existem; variáveis já definidas no ambiente nunca são sobrescritas.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Lido de `process.env` (e não com `env()` de prisma/config, que lança quando falta):
    // `prisma generate` (postinstall, build da Vercel) não precisa de banco nem de DATABASE_URL.
    // Comandos que conectam (migrate, db seed, studio) falham com mensagem do próprio Prisma.
    //
    // A CLI (migrações) prefere DATABASE_URL_UNPOOLED, a conexão direta do Neon: o pooler
    // (PgBouncer em modo transação) não suporta as travas e sessões que o `migrate` usa.
    // Localmente ela não existe e vale DATABASE_URL. O cliente da aplicação (src/server/db.ts)
    // continua usando DATABASE_URL, a conexão com pool.
    url: process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL,
  },
});
