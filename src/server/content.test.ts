// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_HERO, DEMO_PROJECTS } from "@/content/demo";
import { sortProjects } from "@/lib/projects";
import { makeProject } from "@/test/fixtures";

/**
 * `next/cache` e o repositório são mockados: aqui só se verifica a camada de conteúdo
 * (escolha da fonte, delegação, tags de cache e propagação de erros).
 */
const mocks = vi.hoisted(() => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
  listPublishedProjects: vi.fn(),
  getPublishedProjectBySlug: vi.fn(),
  listPublishedSlugs: vi.fn(),
  listCategories: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheTag: mocks.cacheTag,
  cacheLife: mocks.cacheLife,
  // Variantes antigas, caso a implementação as use.
  unstable_cacheTag: mocks.cacheTag,
  unstable_cacheLife: mocks.cacheLife,
}));

vi.mock("@/server/repositories/projects", () => ({
  listPublishedProjects: mocks.listPublishedProjects,
  getPublishedProjectBySlug: mocks.getPublishedProjectBySlug,
  listPublishedSlugs: mocks.listPublishedSlugs,
  listCategories: mocks.listCategories,
}));

const DB_URL = "postgresql://portfolio:portfolio@localhost:5434/portfolio?schema=public";

/** Importa `content` de novo, depois de ajustar o ambiente (a fonte pode ser lida no import). */
async function loadContent() {
  vi.resetModules();
  return import("./content");
}

function useDemo() {
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("DATABASE_URL", "");
}

function useDatabase() {
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("DATABASE_URL", DB_URL);
}

/** Todos os argumentos passados a cacheTag, em qualquer número de chamadas. */
function taggedWith(): unknown[] {
  return mocks.cacheTag.mock.calls.flat();
}

