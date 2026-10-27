import "server-only";
import { getAuthEnv } from "@/server/auth-env";
import { createAuth, type Auth, type ResetLinkSink } from "@/server/auth-options";
import { getDb } from "@/server/db";

export type { Auth, ResetLink, ResetLinkSink } from "@/server/auth-options";

/** Endpoint de pedido de redefinição no Better Auth 1.7.14 (dist/api/routes/password.mjs). */
const APP_DISABLED_PATHS = ["/request-password-reset"] as const;

let instance: Auth | null = null;
let resetLinkSink: ResetLinkSink | null = null;

/**
 * Registra (ou remove, com `null`) quem recebe os links de redefinição de senha. Não há envio
 * de e-mail: sem sink, pedir uma redefinição falha com "envio de e-mail não configurado".
 */
export function setResetLinkSink(sink: ResetLinkSink | null): void {
  resetLinkSink = sink;
}

/**
 * Instância do Better Auth, criada na primeira chamada (singleton preguiçoso). Importar este
 * módulo não lê variáveis nem cria nada: o build e as páginas públicas não exigem as variáveis
 * de autenticação.
 */
export function getAuth(): Auth {
  if (!instance) {
    const env = getAuthEnv();
    instance = createAuth({
      db: getDb(),
      env,
      getResetLinkSink: () => resetLinkSink,
      // Pedir redefinição por HTTP revelaria quais e-mails existem e deixaria tokens órfãos (não
      // há envio de e-mail). Os links nascem só pelo script do OWNER, que chama `auth.api` direto.
      // O consumo do token (/reset-password) continua ativo.
      disabledPaths: [...APP_DISABLED_PATHS],
    });
  }
  return instance;
}
