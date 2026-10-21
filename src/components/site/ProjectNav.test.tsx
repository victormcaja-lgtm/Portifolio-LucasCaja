import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectNav } from "@/components/site/ProjectNav";
import { makeProject } from "@/test/fixtures";

const previous = makeProject({ slug: "serie-anterior", title: "Série Anterior" });
const next = makeProject({ slug: "serie-seguinte", title: "Série Seguinte" });

function getNav(): HTMLElement {
  return screen.getByRole("navigation", { name: "Outros trabalhos" });
}

function findLink(nav: HTMLElement, label: RegExp): HTMLElement | undefined {
  return within(nav)
    .queryAllByRole("link")
    .find((a) => label.test(a.textContent ?? ""));
}

describe("ProjectNav (CA-04)", () => {
  it('CA-04: renderiza <nav aria-label="Outros trabalhos">', () => {
    render(<ProjectNav previous={previous} next={next} />);
    const nav = getNav();
    expect(nav.tagName).toBe("NAV");
    expect(nav).toHaveAttribute("aria-label", "Outros trabalhos");
  });

  it('CA-04: link "Anterior" aponta para /trabalhos/{previous.slug} e exibe o título', () => {
    render(<ProjectNav previous={previous} next={next} />);
    const link = findLink(getNav(), /Anterior/);
    expect(link).toBeDefined();
    expect(link).toHaveAttribute("href", "/trabalhos/serie-anterior");
    expect(link).toHaveTextContent("Série Anterior");
    expect(link).toHaveAccessibleName(/Anterior/);
    expect(link).toHaveAccessibleName(/Série Anterior/);
  });

  it('CA-04: link "Próximo" aponta para /trabalhos/{next.slug} e exibe o título', () => {
    render(<ProjectNav previous={previous} next={next} />);
    const link = findLink(getNav(), /Próximo/);
    expect(link).toBeDefined();
    expect(link).toHaveAttribute("href", "/trabalhos/serie-seguinte");
    expect(link).toHaveTextContent("Série Seguinte");
    expect(link).toHaveAccessibleName(/Próximo/);
    expect(link).toHaveAccessibleName(/Série Seguinte/);
  });

  it('CA-04: link "Todos os trabalhos" aponta para /#trabalhos', () => {
    render(<ProjectNav previous={previous} next={next} />);
    const link = within(getNav()).getByRole("link", { name: /Todos os trabalhos/ });
    expect(link).toHaveAttribute("href", "/#trabalhos");
  });

  it("CA-04: com previous e next, há exatamente 3 links", () => {
    render(<ProjectNav previous={previous} next={next} />);
    expect(within(getNav()).getAllByRole("link")).toHaveLength(3);
  });

  it('CA-04: previous = null não renderiza o link "Anterior"', () => {
    render(<ProjectNav previous={null} next={next} />);
    const nav = getNav();
    expect(findLink(nav, /Anterior/)).toBeUndefined();
    expect(findLink(nav, /Próximo/)).toHaveAttribute("href", "/trabalhos/serie-seguinte");
    expect(within(nav).getByRole("link", { name: /Todos os trabalhos/ })).toBeInTheDocument();
    expect(within(nav).getAllByRole("link")).toHaveLength(2);
  });

  it('CA-04: next = null não renderiza o link "Próximo"', () => {
    render(<ProjectNav previous={previous} next={null} />);
    const nav = getNav();
    expect(findLink(nav, /Próximo/)).toBeUndefined();
    expect(findLink(nav, /Anterior/)).toHaveAttribute("href", "/trabalhos/serie-anterior");
    expect(within(nav).getAllByRole("link")).toHaveLength(2);
  });

  it('CA-04: ambos null → só "Todos os trabalhos"', () => {
    render(<ProjectNav previous={null} next={null} />);
    const links = within(getNav()).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/#trabalhos");
    expect(links[0]).toHaveAccessibleName(/Todos os trabalhos/);
  });
});
