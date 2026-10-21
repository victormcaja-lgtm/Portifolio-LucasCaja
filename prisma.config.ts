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
    url: process.env.DATABASE_URL,
  },
});
