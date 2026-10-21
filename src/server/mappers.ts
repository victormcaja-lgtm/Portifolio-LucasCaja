import type { Media, Prisma } from "@/generated/prisma/client";
import type { CategorySlug, ImageAsset, Project } from "@/lib/types";

/** `include` usado pelo repositório para montar um `Project` de domínio. */
export const projectWithRelations = {
  cover: true,
  media: true,
  categories: { include: { category: true } },
} as const satisfies Prisma.ProjectInclude;

export type MediaRow = Media;
export type ProjectRowWithRelations = Prisma.ProjectGetPayload<{
  include: typeof projectWithRelations;
}>;

/** Linha de mídia → `ImageAsset`. Nesta etapa só mídias EXTERNAL (demonstração) são servidas. */
export function toImageAsset(media: MediaRow): ImageAsset {
  if (media.provider === "CLOUDINARY") {
    throw new Error("Cloudinary ainda não configurado");
  }
  if (!media.url) {
    throw new Error(`Mídia EXTERNAL sem url: ${media.id}`);
  }
  const asset: ImageAsset = {
    src: media.url,
    width: media.width,
    height: media.height,
    alt: media.alt,
  };
  if (media.creditAuthor && media.creditUrl) {
    asset.credit = { author: media.creditAuthor, sourceUrl: media.creditUrl };
  }
  return asset;
}

/** Linha de projeto (com capa, mídias e categorias) → `Project` de domínio. */
export function toDomainProject(row: ProjectRowWithRelations): Project {
  if (!row.cover) {
    throw new Error(`Projeto sem capa: ${row.slug}`);
  }
  const coverId = row.cover.id;
  const categories = [...row.categories]
    .sort((a, b) => a.category.sortOrder - b.category.sortOrder)
    .map((link) => link.category.slug as CategorySlug);
  const gallery = row.media
    .filter((m) => m.type === "IMAGE" && m.id !== coverId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toImageAsset);

  const project: Project = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    categories,
    cover: toImageAsset(row.cover),
    sortOrder: row.sortOrder,
    isDemo: row.isDemo,
    gallery,
  };
  if (row.summary !== null) project.summary = row.summary;
  return project;
}
