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
