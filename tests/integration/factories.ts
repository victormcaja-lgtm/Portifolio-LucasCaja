import type { PrismaClient } from "@/generated/prisma/client";

let counter = 0;

/** Cria uma categoria mínima. */
export async function createCategory(db: PrismaClient, slug: string, sortOrder: number) {
  return db.category.create({ data: { name: slug, slug, sortOrder } });
}

/**
 * Cria um projeto com capa e uma imagem de galeria (mídias EXTERNAL) e o vincula às categorias.
 */
export async function createProject(
  db: PrismaClient,
  input: {
    slug: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    sortOrder: number;
    categoryIds: string[];
  },
) {
  const project = await db.project.create({
    data: {
      title: `Projeto ${input.slug}`,
      slug: input.slug,
      status: input.status,
      featured: false,
      sortOrder: input.sortOrder,
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
      categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
    },
  });
  counter += 1;
  const cover = await db.media.create({
    data: {
      type: "IMAGE",
      provider: "EXTERNAL",
      url: `https://picsum.photos/id/${counter}/1200/1500`,
      width: 1200,
      height: 1500,
      alt: `Capa de ${input.slug}`,
      creditAuthor: "Autor",
      creditUrl: "https://unsplash.com/photos/x",
      sortOrder: 0,
      projectId: project.id,
    },
  });
  await db.media.create({
    data: {
      type: "IMAGE",
      provider: "EXTERNAL",
      url: `https://picsum.photos/id/${counter + 500}/1800/1200`,
      width: 1800,
      height: 1200,
      alt: `Galeria de ${input.slug}`,
      sortOrder: 1,
      projectId: project.id,
    },
  });
  return db.project.update({ where: { id: project.id }, data: { coverId: cover.id } });
}
