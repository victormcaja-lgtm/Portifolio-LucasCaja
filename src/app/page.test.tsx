import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";
import { DEMO_HERO, DEMO_PROJECTS } from "@/content/demo";

function precedes(a: Node, b: Node): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function expectedCredits(): string[] {
  const all = [DEMO_HERO.credit, ...DEMO_PROJECTS.map((p) => p.cover.credit)];
  return [...new Set(all.filter((c) => c !== undefined).map((c) => `${c.author}|${c.sourceUrl}`))];
}

describe("Página inicial (/)", () => {
  it('CA-11: primeiro link é "Pular para o conteúdo" com alvo #conteudo', () => {
    render(<Home />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAccessibleName("Pular para o conteúdo");
    expect(links[0]).toHaveAttribute("href", "#conteudo");
  });

  it("CA-11: ordem skip link → header → main#conteudo → footer", () => {
    render(<Home />);
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

  it("CA-11: main contém Hero (DEMO_HERO), DemoNotice e EditorialGrid, nesta ordem", () => {
    render(<Home />);
    const main = screen.getByRole("main");
    const heroImg = within(main).getByRole("img", { name: DEMO_HERO.alt });
    const h1 = within(main).getByRole("heading", { level: 1 });
    const note = within(main).getByRole("note");
    const grid = within(main).getByRole("region", { name: "Trabalhos" });

    expect(heroImg.closest("section")).toBe(h1.closest("section"));
    expect(precedes(h1, note)).toBe(true);
    expect(precedes(note, grid)).toBe(true);
  });

  it("CA-11: a grade exibe os 10 projetos de DEMO_PROJECTS", () => {
    render(<Home />);
    const grid = screen.getByRole("region", { name: "Trabalhos" });
    expect(within(grid).getAllByRole("listitem")).toHaveLength(DEMO_PROJECTS.length);
    for (const p of DEMO_PROJECTS) {
      expect(within(grid).getByRole("heading", { level: 3, name: p.title })).toBeInTheDocument();
    }
  });

  it("CA-01/CA-11: a página tem um único h1", () => {
    const { container } = render(<Home />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("CA-11: rodapé lista créditos do hero e das capas, sem duplicatas de autor+URL", () => {
    render(<Home />);
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

  it("CA-12: todas as imagens vêm de next/image e têm sizes", () => {
    const { container } = render(<Home />);
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBeGreaterThanOrEqual(1 + DEMO_PROJECTS.length);
    for (const img of imgs) {
      expect(img).toHaveAttribute("data-next-image", "true");
      expect(img.getAttribute("sizes")?.trim()).toBeTruthy();
      expect(img.getAttribute("alt")).not.toBeNull();
    }
  });

  it("CA-12: somente a imagem do hero é carregada com prioridade", () => {
    const { container } = render(<Home />);
    const prioritized = [...container.querySelectorAll("img")].filter(
      (img) => img.getAttribute("fetchpriority") === "high" || img.getAttribute("loading") === "eager",
    );
    expect(prioritized.map((img) => img.getAttribute("alt"))).toEqual([DEMO_HERO.alt]);
  });
});
