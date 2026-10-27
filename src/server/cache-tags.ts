/** Tag de todas as entradas de cache que dependem da lista de projetos publicados. */
export const PROJECTS_TAG = "projects";

/** Tag da entrada de cache de um projeto específico. */
export function projectTag(slug: string): string {
  return `project:${slug}`;
}
