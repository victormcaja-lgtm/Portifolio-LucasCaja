import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { DEMO_HERO, DEMO_PROJECTS } from "@/content/demo";
import { getProjectBySlug, sortProjects } from "@/lib/projects";
import type { ImageAsset, Project } from "@/lib/types";
import { PROJECTS_TAG, projectTag } from "./cache-tags";
import { getContentSource } from "./content-source";
import {
  getPublishedProjectBySlug,
  listPublishedProjects,
  listPublishedSlugs,
} from "./repositories/projects";

/**
 * Camada de conteúdo usada pelas páginas públicas e pelo proxy.
 *
 * - Fonte `"database"` (DATABASE_URL definida): delega ao repositório. Erros de conexão propagam
 *   e falham o build ou a requisição; não existe fallback silencioso para o demo.
 * - Fonte `"demo"` (sem DATABASE_URL): usa DEMO_PROJECTS com as funções puras de src/lib.
 *
 * Tempo de vida do cache: os projetos mudam raramente e só por ação do painel, que vai invalidar
 * as entradas pelas tags (PROJECTS_TAG e projectTag(slug)) na TASK-07. Por isso o perfil é de
 * longa duração ("days"): a atualização acontece via tag, não por expiração. O perfil também
 * respeita os limites de `ensureStatic = "navigation"` (stale ≥ 30 s, expire ≥ 5 min).
 */

/** Projetos publicados, por `sortOrder` crescente. */
export async function getPublishedProjects(): Promise<Project[]> {
  "use cache";
  cacheTag(PROJECTS_TAG);
  cacheLife("days");

  if (getContentSource() === "database") return listPublishedProjects();
  return sortProjects(DEMO_PROJECTS);
}

/** Projeto publicado com o slug exato, ou `null`. */
export async function getPublishedProject(slug: string): Promise<Project | null> {
  "use cache";
  cacheTag(PROJECTS_TAG, projectTag(slug));
  cacheLife("days");

  if (getContentSource() === "database") return getPublishedProjectBySlug(slug);
  return getProjectBySlug(DEMO_PROJECTS, slug) ?? null;
}

/**
 * Slugs publicados. Sem `"use cache"`: é chamada pelo proxy, que mantém a própria cópia em
 * memória com TTL (src/server/slug-guard.ts), e por `generateStaticParams`, que roda uma vez no
 * build. Usa uma consulta leve, só com a coluna `slug`.
 */
export async function getPublishedSlugs(): Promise<string[]> {
  if (getContentSource() === "database") return listPublishedSlugs();
  return DEMO_PROJECTS.map((project) => project.slug);
}

/** Imagem de abertura da home. Continua sendo DEMO_HERO até o painel permitir escolhê-la (TASK-07). */
export function getHeroImage(): ImageAsset {
  return DEMO_HERO;
}
