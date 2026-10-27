import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { DEMO_HERO, DEMO_PROJECTS } from "@/content/demo";
import { sortProjects } from "@/lib/projects";
import type { Project } from "@/lib/types";
import { makeImage, makeProject } from "@/test/fixtures";

/**
 * TASK-04b: a home lê os dados de `@/server/content` (mockado aqui). Os dados demo continuam
 * servindo de fixture. A fonte ("database" | "demo") é determinada pelo ambiente
 * (`getContentSource`, que lê DATABASE_URL); por isso ela é controlada com `vi.stubEnv`.
 */
const content = vi.hoisted(() => ({
  getPublishedProjects: vi.fn(),
  getPublishedProject: vi.fn(),
  getPublishedSlugs: vi.fn(),
  getHeroImage: vi.fn(),
}));

vi.mock("@/server/content", () => content);

const DB_URL = "postgresql://portfolio:portfolio@localhost:5434/portfolio?schema=public";

/** A home passa a ser um Server Component async. */
const Page = Home as unknown as () => ReactElement | Promise<ReactElement>;

async function renderHome() {
  return render(await Page());
}

function useDemoSource() {
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("DATABASE_URL", "");
}

function useDatabaseSource() {
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("DATABASE_URL", DB_URL);
}

function withProjects(projects: Project[]) {
  content.getPublishedProjects.mockResolvedValue(projects);
}

function precedes(a: Node, b: Node): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function expectedCredits(): string[] {
  const all = [DEMO_HERO.credit, ...DEMO_PROJECTS.map((p) => p.cover.credit)];
  return [...new Set(all.filter((c) => c !== undefined).map((c) => `${c.author}|${c.sourceUrl}`))];
}

beforeEach(() => {
  vi.unstubAllEnvs();
  for (const fn of Object.values(content)) fn.mockReset();
  useDemoSource();
  withProjects(sortProjects(DEMO_PROJECTS));
  content.getHeroImage.mockReturnValue(DEMO_HERO);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Página inicial (/)", () => {
  it('CA-11: primeiro link é "Pular para o conteúdo" com alvo #conteudo', async () => {
    await renderHome();
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAccessibleName("Pular para o conteúdo");
    expect(links[0]).toHaveAttribute("href", "#conteudo");
  });

  it("CA-11: ordem skip link → header → main#conteudo → footer", async () => {
    await renderHome();
    const skip = screen.getByRole("link", { name: "Pular para o conteúdo" });
    const header = screen.getByRole("banner");
    const main = screen.getByRole("main");
    const footer = screen.getByRole("contentinfo");

    expect(main).toHaveAttribute("id", "conteudo");
    expect(precedes(skip, header)).toBe(true);
    expect(precedes(header, main)).toBe(true);
    expect(precedes(main, footer)).toBe(true);
    expect(main.contains(header)).toBe(false);
    expect(main.contains(footer)).toBe(false);
  });

  it("CA-11: main contém Hero (DEMO_HERO), DemoNotice e EditorialGrid, nesta ordem", async () => {
    await renderHome();
    const main = screen.getByRole("main");
    const heroImg = within(main).getByRole("img", { name: DEMO_HERO.alt });
    const h1 = within(main).getByRole("heading", { level: 1 });
    const note = within(main).getByRole("note");
    const grid = within(main).getByRole("region", { name: "Trabalhos" });

    expect(heroImg.closest("section")).toBe(h1.closest("section"));
    expect(precedes(h1, note)).toBe(true);
    expect(precedes(note, grid)).toBe(true);
  });

  it("CA-11: a grade exibe os 10 projetos de DEMO_PROJECTS", async () => {
    await renderHome();
    const grid = screen.getByRole("region", { name: "Trabalhos" });
    expect(within(grid).getAllByRole("listitem")).toHaveLength(DEMO_PROJECTS.length);
    for (const p of DEMO_PROJECTS) {
      expect(within(grid).getByRole("heading", { level: 3, name: p.title })).toBeInTheDocument();
    }
  });

  it("CA-01/CA-11: a página tem um único h1", async () => {
    const { container } = await renderHome();
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("CA-11: rodapé lista créditos do hero e das capas, sem duplicatas de autor+URL", async () => {
    await renderHome();
    const footer = screen.getByRole("contentinfo");
    const links = within(footer).queryAllByRole("link");
    const expected = expectedCredits();
    expect(expected.length).toBeGreaterThan(0);
    for (const key of expected) {
      const [author, url] = key.split("|");
      const matches = links.filter(
        (a) => a.getAttribute("href") === url && (a.textContent ?? "").includes(author),
      );
      expect(matches, `crédito ${author} (${url})`).toHaveLength(1);
    }
  });

  it("CA-12: todas as imagens vêm de next/image e têm sizes", async () => {
    const { container } = await renderHome();
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBeGreaterThanOrEqual(1 + DEMO_PROJECTS.length);
    for (const img of imgs) {
      expect(img).toHaveAttribute("data-next-image", "true");
      expect(img.getAttribute("sizes")?.trim()).toBeTruthy();
      expect(img.getAttribute("alt")).not.toBeNull();
    }
  });

  it("CA-08 (TASK-02): cada card da grade tem exatamente um link para /trabalhos/{slug} com nome = título", async () => {
    await renderHome();
    const grid = screen.getByRole("region", { name: "Trabalhos" });
    const items = within(grid).getAllByRole("listitem");
    expect(items).toHaveLength(DEMO_PROJECTS.length);
    for (const li of items) {
      const title = within(li).getByRole("heading", { level: 3 }).textContent ?? "";
      const project = DEMO_PROJECTS.find((p) => p.title === title);
      expect(project, `projeto "${title}"`).toBeDefined();
      const links = within(li).getAllByRole("link");
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute("href", `/trabalhos/${project!.slug}`);
      expect(links[0]).toHaveAccessibleName(project!.title);
    }
  });

  it("CA-09 (TASK-02): o header da home usa variant overlay e links /#trabalhos e /#contato", async () => {
    await renderHome();
    const header = screen.getByRole("banner");
    expect(header).toHaveAttribute("data-variant", "overlay");
    const nav = within(header).getByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: "Trabalhos" })).toHaveAttribute("href", "/#trabalhos");
    expect(within(nav).getByRole("link", { name: "Contato" })).toHaveAttribute("href", "/#contato");
  });

  it('CA-15 (TASK-02): o <img> do hero tem fetchpriority="high" e loading="eager"', async () => {
    await renderHome();
    const hero = screen.getByRole("img", { name: DEMO_HERO.alt });
    expect(hero).toHaveAttribute("fetchpriority", "high");
    expect(hero).toHaveAttribute("loading", "eager");
  });

  it("CA-12: somente a imagem do hero é carregada com prioridade", async () => {
    const { container } = await renderHome();
    const prioritized = [...container.querySelectorAll("img")].filter(
      (img) => img.getAttribute("fetchpriority") === "high" || img.getAttribute("loading") === "eager",
    );
    expect(prioritized.map((img) => img.getAttribute("alt"))).toEqual([DEMO_HERO.alt]);
  });
});

