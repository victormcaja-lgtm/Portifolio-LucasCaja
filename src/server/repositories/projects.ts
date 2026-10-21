import type { PrismaClient } from "@/generated/prisma/client";
import type { Category, CategorySlug, Project } from "@/lib/types";
import { getDb } from "../db";
import { projectWithRelations, toDomainProject } from "../mappers";

/** Projetos publicados, por `sortOrder` crescente. */
export async function listPublishedProjects(db: PrismaClient = getDb()): Promise<Project[]> {
  const rows = await db.project.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: projectWithRelations,
  });
  return rows.map(toDomainProject);
}

/** Projeto publicado com o slug exato, ou `null` (inexistente, rascunho ou arquivado). */
export async function getPublishedProjectBySlug(
  slug: string,
  db: PrismaClient = getDb(),
): Promise<Project | null> {
  const row = await db.project.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: projectWithRelations,
  });
  return row ? toDomainProject(row) : null;
}

/** Categorias por `sortOrder` crescente. */
export async function listCategories(db: PrismaClient = getDb()): Promise<Category[]> {
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    select: { slug: true, name: true },
  });
  return rows.map((row) => ({ slug: row.slug as CategorySlug, name: row.name }));
}
