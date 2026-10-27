/**
 * Variáveis da autenticação (TASK-05), separadas de `getServerEnv`: o build e as páginas públicas
 * não exigem nenhuma delas. Só quem usa o Better Auth (getAuth, script do OWNER) chama estas funções.
 *
 * As mensagens de erro citam o nome da variável e nunca o valor recebido.
 */
export interface AuthUrlEnv {
  baseURL: string;
  trustedOrigins: string[];
}

export interface AuthEnv extends AuthUrlEnv {
  secret: string;
}

const MIN_SECRET_LENGTH = 32;

function read(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

/**
 * Só a URL pública: BETTER_AUTH_URL ou, nos previews da Vercel, `https://${VERCEL_URL}`.
 * Usada sozinha pelo script do OWNER, que não exige BETTER_AUTH_SECRET (ciclo 1 da spec).
 */
export function getAuthUrlEnv(env: NodeJS.ProcessEnv = process.env): AuthUrlEnv {
  // Previews da Vercel: sem BETTER_AUTH_URL, vale a URL do deployment (VERCEL_URL, sem esquema).
  const vercelUrl = read(env, "VERCEL_URL");
  const vercelOrigin = vercelUrl ? `https://${vercelUrl}` : undefined;
  const baseURL = read(env, "BETTER_AUTH_URL") ?? vercelOrigin;
  if (!baseURL) {
    throw new Error(
      "Variável de autenticação ausente: BETTER_AUTH_URL (ou VERCEL_URL, nos previews da Vercel). Veja .env.example.",
    );
  }

  const trustedOrigins = [...new Set([baseURL, ...(vercelOrigin ? [vercelOrigin] : [])])];
  return { baseURL, trustedOrigins };
}

export function getAuthEnv(env: NodeJS.ProcessEnv = process.env): AuthEnv {
  const secret = read(env, "BETTER_AUTH_SECRET");
  if (!secret) {
    throw new Error(
      "Variável de autenticação ausente: BETTER_AUTH_SECRET. Gere com `openssl rand -base64 32`. Veja .env.example.",
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `Variável de autenticação inválida: BETTER_AUTH_SECRET deve ter pelo menos ${MIN_SECRET_LENGTH} caracteres. Veja .env.example.`,
    );
  }

  return { secret, ...getAuthUrlEnv(env) };
}
