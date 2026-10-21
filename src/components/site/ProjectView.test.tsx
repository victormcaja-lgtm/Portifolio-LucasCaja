import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectView } from "@/components/site/ProjectView";
import { getCategoryName } from "@/lib/categories";
import type { Project } from "@/lib/types";
import { makeImage, makeProject } from "@/test/fixtures";

const gallery = [1, 2, 3, 4].map((n) =>
  makeImage({
    src: `https://picsum.photos/id/${100 + n}/1200/1500?grayscale`,
    alt: `Fotografia ${n} da galeria (demonstração)`,
  }),
);

const project: Project = makeProject({
  slug: "serie-atual",
  title: "Série Demonstração Atual",
  categories: ["fashion-editorial", "filme"],
  cover: makeImage({
    src: "https://picsum.photos/id/100/2400/1600?grayscale",
    alt: "Capa da série atual (demonstração)",
  }),
  summary: "Texto de demonstração. Ensaio provisório em luz natural.",
  gallery,
  isDemo: true,
});

const previous = makeProject({ slug: "serie-anterior", title: "Série Anterior" });
const next = makeProject({ slug: "serie-seguinte", title: "Série Seguinte" });

function renderView(p: Project = project, prev: Project | null = previous, nxt: Project | null = next) {
  return render(<ProjectView project={p} previous={prev} next={nxt} />);
}

function isPrioritized(img: Element): boolean {
  return img.getAttribute("fetchpriority") === "high" || img.getAttribute("loading") === "eager";
}

function precedes(a: Node, b: Node): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

/** Item da galeria que contém a imagem: o <li> mais externo, ou a <figure>. */
function galleryItem(img: HTMLElement): HTMLElement {
  const item = img.closest<HTMLElement>("li") ?? img.closest<HTMLElement>("figure");
  expect(item, `item da galeria para "${img.getAttribute("alt")}"`).not.toBeNull();
  return item!;
}

