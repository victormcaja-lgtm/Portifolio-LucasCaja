import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DEMO_PROJECTS } from "@/content/demo";
import { listPublishedSlugs } from "@/server/repositories/projects";
import { seed } from "../../prisma/seed";
import { createTestDb, resetDb } from "./db";
import { createCategory, createProject } from "./factories";

/**
 * TASK-04b: consulta leve de slugs publicados, usada pelo proxy (via getPublishedSlugs)
 * e por generateStaticParams.
 */
const db = createTestDb();

beforeAll(async () => {
  await resetDb(db);
});

afterAll(async () => {
  await db.$disconnect();
});

describe("TASK-04b: listPublishedSlugs — filtros", () => {
  beforeEach(async () => {
    await resetDb(db);
    const cat = await createCategory(db, "fine-art", 1);
    const ids = [cat.id];
    await createProject(db, { slug: "pub-c", status: "PUBLISHED", sortOrder: 30, categoryIds: ids });
    await createProject(db, { slug: "rascunho", status: "DRAFT", sortOrder: 5, categoryIds: ids });
    await createProject(db, { slug: "pub-a", status: "PUBLISHED", sortOrder: 10, categoryIds: ids });
    await createProject(db, { slug: "arquivado", status: "ARCHIVED", sortOrder: 1, categoryIds: ids });
    await createProject(db, { slug: "pub-b", status: "PUBLISHED", sortOrder: 20, categoryIds: ids });
  });

  it("devolve só os slugs publicados, ignorando DRAFT e ARCHIVED", async () => {
    const slugs = await listPublishedSlugs(db);
    expect([...slugs].sort()).toEqual(["pub-a", "pub-b", "pub-c"]);
    expect(slugs).not.toContain("rascunho");
    expect(slugs).not.toContain("arquivado");
  });

  it("devolve strings (slugs), sem duplicatas", async () => {
    const slugs = await listPublishedSlugs(db);
    for (const slug of slugs) expect(typeof slug).toBe("string");
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("um projeto que deixa de estar publicado sai da lista", async () => {
    await db.project.update({ where: { slug: "pub-b" }, data: { status: "ARCHIVED" } });
    const slugs = await listPublishedSlugs(db);
    expect([...slugs].sort()).toEqual(["pub-a", "pub-c"]);
  });
});

describe("TASK-04b: listPublishedSlugs — banco vazio e seed", () => {
  it("CA-04: banco vazio (migrado, sem seed) → lista vazia", async () => {
    await resetDb(db);
    expect(await listPublishedSlugs(db)).toEqual([]);
  });

  it("CA-01: após o seed, devolve os 10 slugs do demo", async () => {
    await resetDb(db);
    await seed(db);
    const slugs = await listPublishedSlugs(db);
    expect([...slugs].sort()).toEqual(DEMO_PROJECTS.map((p) => p.slug).sort());
  });
});
