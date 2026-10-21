import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/categories";
import { DEMO_PROJECTS } from "@/content/demo";
import { sortProjects } from "@/lib/projects";
import {
  getPublishedProjectBySlug,
  listCategories,
  listPublishedProjects,
} from "@/server/repositories/projects";
import { seed } from "../../prisma/seed";
import { createTestDb, resetDb } from "./db";
import { createCategory, createProject } from "./factories";

const db = createTestDb();

beforeAll(async () => {
  await resetDb(db);
});

afterAll(async () => {
  await db.$disconnect();
});

describe("repositório de projetos — filtros (CA-07)", () => {
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

  it("CA-07: listPublishedProjects ignora DRAFT e ARCHIVED e respeita sortOrder", async () => {
    const projects = await listPublishedProjects(db);
    expect(projects.map((p) => p.slug)).toEqual(["pub-a", "pub-b", "pub-c"]);
  });

  it("CA-07: getPublishedProjectBySlug retorna o projeto publicado", async () => {
    const project = await getPublishedProjectBySlug("pub-b", db);
    expect(project?.slug).toBe("pub-b");
    expect(project?.categories).toEqual(["fine-art"]);
    expect(project?.gallery).toHaveLength(1);
  });

  it("CA-07: getPublishedProjectBySlug retorna null para slug inexistente", async () => {
    expect(await getPublishedProjectBySlug("nao-existe", db)).toBeNull();
  });

  it("CA-07: getPublishedProjectBySlug retorna null para projeto DRAFT ou ARCHIVED", async () => {
    expect(await getPublishedProjectBySlug("rascunho", db)).toBeNull();
    expect(await getPublishedProjectBySlug("arquivado", db)).toBeNull();
  });
});

describe("repositório de projetos — ida e volta do seed (CA-07)", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seed(db);
  });

  it("CA-07: listPublishedProjects após o seed é igual a sortProjects(DEMO_PROJECTS)", async () => {
    expect(await listPublishedProjects(db)).toEqual(sortProjects(DEMO_PROJECTS));
  });

  it("CA-07: getPublishedProjectBySlug devolve o mesmo projeto de DEMO_PROJECTS", async () => {
    const expected = DEMO_PROJECTS[3];
    expect(await getPublishedProjectBySlug(expected.slug, db)).toEqual(expected);
  });

  it("CA-07: listCategories devolve as categorias na ordem de CATEGORIES", async () => {
    expect(await listCategories(db)).toEqual(CATEGORIES);
  });
});

describe("repositório de projetos — cascata (CA-07)", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seed(db);
  });

  it("CA-07: apagar um projeto apaga suas mídias e vínculos de categoria, mas não as categorias", async () => {
    const target = await db.project.findUniqueOrThrow({ where: { slug: DEMO_PROJECTS[0].slug } });
    const mediaBefore = await db.media.count();
    const linksBefore = await db.projectCategory.count();
    const ownMedia = await db.media.count({ where: { projectId: target.id } });
    const ownLinks = await db.projectCategory.count({ where: { projectId: target.id } });
    expect(ownMedia).toBe(3);
    expect(ownLinks).toBeGreaterThan(0);

    await db.project.delete({ where: { id: target.id } });

    expect(await db.media.count({ where: { projectId: target.id } })).toBe(0);
    expect(await db.projectCategory.count({ where: { projectId: target.id } })).toBe(0);
    expect(await db.media.count()).toBe(mediaBefore - ownMedia);
    expect(await db.projectCategory.count()).toBe(linksBefore - ownLinks);
    expect(await db.category.count()).toBe(4);
    expect(await db.project.count()).toBe(9);
  });
});
