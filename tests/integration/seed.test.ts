import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/categories";
import { DEMO_PROJECTS } from "@/content/demo";
// Hipótese: prisma/seed.ts exporta `seed(db)` e só se autoexecuta quando rodado como script.
import { seed } from "../../prisma/seed";
import { createTestDb, resetDb } from "./db";

const db = createTestDb();

async function counts() {
  const [categories, projects, demoProjects, media, links, users] = await Promise.all([
    db.category.count(),
    db.project.count(),
    db.project.count({ where: { isDemo: true, status: "PUBLISHED" } }),
    db.media.count(),
    db.projectCategory.count(),
    db.user.count(),
  ]);
  return { categories, projects, demoProjects, media, links, users };
}

const EXPECTED_LINKS = DEMO_PROJECTS.reduce((n, p) => n + p.categories.length, 0);

const EXPECTED_COUNTS = {
  categories: 4,
  projects: 10,
  demoProjects: 10,
  media: 30,
  links: EXPECTED_LINKS,
  users: 0,
};

beforeAll(async () => {
  await resetDb(db);
  await seed(db);
});

afterAll(async () => {
  await db.$disconnect();
});

describe("seed (CA-06)", () => {
  it("CA-06: cria 4 categorias, 10 projetos demo publicados e 30 mídias; nenhum usuário", async () => {
    expect(await counts()).toEqual(EXPECTED_COUNTS);
  });

  it("CA-06: 10 capas e 20 imagens de galeria, todas EXTERNAL com url https, alt e crédito", async () => {
    const projects = await db.project.findMany({ include: { media: true } });
    const coverIds = projects.map((p) => p.coverId);
    expect(coverIds.every((id) => id !== null)).toBe(true);
    const allMedia = projects.flatMap((p) => p.media);
    expect(allMedia).toHaveLength(30);
    expect(allMedia.filter((m) => coverIds.includes(m.id))).toHaveLength(10);
    expect(allMedia.filter((m) => !coverIds.includes(m.id))).toHaveLength(20);
    for (const m of allMedia) {
      expect(m.provider).toBe("EXTERNAL");
      expect(m.type).toBe("IMAGE");
      expect(m.url).toMatch(/^https:\/\//);
      expect(m.alt.length).toBeGreaterThan(0);
      expect(m.creditAuthor).toBeTruthy();
      expect(m.creditUrl).toBeTruthy();
    }
  });

  it("CA-06: categorias seguem a ordem de CATEGORIES", async () => {
    const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
    expect(categories.map((c) => ({ slug: c.slug, name: c.name }))).toEqual(
      CATEGORIES.map((c) => ({ slug: c.slug, name: c.name })),
    );
  });

  it("CA-06: rodar o seed de novo é idempotente (mesmas contagens)", async () => {
    await seed(db);
    expect(await counts()).toEqual(EXPECTED_COUNTS);
  });
});
