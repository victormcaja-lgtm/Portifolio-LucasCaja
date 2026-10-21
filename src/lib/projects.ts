import type { CategoryFilterValue, Project } from "./types";

/** Nova lista ordenada por `sortOrder` crescente; não muta a entrada. */
export function sortProjects(projects: readonly Project[]): Project[] {
  return [...projects].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Filtra por categoria ("todos" retorna todos), sempre ordenado e sem mutar a entrada. */
export function filterProjectsByCategory(
  projects: readonly Project[],
  filter: CategoryFilterValue,
): Project[] {
  const sorted = sortProjects(projects);
  if (filter === "todos") return sorted;
  return sorted.filter((p) => p.categories.includes(filter));
}

/** 1 → "01", 10 → "10", 123 → "123". */
export function formatProjectIndex(position: number): string {
  if (!Number.isInteger(position) || position < 1) {
    throw new RangeError(`Posição inválida: ${position}`);
  }
  return String(position).padStart(2, "0");
}

/** Projeto com o slug exato informado, ou `undefined`. */
export function getProjectBySlug(projects: readonly Project[], slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

/**
 * Vizinhos do projeto na ordem de `sortOrder`, de forma circular.
 * Lista com um único projeto → ambos `null`. Slug inexistente → lança `Error`.
 */
export function getAdjacentProjects(
  projects: readonly Project[],
  slug: string,
): { previous: Project | null; next: Project | null } {
  const sorted = sortProjects(projects);
  const index = sorted.findIndex((p) => p.slug === slug);
  if (index === -1) throw new Error(`Projeto inexistente: ${slug}`);
  if (sorted.length === 1) return { previous: null, next: null };
  const count = sorted.length;
  return {
    previous: sorted[(index - 1 + count) % count],
    next: sorted[(index + 1) % count],
  };
}
