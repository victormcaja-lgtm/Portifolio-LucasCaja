import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectPage, { generateMetadata, generateStaticParams } from "@/app/trabalhos/[slug]/page";
import { DEMO_PROJECTS } from "@/content/demo";
import { collectImageCredits } from "@/lib/credits";
import { buildProjectMetadata } from "@/lib/metadata";
import { getAdjacentProjects, sortProjects } from "@/lib/projects";

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
