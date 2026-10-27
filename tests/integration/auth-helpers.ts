import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { TEST_DATABASE_URL } from "./test-database-url";

/**
 * Variáveis de autenticação SÓ de teste (TASK-05). Nunca reaproveitar segredos reais.
 * `applyTestAuthEnv()` deve rodar antes de importar `@/server/auth` / `scripts/owner-invite`,
 * para que `getDb()` e `getAuthEnv()` apontem para o banco e a URL de teste.
 */
export const TEST_AUTH_ENV = {
  BETTER_AUTH_SECRET: "segredo-somente-de-teste-integracao-0123456789",
  BETTER_AUTH_URL: "http://localhost:3100",
} as const;

export function applyTestAuthEnv(): void {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.BETTER_AUTH_SECRET = TEST_AUTH_ENV.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_URL = TEST_AUTH_ENV.BETTER_AUTH_URL;
  delete process.env.VERCEL_URL;
}

/** Ambiente completo para `createOwnerInvite(db, env, sink)`. */
export function ownerInviteEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: TEST_DATABASE_URL,
    BETTER_AUTH_SECRET: TEST_AUTH_ENV.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: TEST_AUTH_ENV.BETTER_AUTH_URL,
    SEED_OWNER_EMAIL: "dono@exemplo.test",
    SEED_OWNER_NAME: "Dono de Teste",
    ...overrides,
  } as unknown as NodeJS.ProcessEnv;
}

/** Extrai o token de um link `<baseURL>/admin/definir-senha?token=…`. */
export function tokenFromLink(link: string): string {
  const url = new URL(link);
  const token = url.searchParams.get("token");
  if (!token) throw new Error("link sem token");
  return token;
}

/**
 * Cria um usuário com conta de credencial (senha com o hasher do Better Auth), direto no banco.
 * Os modelos seguem os nomes do Better Auth no Prisma (User, Account), sem @@map.
 */
export async function createUserWithPassword(
  db: PrismaClient,
  input: {
    email: string;
    name: string;
    password: string;
    role?: "OWNER" | "ADMIN" | "EDITOR";
    banned?: boolean;
  },
) {
  const now = new Date();
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      emailVerified: true,
      role: input.role ?? "EDITOR",
      banned: input.banned ?? false,
    },
  });
  await db.account.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: await hashPassword(input.password),
      createdAt: now,
      updatedAt: now,
    },
  });
  return user;
}

/** Monta o cabeçalho Cookie a partir dos Set-Cookie devolvidos por uma chamada com returnHeaders. */
export function cookieHeaderFrom(headers: Headers): string {
  const setCookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : (headers.get("set-cookie") ?? "").split(/,(?=\s*[^;,]+=)/);
  return setCookies
    .map((c) => c.split(";")[0]?.trim())
    .filter((c): c is string => Boolean(c))
    .join("; ");
}
