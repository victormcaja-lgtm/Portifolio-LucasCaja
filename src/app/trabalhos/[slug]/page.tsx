import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectView } from "@/components/site/ProjectView";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SkipLink } from "@/components/site/SkipLink";
import { collectImageCredits } from "@/lib/credits";
import { buildProjectMetadata } from "@/lib/metadata";
import { getAdjacentProjects } from "@/lib/projects";
import type { Project } from "@/lib/types";
import { getPublishedProject, getPublishedProjects, getPublishedSlugs } from "@/server/content";
import { RESERVED_EMPTY_SLUG } from "@/server/slug-guard";

/**
 * A rota inteira precisa ser estática: cada slug de generateStaticParams é pré-renderizado
 * por completo no build e servido como HTML estático, inclusive na navegação pelo cliente.
 * Os dados vêm de funções com "use cache" (src/server/content.ts) e perfil "days", que a
 * validação de `ensureStatic = "navigation"` aceita (ela só recusa dados sem cache ou com
 * stale < 30 s / expire < 5 min). Ver node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/02-route-segment-config/ensureStatic.md.
 *
 * Projetos publicados depois do build: com `"navigation"`, um slug fora de generateStaticParams
 * é gerado na primeira requisição (o Next espera o resultado estático) e fica em cache. Com
 * Cache Components, `dynamicParams` não está disponível e não é necessário.
 */
export const ensureStatic = "navigation";

/**
 * Toda a página (e o generateMetadata) depende do slug, então não há parte independente da URL
 * para compor um App Shell compartilhado. Com Partial Prefetching, ler `params` fora de
 * <Suspense> dispara o aviso "instant-shell-url-data" no dev. Em vez de um fallback que nunca
 * aparece (a saída é estática), declaramos a rota como "bloqueante": a navegação espera o HTML/RSC
 * estático já gerado no build. ensureStatic = "navigation" continua validado (instant = false não
 * o relaxa).
 *
 * Slugs desconhecidos não chegam aqui: src/proxy.ts os reescreve para a página 404 antes da
 * renderização. Sem o proxy (ou se ele não conseguir carregar a lista de slugs), notFound()
 * durante a renderização sob demanda ainda dá status 404.
 */
export const instant = false;

interface ProjectRouteProps {
  params: Promise<{ slug: string }>;
}

/**
 * Slugs publicados, gerados no build. Com Cache Components, a lista não pode ser vazia (erro de
 * build, ver generate-static-params.md, "With Cache Components"). Sem projetos publicados,
 * devolvemos só o parâmetro reservado `__vazio__`, que não é um slug válido: a página responde
 * a ele com notFound() e o proxy o trata como inexistente.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const slugs = await getPublishedSlugs();
  if (slugs.length === 0) return [{ slug: RESERVED_EMPTY_SLUG }];
  return slugs.map((slug) => ({ slug }));
}

async function resolveProject(params: Promise<{ slug: string }>): Promise<Project> {
  const { slug } = await params;
  if (slug === RESERVED_EMPTY_SLUG) notFound();
  const project = await getPublishedProject(slug);
  if (!project) notFound();
  return project;
}

/** Vizinhos na lista publicada; sem vizinhos se o projeto (ainda) não estiver nela. */
function adjacentTo(projects: readonly Project[], slug: string) {
  if (!projects.some((project) => project.slug === slug)) return { previous: null, next: null };
  return getAdjacentProjects(projects, slug);
}

export async function generateMetadata({ params }: ProjectRouteProps): Promise<Metadata> {
  const meta = buildProjectMetadata(await resolveProject(params));
  // `absolute` evita que o title.template do layout repita o nome do site.
  return { title: { absolute: meta.title }, description: meta.description };
}

export default async function ProjectPage({ params }: ProjectRouteProps) {
  const project = await resolveProject(params);
  const { previous, next } = adjacentTo(await getPublishedProjects(), project.slug);
  const credits = collectImageCredits([project.cover, ...project.gallery]);

  return (
    <>
      <SkipLink />
      <SiteHeader variant="solid" />
      <main id="conteudo" tabIndex={-1} className="focus:outline-none">
        <ProjectView project={project} previous={previous} next={next} />
      </main>
      <SiteFooter credits={credits} />
    </>
  );
}
