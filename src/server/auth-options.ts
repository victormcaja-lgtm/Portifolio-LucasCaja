import { APIError, BASE_ERROR_CODES, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { PrismaClient } from "../generated/prisma/client";
import type { AuthEnv } from "./auth-env";

/**
 * Configuração do Better Auth (TASK-05), compartilhada por `getAuth()` (src/server/auth.ts) e pelo
 * script do OWNER (scripts/owner-invite.ts). Este módulo não importa `server-only` nem
 * `@/server/db`: o script roda fora do Next (tsx) e recebe o próprio cliente Prisma.
 * Importar este arquivo não cria nada; a instância só nasce em `createAuth`.
 */

/** Dados do link de redefinição de senha entregues ao sink (nunca registrados em log). */
export interface ResetLink {
  token: string;
  email: string;
  url: string;
}

export type ResetLinkSink = (link: ResetLink) => void | Promise<void>;

export interface CreateAuthInput {
  db: PrismaClient;
  env: AuthEnv;
  /** Lido a cada envio: o sink pode ser registrado depois de criada a instância. */
  getResetLinkSink: () => ResetLinkSink | null;
  /**
   * Caminhos do handler HTTP desativados (respondem 404). A instância do app desativa
   * `/request-password-reset`; o script do OWNER não passa nada, pois chama `auth.api` direto.
   */
  disabledPaths?: string[];
}

const MINUTE = 60;
const DAY = 24 * 60 * MINUTE;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
/** Validade do link de definição de senha (CA-2): 60 minutos. */
export const RESET_TOKEN_TTL_SECONDS = 60 * MINUTE;

export function createAuthOptions({
  db,
  env,
  getResetLinkSink,
  disabledPaths = [],
}: CreateAuthInput) {
  return {
    secret: env.secret,
    disabledPaths,
    baseURL: env.baseURL,
    trustedOrigins: env.trustedOrigins,
    database: prismaAdapter(db, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      // Sem cadastro público: contas nascem pelo script do OWNER (e, na TASK-08, por convite).
      disableSignUp: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      autoSignIn: false,
      resetPasswordTokenExpiresIn: RESET_TOKEN_TTL_SECONDS,
      // Definir uma nova senha derruba todas as sessões abertas da conta.
      revokeSessionsOnPasswordReset: true,
      /**
       * Não há envio de e-mail neste projeto: o link vai para um sink registrado por quem pediu
       * (o script do OWNER). Sem sink, falha.
       *
       * A função NÃO é `async` de propósito: o Better Auth 1.7.14 chama
       * `runInBackgroundOrAwait(sendResetPassword(...))`, que engole (e registra em log) uma
       * promessa rejeitada (dist/context/create-context.mjs). Um erro síncrono é lançado antes
       * dessa chamada e chega a quem pediu a redefinição. A mensagem nunca contém o token.
       */
      sendResetPassword: ({ user, url, token }: { user: { email: string }; url: string; token: string }) => {
        const sink = getResetLinkSink();
        if (!sink) {
          throw new Error("Redefinição de senha indisponível: envio de e-mail não configurado.");
        }
        return Promise.resolve(sink({ token, email: user.email, url }));
      },
    },
    user: {
      additionalFields: {
        // input: false → nem cadastro nem updateUser aceitam esses campos vindos do cliente.
        role: { type: "string", required: false, defaultValue: "EDITOR", input: false },
        banned: { type: "boolean", required: false, defaultValue: false, input: false },
      },
    },
    session: {
      expiresIn: 7 * DAY,
      updateAge: DAY,
    },
    advanced: {
      ipAddress: {
        // Na Vercel, o IP real do cliente chega em x-vercel-forwarded-for. Sem isso, o rate limit
        // poderia cair num bucket único compartilhado por todos os clientes.
        // `as string[]`: o `as const` do objeto tornaria a lista readonly, e o tipo do Better Auth
        // pede uma lista mutável.
        ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"] as string[],
      },
    },
    rateLimit: {
      enabled: true,
      // Em banco (tabela RateLimit): funciona entre instâncias serverless da Vercel.
      storage: "database",
      customRules: {
        "/sign-in/email": { window: MINUTE, max: 5 },
        "/reset-password": { window: MINUTE, max: 5 },
      },
    },
    databaseHooks: {
      session: {
        create: {
          /**
           * Usuário banido não recebe sessão. O erro é o mesmo de credenciais inválidas: a
           * resposta não revela o motivo (CA-5).
           */
          before: async (session: { userId: string }) => {
            const user = await db.user.findUnique({
              where: { id: session.userId },
              select: { banned: true },
            });
            if (!user || user.banned) {
              throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD);
            }
          },
        },
      },
    },
  } as const;
}

export function createAuth(input: CreateAuthInput) {
  return betterAuth(createAuthOptions(input));
}

export type Auth = ReturnType<typeof createAuth>;
