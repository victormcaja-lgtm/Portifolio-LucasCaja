import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectView } from "@/components/site/ProjectView";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SkipLink } from "@/components/site/SkipLink";
import { DEMO_PROJECTS } from "@/content/demo";
import { collectImageCredits } from "@/lib/credits";
import { buildProjectMetadata } from "@/lib/metadata";
import { getAdjacentProjects, getProjectBySlug } from "@/lib/projects";
import type { Project } from "@/lib/types";

/**
 * A rota inteira precisa ser estática: cada slug de generateStaticParams é pré-renderizado
 * por completo no build e servido como HTML estático, inclusive na navegação pelo cliente.
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
 * renderização. Sem o proxy, notFound() durante a renderização sob demanda ainda daria status
 * 404, mas com um documento de erro vazio montado no cliente — é o proxy que garante o HTML da
 * página 404 renderizado no servidor.
 */
export const instant = false;

interface ProjectRouteProps {
  params: Promise<{ slug: string }>;
}

/** Todas as páginas de projeto são geradas no build; outros slugs respondem com 404. */
export function generateStaticParams(): Array<{ slug: string }> {
  return DEMO_PROJECTS.map((project) => ({ slug: project.slug }));
}

async function resolveProject(params: Promise<{ slug: string }>): Promise<Project> {
  const { slug } = await params;
  const project = getProjectBySlug(DEMO_PROJECTS, slug);
  if (!project) notFound();
  return project;
}

export async function generateMetadata({ params }: ProjectRouteProps): Promise<Metadata> {
  const meta = buildProjectMetadata(await resolveProject(params));
  // `absolute` evita que o title.template do layout repita o nome do site.
  return { title: { absolute: meta.title }, description: meta.description };
}

export default async function ProjectPage({ params }: ProjectRouteProps) {
  const project = await resolveProject(params);
  const { previous, next } = getAdjacentProjects(DEMO_PROJECTS, project.slug);
  const credits = collectImageCredits([project.cover, ...project.gallery]);

  return (
    <>
      <SkipLink />
      <SiteHeader variant="solid" />
      <main id="conteudo">
        <ProjectView project={project} previous={previous} next={next} />
      </main>
      <SiteFooter credits={credits} />
    </>
  );
}