function expectRepositoryUntouched() {
  expect(mocks.listPublishedProjects).not.toHaveBeenCalled();
  expect(mocks.getPublishedProjectBySlug).not.toHaveBeenCalled();
  expect(mocks.listPublishedSlugs).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.unstubAllEnvs();
  for (const fn of Object.values(mocks)) fn.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('TASK-04b: content em modo "demo" (CA-02)', () => {
  beforeEach(useDemo);

  it("CA-02: getPublishedProjects devolve DEMO_PROJECTS ordenado por sortOrder, sem tocar no banco", async () => {
    const { getPublishedProjects } = await loadContent();
    expect(await getPublishedProjects()).toEqual(sortProjects(DEMO_PROJECTS));
    expectRepositoryUntouched();
  });

  it("CA-02: getPublishedProject(slug) devolve o projeto demo correspondente", async () => {
    const { getPublishedProject } = await loadContent();
    const expected = DEMO_PROJECTS[2];
    expect(await getPublishedProject(expected.slug)).toEqual(expected);
    expectRepositoryUntouched();
  });

  it("CA-02: getPublishedProject com slug inexistente devolve null (não undefined)", async () => {
    const { getPublishedProject } = await loadContent();
    expect(await getPublishedProject("nao-existe")).toBeNull();
  });

  it("CA-02: getPublishedSlugs devolve os slugs de DEMO_PROJECTS", async () => {
    const { getPublishedSlugs } = await loadContent();
    const slugs = await getPublishedSlugs();
    expect([...slugs].sort()).toEqual(DEMO_PROJECTS.map((p) => p.slug).sort());
    expectRepositoryUntouched();
  });
});

describe('TASK-04b: content em modo "database" (CA-01)', () => {
  beforeEach(useDatabase);

  it("CA-01: getPublishedProjects delega a listPublishedProjects", async () => {
    const fromDb = [makeProject({ isDemo: false }), makeProject({ isDemo: false })];
    mocks.listPublishedProjects.mockResolvedValue(fromDb);
    const { getPublishedProjects } = await loadContent();

    expect(await getPublishedProjects()).toEqual(fromDb);
    expect(mocks.listPublishedProjects).toHaveBeenCalledTimes(1);
  });

  it("CA-01: getPublishedProjects não usa o demo quando o banco está vazio", async () => {
    mocks.listPublishedProjects.mockResolvedValue([]);
    const { getPublishedProjects } = await loadContent();
    expect(await getPublishedProjects()).toEqual([]);
  });

  it("CA-01: getPublishedProject(slug) delega a getPublishedProjectBySlug com o slug", async () => {
    const project = makeProject({ slug: "do-banco", isDemo: false });
    mocks.getPublishedProjectBySlug.mockResolvedValue(project);
    const { getPublishedProject } = await loadContent();

    expect(await getPublishedProject("do-banco")).toEqual(project);
    expect(mocks.getPublishedProjectBySlug).toHaveBeenCalledTimes(1);
    expect(mocks.getPublishedProjectBySlug.mock.calls[0][0]).toBe("do-banco");
  });

  it("CA-01: getPublishedProject devolve null quando o repositório devolve null", async () => {
    mocks.getPublishedProjectBySlug.mockResolvedValue(null);
    const { getPublishedProject } = await loadContent();
    // Um slug demo não deve "vazar" do demo no modo database.
    expect(await getPublishedProject(DEMO_PROJECTS[0].slug)).toBeNull();
  });

  it("CA-01: getPublishedSlugs devolve os slugs publicados do banco", async () => {
    const projects = [makeProject({ slug: "um" }), makeProject({ slug: "dois" })];
    mocks.listPublishedSlugs.mockResolvedValue(["um", "dois"]);
    mocks.listPublishedProjects.mockResolvedValue(projects);
    const { getPublishedSlugs } = await loadContent();

    const slugs = await getPublishedSlugs();
    expect([...slugs].sort()).toEqual(["dois", "um"]);
    const usedRepository =
      mocks.listPublishedSlugs.mock.calls.length + mocks.listPublishedProjects.mock.calls.length;
    expect(usedRepository).toBeGreaterThan(0);
  });

  it("CA-01: getPublishedSlugs com banco vazio devolve lista vazia", async () => {
    mocks.listPublishedSlugs.mockResolvedValue([]);
    mocks.listPublishedProjects.mockResolvedValue([]);
    const { getPublishedSlugs } = await loadContent();
    expect(await getPublishedSlugs()).toEqual([]);
  });
});

describe("TASK-04b: content em modo database — erros não são engolidos (CA-03)", () => {
  beforeEach(useDatabase);

  it("CA-03: erro em listPublishedProjects propaga, sem fallback para o demo", async () => {
    const error = new Error("banco inacessível");
    mocks.listPublishedProjects.mockRejectedValue(error);
    const { getPublishedProjects } = await loadContent();
    await expect(getPublishedProjects()).rejects.toThrow("banco inacessível");
  });

  it("CA-03: erro em getPublishedProjectBySlug propaga", async () => {
    mocks.getPublishedProjectBySlug.mockRejectedValue(new Error("banco inacessível"));
    const { getPublishedProject } = await loadContent();
    await expect(getPublishedProject(DEMO_PROJECTS[0].slug)).rejects.toThrow("banco inacessível");
  });

  it("CA-03: erro ao listar slugs propaga", async () => {
    mocks.listPublishedSlugs.mockRejectedValue(new Error("banco inacessível"));
    mocks.listPublishedProjects.mockRejectedValue(new Error("banco inacessível"));
    const { getPublishedSlugs } = await loadContent();
    await expect(getPublishedSlugs()).rejects.toThrow("banco inacessível");
  });
});

describe("TASK-04b: content — tags e tempo de vida do cache", () => {
  beforeEach(useDatabase);

  it('getPublishedProjects marca o resultado com cacheTag("projects") e define cacheLife', async () => {
    mocks.listPublishedProjects.mockResolvedValue([]);
    const { getPublishedProjects } = await loadContent();
    await getPublishedProjects();

    expect(taggedWith()).toContain("projects");
    expect(mocks.cacheLife).toHaveBeenCalled();
  });

  it('getPublishedProject(slug) usa as tags "projects" e "project:<slug>" e define cacheLife', async () => {
    mocks.getPublishedProjectBySlug.mockResolvedValue(makeProject({ slug: "abc" }));
    const { getPublishedProject } = await loadContent();
    await getPublishedProject("abc");

    expect(taggedWith()).toEqual(expect.arrayContaining(["projects", "project:abc"]));
    expect(mocks.cacheLife).toHaveBeenCalled();
  });

  it("getPublishedProject não marca a tag de outro slug", async () => {
    mocks.getPublishedProjectBySlug.mockResolvedValue(null);
    const { getPublishedProject } = await loadContent();
    await getPublishedProject("xyz");

    const projectTags = taggedWith().filter(
      (t) => typeof t === "string" && t.startsWith("project:"),
    );
    expect(projectTags).toEqual(["project:xyz"]);
  });

  it("cacheLife usa um perfil de longa duração (não seconds/minutes)", async () => {
    mocks.listPublishedProjects.mockResolvedValue([]);
    const { getPublishedProjects } = await loadContent();
    await getPublishedProjects();

    for (const [profile] of mocks.cacheLife.mock.calls) {
      expect(profile).not.toBe("seconds");
      expect(profile).not.toBe("minutes");
    }
  });
});

describe("TASK-04b: content — imagem de abertura e produção", () => {
  it("getHeroImage devolve DEMO_HERO (até a TASK-07), em qualquer modo", async () => {
    useDemo();
    let content = await loadContent();
    expect(content.getHeroImage()).toEqual(DEMO_HERO);

    useDatabase();
    content = await loadContent();
    expect(content.getHeroImage()).toEqual(DEMO_HERO);
  });

  it("CA-03: em produção sem DATABASE_URL, buscar projetos falha (não cai no demo)", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    const attempt = (async () => {
      const { getPublishedProjects } = await loadContent();
      return getPublishedProjects();
    })();
    await expect(attempt).rejects.toThrow(/DATABASE_URL/);
    expectRepositoryUntouched();
  });
});
