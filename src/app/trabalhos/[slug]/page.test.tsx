import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectPage, { generateMetadata, generateStaticParams } from "@/app/trabalhos/[slug]/page";
import { DEMO_PROJECTS } from "@/content/demo";
import { collectImageCredits } from "@/lib/credits";
import { buildProjectMetadata } from "@/lib/metadata";
import { getAdjacentProjects, getProjectBySlug, sortProjects } from "@/lib/projects";
import { makeProject } from "@/test/fixtures";

/**
 * `notFound()` do Next lança um erro especial que interrompe a renderização.
 * Aqui ele é simulado lançando um Error identificável, para verificar a chamada.
 */
const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, notFound: notFoundMock };
});

/**
 * TASK-04b: a página lê de `@/server/content` (mockado). Por padrão, o mock devolve os dados
 * demo, que servem de fixture.
 */
const content = vi.hoisted(() => ({
  getPublishedProjects: vi.fn(),
  getPublishedProject: vi.fn(),
  getPublishedSlugs: vi.fn(),
  getHeroImage: vi.fn(),
}));

vi.mock("@/server/content", () => content);

/** Parâmetro reservado devolvido por generateStaticParams quando não há slugs. */
const RESERVED_SLUG = "__vazio__";

/**
 * Hipótese: a página é um Server Component async que só usa `await params` e funções puras
 * (sem cookies/headers/fetch). Assim, `await ProjectPage({ params })` devolve um elemento
 * React que pode ser renderizado no jsdom.
 */
type RouteProps = { params: Promise<{ slug: string }> };
const Page = ProjectPage as unknown as (props: RouteProps) => Promise<ReactElement>;
const getMetadata = generateMetadata as unknown as (props: RouteProps) => Promise<unknown>;
const getStaticParams = generateStaticParams as unknown as () =>
  | Array<{ slug: string }>
  | Promise<Array<{ slug: string }>>;

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

const sorted = sortProjects(DEMO_PROJECTS);
const target = sorted[0];

async function renderPage(slug: string) {
  const element = await Page(params(slug));
  return render(element);
}

beforeEach(() => {
  notFoundMock.mockClear();
  for (const fn of Object.values(content)) fn.mockReset();
  content.getPublishedProjects.mockImplementation(async () => sortProjects(DEMO_PROJECTS));
  content.getPublishedProject.mockImplementation(
    async (slug: string) => getProjectBySlug(DEMO_PROJECTS, slug) ?? null,
  );
  content.getPublishedSlugs.mockImplementation(async () => DEMO_PROJECTS.map((p) => p.slug));
});

