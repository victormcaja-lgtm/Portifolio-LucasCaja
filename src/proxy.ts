import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { getPublishedSlugs } from "@/server/content";
import { createSlugGuard } from "@/server/slug-guard";

/**
 * Proxy com duas funções:
 *
 * 1. /admin/* (TASK-05): checagem OTIMISTA da sessão. Sem o cookie de sessão do Better Auth
 *    (`getSessionCookie`, que aceita também o prefixo __Secure- de produção), redireciona para
 *    /admin/entrar?next=<caminho>. O cookie não é validado aqui: a checagem real fica no
 *    servidor (`requireUser`, src/server/authz.ts). /admin/entrar e /admin/definir-senha ficam
 *    de fora.
 *
 * 2. /trabalhos/<slug> (TASK-04b/04c): um slug que não está publicado é reescrito para um caminho
 *    sem rota, antes da renderização: o Next responde com a página 404 (src/app/not-found.tsx)
 *    renderizada no servidor e status 404. Sem isso, a rota dinâmica com Cache Components chega a
 *    notFound() só durante a renderização sob demanda e entrega um documento de erro vazio,
 *    montado no cliente.
 *
 * No Next 16 o proxy roda no runtime Node.js por padrão (docs: 03-file-conventions/proxy.md,
 * "Runtime"), então pode usar o cliente Prisma via getPublishedSlugs.
 *
 * O banco não é consultado a cada requisição: a lista de slugs fica em memória por 60 s
 * (no máximo uma consulta por instância a cada 60 s). Limitação aceita: um projeto recém-publicado
 * pode responder 404 por até 60 s, até o TTL expirar. A TASK-07 pode reduzir isso.
 */
const guard = createSlugGuard({ load: getPublishedSlugs, ttlMs: 60_000 });

const WORKS_PREFIX = "/trabalhos/";
const LOGIN_PATH = "/admin/entrar";
/** Telas do /admin acessíveis sem sessão. */
const PUBLIC_ADMIN_PATHS = new Set([LOGIN_PATH, "/admin/definir-senha"]);

/**
 * Caminho sem rota e sem arquivo estático correspondente: renderiza o not-found da raiz com
 * status 404. Não usar "/404": na Vercel esse caminho corresponde ao 404.html estático gerado no
 * build e é servido como rota comum, com HTTP 200 (soft 404). TASK-04c.
 */
const NOT_FOUND_PATH = "/_nao-encontrado";

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function guardAdmin(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const normalized = pathname.replace(/\/+$/, "");
  if (PUBLIC_ADMIN_PATHS.has(normalized)) return NextResponse.next();
  if (getSessionCookie(request)) return NextResponse.next();

  const login = new URL(LOGIN_PATH, request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

async function guardWorks(request: NextRequest): Promise<NextResponse> {
  const slug = request.nextUrl.pathname.slice(WORKS_PREFIX.length).replace(/\/$/, "");
  const known = await guard.check(slug);
  // "unknown" (lista indisponível, por exemplo banco fora do ar): fail open. A requisição segue
  // e a página decide com notFound(). Um erro de banco não deve virar 404 em massa.
  if (known === true || known === "unknown") return NextResponse.next();
  // status 404 explícito no init do rewrite (MiddlewareResponseInit), como garantia extra.
  return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url), { status: 404 });
}

export async function proxy(request: NextRequest) {
  if (isAdminPath(request.nextUrl.pathname)) return guardAdmin(request);
  return guardWorks(request);
}

export const config = {
  matcher: ["/trabalhos/:slug", "/admin", "/admin/:path*"],
};
