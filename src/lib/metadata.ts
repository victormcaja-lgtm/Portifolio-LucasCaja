import { SITE } from "./site-config";
import type { Project } from "./types";

/** Título e descrição da página de um projeto. */
export function buildProjectMetadata(project: Project): { title: string; description: string } {
  return {
    title: `${project.title} — ${SITE.name}`,
    description: project.summary ?? SITE.description,
  };
}
