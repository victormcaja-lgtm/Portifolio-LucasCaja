/**
 * Seed de DEMONSTRAÇÃO: importa CATEGORIES e DEMO_PROJECTS (src/content/demo.ts) para o banco,
 * preservando `isDemo = true`. Idempotente: ids determinísticos + upsert. Não cria usuários.
 *
 * Execução: `npm run db:seed` (prisma db seed → tsx prisma/seed.ts).
 * Importado pelos testes, apenas exporta `seed(db)` e não executa nada.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEMO_PROJECTS } from "../src/content/demo";
import { PrismaClient } from "../src/generated/prisma/client";
import { CATEGORIES } from "../src/lib/categories";
import type { ImageAsset } from "../src/lib/types";
import { getServerEnv } from "../src/server/env";
import { assertValidMedia } from "../src/server/media-rules";

function mediaData(asset: ImageAsset, projectId: string, sortOrder: number) {
  const data = {
    type: "IMAGE" as const,
    provider: "EXTERNAL" as const,
    url: asset.src,
    publicId: null,
    width: asset.width,
    height: asset.height,
    alt: asset.alt,
    creditAuthor: asset.credit?.author ?? null,
    creditUrl: asset.credit?.sourceUrl ?? null,
    sortOrder,
    projectId,
  };
  assertValidMedia(data);
  return data;
}

export async function seed(db: PrismaClient): Promise<void> {
  const categoryIds = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const data = { name: category.name, sortOrder: index + 1 };
    const row = await db.category.upsert({
      where: { slug: category.slug },
      create: { slug: category.slug, ...data },
      update: data,
    });
    categoryIds.set(category.slug, row.id);
  }

  for (const project of DEMO_PROJECTS) {
    const fields = {
      title: project.title,
      summary: project.summary ?? null,
      status: "PUBLISHED" as const,
      isDemo: true,
      sortOrder: project.sortOrder,
    };
    await db.project.upsert({
      where: { slug: project.slug },
      create: { id: project.id, slug: project.slug, publishedAt: new Date(), ...fields },
      update: fields,
    });

    // Capa (sortOrder 0) e galeria (1..n), com ids determinísticos.
    const images = [project.cover, ...project.gallery];
    const mediaIds = images.map((_, i) => (i === 0 ? `${project.id}-cover` : `${project.id}-gallery-${i}`));
    for (const [i, asset] of images.entries()) {
      const data = mediaData(asset, project.id, i);
      await db.media.upsert({ where: { id: mediaIds[i] }, create: { id: mediaIds[i], ...data }, update: data });
    }
    // Remove mídias que deixaram de existir no conteúdo de demonstração.
    await db.media.deleteMany({ where: { projectId: project.id, id: { notIn: mediaIds } } });
    await db.project.update({ where: { id: project.id }, data: { coverId: mediaIds[0] } });

    const wanted = project.categories.map((slug) => {
      const categoryId = categoryIds.get(slug);
      if (!categoryId) throw new Error(`Categoria desconhecida no seed: ${slug}`);
      return categoryId;
    });
    await db.projectCategory.deleteMany({
      where: { projectId: project.id, categoryId: { notIn: wanted } },
    });
    await db.projectCategory.createMany({
      data: wanted.map((categoryId) => ({ projectId: project.id, categoryId })),
      skipDuplicates: true,
    });
  }
}

/** Verdadeiro só quando este arquivo é o ponto de entrada (`tsx prisma/seed.ts`). */
function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && path.resolve(entry) === fileURLToPath(import.meta.url);
}

async function main(): Promise<void> {
  const { DATABASE_URL } = getServerEnv();
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
  try {
    await seed(db);
    const [categories, projects, media] = await Promise.all([
      db.category.count(),
      db.project.count(),
      db.media.count(),
    ]);
    console.log(`Seed concluído: ${categories} categorias, ${projects} projetos, ${media} mídias.`);
  } finally {
    await db.$disconnect();
  }
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
