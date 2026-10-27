/**
 * Primeiro acesso do OWNER (TASK-05): `npm run auth:owner`.
 *
 * - Lê SEED_OWNER_EMAIL, SEED_OWNER_NAME, DATABASE_URL e BETTER_AUTH_URL (ou VERCEL_URL).
 * - Não exige BETTER_AUTH_SECRET: o token de redefinição é aleatório e conferido no banco, e o
 *   script não cria sessão. A instância do Better Auth do script recebe um segredo efêmero, gerado
 *   em memória a cada execução, nunca impresso nem gravado. O token continua válido no app, que
 *   usa o segredo real.
 * - Cria o usuário com papel OWNER se ele não existir; se existir, garante OWNER e banned = false.
 *   Nunca altera outros usuários.
 * - Gera, pelo fluxo de redefinição de senha do Better Auth, um link de uso único para
 *   <BETTER_AUTH_URL>/admin/definir-senha?token=…, válido por 60 minutos, e imprime só esse link.
 *   Ninguém digita senha no terminal.
 *
 * Funciona em produção rodando localmente com as variáveis do ambiente de produção
 * (docs/GUIA-CONFIGURACAO.md, "Primeiro acesso do administrador").
 *
 * Importado pelos testes, apenas exporta `createOwnerInvite` e não executa nada.
 */
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";
import { getAuthUrlEnv } from "../src/server/auth-env";
import { createAuth, RESET_TOKEN_TTL_SECONDS, type ResetLink } from "../src/server/auth-options";
import { getServerEnv } from "../src/server/env";

/** Rota da tela que recebe o token (src/app/admin/definir-senha/page.tsx). */
const SET_PASSWORD_PATH = "/admin/definir-senha";
const RESET_IDENTIFIER_PREFIX = "reset-password:";

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Variável ausente: ${name}. Veja .env.example.`);
  return value;
}

/**
 * Cria ou promove o OWNER e entrega a `sink` o link de definição de senha. Não escreve nada no
 * console (o `main` decide o que imprimir). As mensagens de erro nunca incluem valores secretos.
 */
export async function createOwnerInvite(
  db: PrismaClient,
  env: NodeJS.ProcessEnv,
  sink: (link: string) => void | Promise<void>,
): Promise<void> {
  // Valida tudo antes de qualquer escrita no banco.
  const rawEmail = required(env, "SEED_OWNER_EMAIL");
  const name = required(env, "SEED_OWNER_NAME");
  const email = rawEmail.toLowerCase();
  if (!z.email().safeParse(email).success) {
    throw new Error("Variável inválida: SEED_OWNER_EMAIL não é um e-mail válido.");
  }
  const urlEnv = getAuthUrlEnv(env);

  const owner = await db.user.upsert({
    where: { email },
    create: { email, name, role: "OWNER", banned: false },
    // Só garante o papel e o desbloqueio; nome e demais dados ficam como estão.
    update: { role: "OWNER", banned: false },
    select: { id: true },
  });

  // Um link novo invalida os anteriores ainda não usados deste usuário.
  await db.verification.deleteMany({
    where: { identifier: { startsWith: RESET_IDENTIFIER_PREFIX }, value: owner.id },
  });

  let captured: ResetLink | null = null;
  const auth = createAuth({
    db,
    // Segredo efêmero: o Better Auth exige um para inicializar, mas o token de redefinição não
    // depende dele (é aleatório e conferido no banco). Nunca lido de process.env nem exposto.
    env: { ...urlEnv, secret: randomBytes(32).toString("base64") },
    getResetLinkSink: () => (link) => {
      captured = link;
    },
  });
  await auth.api.requestPasswordReset({ body: { email } });

  const token = (captured as ResetLink | null)?.token;
  if (!token) throw new Error("O Better Auth não gerou o link de definição de senha.");

  const url = new URL(SET_PASSWORD_PATH, `${urlEnv.baseURL.replace(/\/+$/, "")}/`);
  url.searchParams.set("token", token);
  await sink(url.toString());
}

/** Verdadeiro só quando este arquivo é o ponto de entrada (`tsx scripts/owner-invite.ts`). */
function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && path.resolve(entry) === fileURLToPath(import.meta.url);
}

async function main(): Promise<void> {
  // Como no prisma.config.ts: .env.local e .env, sem sobrescrever o que já está no ambiente
  // (em produção, as variáveis definidas na sessão do terminal prevalecem).
  for (const file of [".env.local", ".env"]) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
  const { DATABASE_URL } = getServerEnv();
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
  try {
    await createOwnerInvite(db, process.env, (link) => {
      const minutes = RESET_TOKEN_TTL_SECONDS / 60;
      console.log("\nLink para o OWNER definir a senha:\n");
      console.log(link);
      console.log(`\nAtenção: não compartilhe; expira em ${minutes} min; uso único.\n`);
    });
  } finally {
    await db.$disconnect();
  }
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    // Só a mensagem: o objeto de erro pode carregar detalhes da conexão.
    console.error(error instanceof Error ? error.message : "Falha ao gerar o link do OWNER.");
    process.exitCode = 1;
  });
}
