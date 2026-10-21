import { NextResponse, type NextRequest } from "next/server";
import { DEMO_PROJECTS } from "@/content/demo";

/**
 * Slugs de projeto conhecidos. Um slug fora desta lista é reescrito para um caminho sem rota,
 * antes da renderização: o Next responde com a página 404 (src/app/not-found.tsx) renderizada
 * no servidor e status 404. Sem isso, a rota dinâmica com Cache Components chega a notFound()
 * só durante a renderização sob demanda e entrega um documento de erro vazio, montado no cliente.
 */
const PROJECT_SLUGS: ReadonlySet<string> = new Set(DEMO_PROJECTS.map((project) => project.slug));

const PREFIX = "/trabalhos/";

/** Caminho sem rota correspondente: renderiza o not-found da raiz. */
const NOT_FOUND_PATH = "/404";

export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.slice(PREFIX.length).replace(/\/$/, "");
  if (PROJECT_SLUGS.has(slug)) return NextResponse.next();
  return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
}

export const config = {
  matcher: "/trabalhos/:slug",
};