describe("TASK-04b: a home lê de @/server/content (CA-01)", () => {
  it("CA-01: a grade mostra os projetos devolvidos por getPublishedProjects, não o demo", async () => {
    useDatabaseSource();
    const projects = [
      makeProject({ title: "Projeto Vindo do Banco", slug: "vindo-do-banco", isDemo: false }),
      makeProject({ title: "Outro do Banco", slug: "outro-do-banco", isDemo: false }),
    ];
    withProjects(projects);
    await renderHome();

    expect(content.getPublishedProjects).toHaveBeenCalled();
    const grid = screen.getByRole("region", { name: "Trabalhos" });
    expect(within(grid).getAllByRole("listitem")).toHaveLength(2);
    expect(within(grid).getByRole("link", { name: "Projeto Vindo do Banco" })).toHaveAttribute(
      "href",
      "/trabalhos/vindo-do-banco",
    );
    expect(within(grid).queryByRole("heading", { name: DEMO_PROJECTS[0].title })).toBeNull();
  });

  it("CA-01: a imagem de abertura vem de getHeroImage()", async () => {
    const hero = makeImage({
      alt: "Imagem de abertura de teste",
      credit: { author: "Autora do Hero", sourceUrl: "https://unsplash.com/photos/hero-teste" },
    });
    content.getHeroImage.mockReturnValue(hero);
    await renderHome();

    expect(content.getHeroImage).toHaveBeenCalled();
    const img = screen.getByRole("img", { name: "Imagem de abertura de teste" });
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(screen.queryByRole("img", { name: DEMO_HERO.alt })).toBeNull();
  });

  it("CA-01: os créditos do rodapé são calculados a partir dos dados recebidos", async () => {
    useDatabaseSource();
    const hero = makeImage({
      alt: "Hero com crédito próprio",
      credit: { author: "Autora do Hero", sourceUrl: "https://unsplash.com/photos/hero-x" },
    });
    const project = makeProject({
      isDemo: false,
      cover: makeImage({
        alt: "Capa com crédito próprio",
        credit: { author: "Autor da Capa", sourceUrl: "https://unsplash.com/photos/capa-x" },
      }),
    });
    content.getHeroImage.mockReturnValue(hero);
    withProjects([project]);
    await renderHome();

    const footer = screen.getByRole("contentinfo");
    const hrefs = within(footer)
      .queryAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://unsplash.com/photos/hero-x");
    expect(hrefs).toContain("https://unsplash.com/photos/capa-x");
    // Nenhum crédito de capa demo que não esteja nos dados recebidos.
    const demoOnly = DEMO_PROJECTS.map((p) => p.cover.credit?.sourceUrl).filter(
      (url): url is string => typeof url === "string" && url !== DEMO_HERO.credit?.sourceUrl,
    );
    for (const url of demoOnly) expect(hrefs).not.toContain(url);
  });
});