describe("Rota /trabalhos/[slug] — CA-05 geração estática", () => {
  it("CA-05: generateStaticParams retorna os 10 slugs de DEMO_PROJECTS", async () => {
    const result = await getStaticParams();
    expect(result).toHaveLength(DEMO_PROJECTS.length);
    expect(result.map((p) => p.slug).sort()).toEqual(DEMO_PROJECTS.map((p) => p.slug).sort());
    for (const entry of result) expect(Object.keys(entry)).toEqual(["slug"]);
  });

  it("CA-05: slug inexistente → a página chama notFound()", async () => {
    await expect(Page(params("slug-que-nao-existe"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("CA-05: slug existente não chama notFound()", async () => {
    await Page(params(target.slug));
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});

describe("Rota /trabalhos/[slug] — CA-07 metadata", () => {
  it("CA-07: generateMetadata retorna { title: { absolute }, description } de buildProjectMetadata para cada projeto demo", async () => {
    for (const project of DEMO_PROJECTS) {
      const metadata = await getMetadata(params(project.slug));
      const meta = buildProjectMetadata(project);
      // title.absolute evita que o title.template do layout duplique o nome do site.
      expect(metadata).toEqual({ title: { absolute: meta.title }, description: meta.description });
    }
  });

  it("CA-05/CA-07: generateMetadata com slug inexistente chama notFound()", async () => {
    await expect(getMetadata(params("slug-que-nao-existe"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });
});

describe("Rota /trabalhos/[slug] — composição da página", () => {
  it('renderiza SiteHeader com variant "solid"', async () => {
    await renderPage(target.slug);
    expect(screen.getByRole("banner")).toHaveAttribute("data-variant", "solid");
  });

  it('renderiza <main id="conteudo"> com o ProjectView do projeto', async () => {
    await renderPage(target.slug);
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "conteudo");
    const article = within(main).getByRole("article");
    expect(within(article).getByRole("heading", { level: 1 })).toHaveTextContent(target.title);
    expect(within(main).getByRole("img", { name: target.cover.alt })).toBeInTheDocument();
    for (const image of target.gallery) {
      expect(within(main).getByRole("img", { name: image.alt })).toBeInTheDocument();
    }
  });

  it("CA-11: a página tem um único h1", async () => {
    const { container } = await renderPage(target.slug);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("CA-04: a navegação aponta para os vizinhos de getAdjacentProjects", async () => {
    await renderPage(target.slug);
    const { previous, next } = getAdjacentProjects(DEMO_PROJECTS, target.slug);
    const nav = screen.getByRole("navigation", { name: "Outros trabalhos" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain(`/trabalhos/${previous!.slug}`);
    expect(hrefs).toContain(`/trabalhos/${next!.slug}`);
  });

  it("CA-10: o rodapé lista só os créditos das imagens do projeto (capa + galeria)", async () => {
    await renderPage(target.slug);
    const footer = screen.getByRole("contentinfo");
    const expected = collectImageCredits([target.cover, ...target.gallery]);
    expect(expected.length).toBeGreaterThan(0);
    const creditLinks = within(footer)
      .queryAllByRole("link")
      .filter((a) => /unsplash\.com/.test(a.getAttribute("href") ?? ""));
    expect(creditLinks).toHaveLength(expected.length);
    expected.forEach((credit, i) => {
      expect(creditLinks[i]).toHaveAttribute("href", credit.sourceUrl);
      expect(creditLinks[i]).toHaveTextContent(credit.author);
    });
  });

  it("CA-10: créditos de outros projetos não aparecem", async () => {
    await renderPage(target.slug);
    const footer = screen.getByRole("contentinfo");
    const own = new Set(
      collectImageCredits([target.cover, ...target.gallery]).map((c) => c.sourceUrl),
    );
    const others = DEMO_PROJECTS.filter((p) => p.slug !== target.slug)
      .flatMap((p) => collectImageCredits([p.cover, ...p.gallery]))
      .filter((c) => !own.has(c.sourceUrl));
    expect(others.length).toBeGreaterThan(0);
    const hrefs = within(footer)
      .queryAllByRole("link")
      .map((a) => a.getAttribute("href"));
    for (const credit of others) expect(hrefs).not.toContain(credit.sourceUrl);
  });

  it("CA-02: na página, só a capa é prioritária", async () => {
    const { container } = await renderPage(target.slug);
    const prioritized = [...container.querySelectorAll("img")].filter(
      (img) => img.getAttribute("fetchpriority") === "high" || img.getAttribute("loading") === "eager",
    );
    expect(prioritized.map((img) => img.getAttribute("alt"))).toEqual([target.cover.alt]);
  });

  it("CA-05: todas as rotas demo renderizam o projeto correspondente", async () => {
    for (const project of DEMO_PROJECTS) {
      const { unmount } = await renderPage(project.slug);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(project.title);
      unmount();
    }
  });
});

describe("TASK-04b: generateStaticParams lê de getPublishedSlugs (CA-01/CA-04)", () => {
  it("CA-01: devolve um parâmetro por slug de getPublishedSlugs", async () => {
    content.getPublishedSlugs.mockResolvedValue(["do-banco-a", "do-banco-b"]);
    const result = await getStaticParams();
    expect(content.getPublishedSlugs).toHaveBeenCalled();
    expect(result).toEqual([{ slug: "do-banco-a" }, { slug: "do-banco-b" }]);
  });

  it("CA-04: com zero slugs, devolve um único parâmetro reservado (__vazio__), nunca lista vazia", async () => {
    content.getPublishedSlugs.mockResolvedValue([]);
    const result = await getStaticParams();
    expect(result).toEqual([{ slug: RESERVED_SLUG }]);
  });

  it("com slugs publicados, o parâmetro reservado não aparece", async () => {
    const result = await getStaticParams();
    expect(result.map((p) => p.slug)).not.toContain(RESERVED_SLUG);
  });

  it("CA-03: erro ao listar slugs propaga (o build falha)", async () => {
    content.getPublishedSlugs.mockRejectedValue(new Error("banco inacessível"));
    await expect(Promise.resolve().then(() => getStaticParams())).rejects.toThrow(
      "banco inacessível",
    );
  });
});

describe("TASK-04b: a página de projeto lê de @/server/content (CA-01/CA-04)", () => {
  it("CA-04: o slug reservado __vazio__ responde com notFound()", async () => {
    content.getPublishedSlugs.mockResolvedValue([]);
    content.getPublishedProjects.mockResolvedValue([]);
    content.getPublishedProject.mockResolvedValue(null);
    await expect(Page(params(RESERVED_SLUG))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("CA-04: generateMetadata com o slug reservado também chama notFound()", async () => {
    content.getPublishedProject.mockResolvedValue(null);
    await expect(getMetadata(params(RESERVED_SLUG))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("CA-04: __vazio__ responde 404 mesmo que a fonte devolvesse algo para ele", async () => {
    content.getPublishedProject.mockResolvedValue(makeProject({ slug: RESERVED_SLUG }));
    await expect(Page(params(RESERVED_SLUG))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("CA-01: resolve o projeto com getPublishedProject(slug)", async () => {
    const project = makeProject({ slug: "so-no-banco", title: "Só no Banco", isDemo: false });
    const other = makeProject({ slug: "vizinho", title: "Vizinho", isDemo: false });
    content.getPublishedProject.mockImplementation(async (slug: string) =>
      slug === project.slug ? project : null,
    );
    content.getPublishedProjects.mockResolvedValue(sortProjects([project, other]));

    await renderPage("so-no-banco");

    expect(content.getPublishedProject).toHaveBeenCalledWith("so-no-banco");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Só no Banco");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("CA-01: projeto ausente da fonte → notFound(), mesmo que exista no demo", async () => {
    content.getPublishedProject.mockResolvedValue(null);
    await expect(Page(params(target.slug))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("CA-01: anterior/próximo vêm de getPublishedProjects com getAdjacentProjects", async () => {
    const a = makeProject({ slug: "a-banco", title: "A do banco", sortOrder: 1, isDemo: false });
    const b = makeProject({ slug: "b-banco", title: "B do banco", sortOrder: 2, isDemo: false });
    const c = makeProject({ slug: "c-banco", title: "C do banco", sortOrder: 3, isDemo: false });
    const all = [a, b, c];
    content.getPublishedProjects.mockResolvedValue(all);
    content.getPublishedProject.mockImplementation(
      async (slug: string) => all.find((p) => p.slug === slug) ?? null,
    );

    await renderPage("b-banco");

    expect(content.getPublishedProjects).toHaveBeenCalled();
    const nav = screen.getByRole("navigation", { name: "Outros trabalhos" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/trabalhos/a-banco");
    expect(hrefs).toContain("/trabalhos/c-banco");
    for (const p of DEMO_PROJECTS) expect(hrefs).not.toContain(`/trabalhos/${p.slug}`);
  });

  it("CA-03: erro da fonte de dados propaga (sem fallback para o demo)", async () => {
    content.getPublishedProject.mockRejectedValue(new Error("banco inacessível"));
    await expect(Page(params(target.slug))).rejects.toThrow("banco inacessível");
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
