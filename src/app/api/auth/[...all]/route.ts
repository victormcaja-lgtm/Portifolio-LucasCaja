import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth";

/**
 * Endpoints do Better Auth (/api/auth/*). `toNextJsHandler` aceita uma função no lugar da
 * instância: `getAuth()` só roda na primeira requisição, então o build (que importa este
 * módulo) não exige as variáveis de autenticação.
 */
export const { GET, POST } = toNextJsHandler((request: Request) => getAuth().handler(request));