describe("TASK-04b: DemoNotice condicional", () => {
  it('fonte "database" com projetos isDemo=false → sem aviso de demonstração', async () => {
    useDatabaseSource();
    withProjects([makeProject({ isDemo: false }), makeProject({ isDemo: false })]);
    await renderHome();

    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.queryByText("Conteúdo de demonstração")).toBeNull();
  });

  it('fonte "database" com algum projeto isDemo=true → mostra o aviso', async () => {
    useDatabaseSource();
    withProjects([makeProject({ isDemo: false }), makeProject({ isDemo: true })]);
    await renderHome();

    expect(screen.getByRole("note")).toHaveTextContent("Conteúdo de demonstração");
  });

  it('fonte "database" com os dados do seed (isDemo=true) → mostra o aviso', async () => {
    useDatabaseSource();
    withProjects(sortProjects(DEMO_PROJECTS));
    await renderHome();

    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it('fonte "demo" → mostra o aviso mesmo que nenhum projeto seja isDemo', async () => {
    useDemoSource();
    withProjects([makeProject({ isDemo: false })]);
    await renderHome();

    expect(screen.getByRole("note")).toHaveTextContent("Conteúdo de demonstração");
  });

  it('fonte "database" sem projetos → sem aviso', async () => {
    useDatabaseSource();
    withProjects([]);
    await renderHome();

    expect(screen.queryByRole("note")).toBeNull();
  });
});

describe("TASK-04b: estado vazio da home (CA-04)", () => {
  const EMPTY = "Nenhum trabalho publicado no momento.";

  beforeEach(() => {
    useDatabaseSource();
    withProjects([]);
  });

  it("CA-04: sem projetos publicados, a seção #trabalhos mostra a mensagem de estado vazio", async () => {
    const { container } = await renderHome();
    const section = container.querySelector("#trabalhos");
    expect(section).not.toBeNull();
    expect(within(section as HTMLElement).getByText(EMPTY)).toBeInTheDocument();
  });

  it("CA-04: o estado vazio não tem filtro de categorias nem contador", async () => {
    const { container } = await renderHome();
    const section = container.querySelector("#trabalhos") as HTMLElement;
    expect(within(section).queryByRole("group", { name: "Filtrar por categoria" })).toBeNull();
    expect(within(section).queryAllByRole("button")).toHaveLength(0);
    expect(within(section).queryByText(/\b\d+\s+projetos?\b/i)).toBeNull();
  });

  it("CA-04: o estado vazio não renderiza cards nem links de projeto", async () => {
    const { container } = await renderHome();
    const section = container.querySelector("#trabalhos") as HTMLElement;
    expect(within(section).queryAllByRole("listitem")).toHaveLength(0);
    const projectLinks = screen
      .queryAllByRole("link")
      .filter((a) => (a.getAttribute("href") ?? "").startsWith("/trabalhos/"));
    expect(projectLinks).toHaveLength(0);
  });

  it("CA-04: a mensagem usa a tipografia sans e a cor text-ink-muted do design system", async () => {
    const { container } = await renderHome();
    const section = container.querySelector("#trabalhos") as HTMLElement;
    const message = within(section).getByText(EMPTY);
    // As classes podem estar no próprio elemento ou num contêiner dentro da seção.
    const sans = message.closest(".font-sans");
    const muted = message.closest(".text-ink-muted");
    expect(sans && section.contains(sans)).toBe(true);
    expect(muted && section.contains(muted)).toBe(true);
  });

  it("CA-04: o restante da página continua íntegro (hero, h1 único, header e rodapé)", async () => {
    const { container } = await renderHome();
    expect(screen.getByRole("img", { name: DEMO_HERO.alt })).toBeInTheDocument();
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "conteudo");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