describe("ProjectView — CA-01 cabeçalho do projeto", () => {
  it("CA-01: renderiza um <article>", () => {
    renderView();
    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  it("CA-01: h1 = título, único h1, dentro do article", () => {
    const { container } = renderView();
    const article = screen.getByRole("article");
    expect(within(article).getByRole("heading", { level: 1 })).toHaveTextContent(project.title);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("CA-01: exibe os nomes das categorias", () => {
    renderView();
    const article = screen.getByRole("article");
    for (const slug of project.categories) {
      expect(article).toHaveTextContent(getCategoryName(slug));
    }
  });

  it('CA-01: exibe o selo "Demo" quando isDemo', () => {
    renderView();
    expect(within(screen.getByRole("article")).getByText("Demo")).toBeInTheDocument();
  });

  it('CA-01: não exibe o selo "Demo" quando não é demonstração', () => {
    renderView({ ...project, isDemo: false });
    expect(screen.queryByText("Demo")).not.toBeInTheDocument();
  });

  it("CA-01: exibe o summary", () => {
    renderView();
    expect(screen.getByRole("article")).toHaveTextContent(project.summary!);
  });

  it("CA-01: sem summary, renderiza sem erro e mantém o título", () => {
    renderView({ ...project, summary: undefined });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(project.title);
  });

  it('CA-01: conteúdo de demonstração traz "Conteúdo de demonstração" em role="note"', () => {
    renderView();
    const notes = screen.getAllByRole("note");
    expect(notes.some((n) => /Conteúdo de demonstração/.test(n.textContent ?? ""))).toBe(true);
  });

  it('CA-01: conteúdo definitivo (isDemo = false) não traz o aviso "Conteúdo de demonstração"', () => {
    renderView({ ...project, isDemo: false });
    expect(screen.queryByText(/Conteúdo de demonstração/)).not.toBeInTheDocument();
  });
});

describe("ProjectView — CA-02 capa", () => {
  it("CA-02: capa com alt = cover.alt, vinda de next/image, com sizes", () => {
    renderView();
    const cover = screen.getByRole("img", { name: project.cover.alt });
    expect(cover).toHaveAttribute("data-next-image", "true");
    expect(cover.getAttribute("sizes")?.trim()).toBeTruthy();
  });

  it('CA-02: capa com carregamento prioritário (fetchpriority="high" e loading="eager")', () => {
    renderView();
    const cover = screen.getByRole("img", { name: project.cover.alt });
    expect(cover).toHaveAttribute("fetchpriority", "high");
    expect(cover).toHaveAttribute("loading", "eager");
  });

  it("CA-02: nenhuma outra imagem é prioritária", () => {
    const { container } = renderView();
    const prioritized = [...container.querySelectorAll("img")].filter(isPrioritized);
    expect(prioritized.map((img) => img.getAttribute("alt"))).toEqual([project.cover.alt]);
  });

  it("CA-02: a capa vem antes da galeria", () => {
    renderView();
    const cover = screen.getByRole("img", { name: project.cover.alt });
    const firstGallery = screen.getByRole("img", { name: gallery[0].alt });
    expect(precedes(cover, firstGallery)).toBe(true);
  });
});

describe("ProjectView — CA-03 galeria", () => {
  it("CA-03: cada imagem da galeria é renderizada, na ordem, com alt e sizes", () => {
    const { container } = renderView();
    const galleryAlts = new Set(gallery.map((g) => g.alt));
    const rendered = [...container.querySelectorAll("img")].filter((img) =>
      galleryAlts.has(img.getAttribute("alt") ?? ""),
    );
    expect(rendered.map((img) => img.getAttribute("alt"))).toEqual(gallery.map((g) => g.alt));
    for (const img of rendered) {
      expect(img).toHaveAttribute("data-next-image", "true");
      expect(img.getAttribute("sizes")?.trim()).toBeTruthy();
      expect(img).not.toHaveAttribute("fetchpriority", "high");
      expect(img).not.toHaveAttribute("loading", "eager");
    }
  });

  it("CA-03: imagens da galeria ficam em uma lista (<ul>/<li>) ou em <figure>s", () => {
    renderView();
    const items = gallery.map((g) => galleryItem(screen.getByRole("img", { name: g.alt })));
    // Cada imagem tem o seu próprio item.
    expect(new Set(items).size).toBe(gallery.length);
    // Se forem <li>, pertencem todos à mesma lista.
    const lists = new Set(items.map((item) => item.closest("ul, ol")).filter((l) => l !== null));
    expect(lists.size).toBeLessThanOrEqual(1);
  });

  it("CA-03: composição assimétrica — itens consecutivos não têm as mesmas classes, com variação a partir de md", () => {
    renderView();
    const classes = gallery.map((g) => {
      const img = screen.getByRole("img", { name: g.alt });
      const item = galleryItem(img);
      // Considera o item e os elementos entre ele e a imagem (ex.: <figure> dentro de <li>).
      const chain: string[] = [];
      for (let el: HTMLElement | null = img.parentElement; el && el !== item.parentElement; el = el.parentElement) {
        chain.push(el.getAttribute("class") ?? "");
      }
      return chain.join(" | ");
    });
    for (let i = 1; i < classes.length; i += 1) {
      expect(classes[i], `itens ${i} e ${i + 1} da galeria`).not.toBe(classes[i - 1]);
    }
    expect(classes.some((c) => /(^|\s)md:/.test(c))).toBe(true);
  });

  it("CA-03: uma coluna no mobile (nenhum grid-cols > 1 sem prefixo de breakpoint ≥ md)", () => {
    const { container } = renderView();
    const tokens = [...container.querySelectorAll<HTMLElement>("[class]")].flatMap((el) =>
      (el.getAttribute("class") ?? "").split(/\s+/),
    );
    expect(tokens.filter((t) => /^(sm:)?grid-cols-(?!1$)/.test(t))).toEqual([]);
  });

  it("CA-03: galeria vazia não renderiza a lista (nem listas vazias)", () => {
    const { container } = renderView({ ...project, gallery: [] });
    expect(container.querySelectorAll("img")).toHaveLength(1);
    for (const list of container.querySelectorAll("ul, ol")) {
      expect(list.querySelectorAll("li").length, "lista vazia renderizada").toBeGreaterThan(0);
    }
    expect(container.querySelectorAll("figure img").length).toBeLessThanOrEqual(1);
  });
});

describe("ProjectView — navegação (CA-04)", () => {
  it("CA-04: inclui a navegação Outros trabalhos com anterior e próximo", () => {
    renderView();
    const nav = screen.getByRole("navigation", { name: "Outros trabalhos" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/trabalhos/serie-anterior");
    expect(hrefs).toContain("/trabalhos/serie-seguinte");
    expect(hrefs).toContain("/#trabalhos");
  });

  it("CA-04: previous/next null são repassados (sem links de projeto)", () => {
    renderView(project, null, null);
    const nav = screen.getByRole("navigation", { name: "Outros trabalhos" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/#trabalhos"]);
  });

  it("CA-04: a navegação vem depois da galeria", () => {
    renderView();
    const nav = screen.getByRole("navigation", { name: "Outros trabalhos" });
    const lastGallery = screen.getByRole("img", { name: gallery[gallery.length - 1].alt });
    expect(precedes(lastGallery, nav)).toBe(true);
  });
});

describe("ProjectView — CA-11 imagens com alt", () => {
  it("CA-11: todas as imagens têm alt não vazio", () => {
    const { container } = renderView();
    for (const img of container.querySelectorAll("img")) {
      expect(img.getAttribute("alt")?.trim()).toBeTruthy();
    }
  });
});
