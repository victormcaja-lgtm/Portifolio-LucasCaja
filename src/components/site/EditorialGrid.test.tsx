import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EditorialGrid } from "@/components/site/EditorialGrid";
import { DEMO_PROJECTS } from "@/content/demo";
import { CATEGORIES } from "@/lib/categories";
import { getEditorialSlot, getSlotClassName } from "@/lib/editorial-layout";
import { formatProjectIndex } from "@/lib/projects";
import { makeProject } from "@/test/fixtures";

// sortOrder fora de ordem para verificar a ordenação.
const projects = [
  makeProject({ id: "x1", title: "Alfa", sortOrder: 40, categories: ["fine-art"] }),
  makeProject({ id: "x2", title: "Beta", sortOrder: 10, categories: ["fashion-editorial"] }),
  makeProject({ id: "x3", title: "Gama", sortOrder: 30, categories: ["fine-art", "filme"] }),
  makeProject({ id: "x4", title: "Delta", sortOrder: 20, categories: ["high-fashion"] }),
  makeProject({ id: "x5", title: "Épsilon", sortOrder: 50, categories: ["fine-art"] }),
];

function getList(): HTMLElement {
  const section = screen.getByRole("region", { name: "Trabalhos" });
  return within(section).getByRole("list");
}

function cardTitles(): string[] {
  return within(getList())
    .getAllByRole("listitem")
    .map((li) => within(li).getByRole("heading", { level: 3 }).textContent ?? "");
}

function liveRegion(container: HTMLElement): HTMLElement {
  const region = container.querySelector<HTMLElement>('[aria-live="polite"]');
  expect(region).not.toBeNull();
  return region!;
}

function hasSlotClasses(li: HTMLElement, index: number): boolean {
  const tokens = getSlotClassName(getEditorialSlot(index)).trim().split(/\s+/);
  const elements = [li, ...li.querySelectorAll<HTMLElement>("*")];
  return elements.some((el) => tokens.every((t) => el.classList.contains(t)));
}

describe("EditorialGrid", () => {
  it('CA-06: renderiza <section id="trabalhos"> rotulada pelo título "Trabalhos"', () => {
    render(<EditorialGrid projects={projects} />);
    const section = screen.getByRole("region", { name: "Trabalhos" });
    expect(section.tagName).toBe("SECTION");
    expect(section).toHaveAttribute("id", "trabalhos");
    const labelledBy = section.getAttribute("aria-labelledby")!;
    expect(labelledBy).toBeTruthy();
    const heading = document.getElementById(labelledBy)!;
    expect(heading).toHaveTextContent("Trabalhos");
    expect(heading.tagName).toBe("H2");
  });

  it("CA-06: inclui o filtro com estado inicial Todos", () => {
    render(<EditorialGrid projects={projects} />);
    const group = screen.getByRole("group", { name: "Filtrar por categoria" });
    expect(within(group).getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
  });

  it("CA-06: um <li> por projeto, em ordem de sortOrder", () => {
    render(<EditorialGrid projects={projects} />);
    const list = getList();
    expect(list.tagName).toBe("UL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(projects.length);
    expect(cardTitles()).toEqual(["Beta", "Delta", "Gama", "Alfa", "Épsilon"]);
  });

  it('CA-06: contador em região viva informa "10 projetos" com o conteúdo de demonstração', () => {
    const { container } = render(<EditorialGrid projects={DEMO_PROJECTS} />);
    expect(liveRegion(container)).toHaveTextContent(/(^|\D)10 projetos/);
    expect(within(getList()).getAllByRole("listitem")).toHaveLength(10);
  });

  it("CA-06: ao escolher uma categoria exibe só os projetos dela e atualiza o contador", async () => {
    const user = userEvent.setup();
    const { container } = render(<EditorialGrid projects={projects} />);
    const group = screen.getByRole("group", { name: "Filtrar por categoria" });

    await user.click(within(group).getByRole("button", { name: "Fine Art" }));
    expect(within(group).getByRole("button", { name: "Fine Art" })).toHaveAttribute("aria-pressed", "true");
    expect(within(group).getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "false");
    expect(cardTitles()).toEqual(["Gama", "Alfa", "Épsilon"]);
    expect(liveRegion(container)).toHaveTextContent(/(^|\D)3 projetos/);

    await user.click(within(group).getByRole("button", { name: "High Fashion" }));
    expect(cardTitles()).toEqual(["Delta"]);
    expect(liveRegion(container)).toHaveTextContent(/(^|\D)1 projeto(?!s)/);

    await user.click(within(group).getByRole("button", { name: "Todos" }));
    expect(cardTitles()).toHaveLength(projects.length);
    expect(liveRegion(container)).toHaveTextContent(/(^|\D)5 projetos/);
  });

  it("CA-06: cada categoria do conteúdo demo filtra corretamente", async () => {
    const user = userEvent.setup();
    render(<EditorialGrid projects={DEMO_PROJECTS} />);
    const group = screen.getByRole("group", { name: "Filtrar por categoria" });
    for (const c of CATEGORIES) {
      await user.click(within(group).getByRole("button", { name: c.name }));
      const expected = DEMO_PROJECTS.filter((p) => p.categories.includes(c.slug)).length;
      expect(within(getList()).getAllByRole("listitem")).toHaveLength(expected);
    }
  });

  it("CA-06: posição (índice) dos cards é relativa à lista filtrada", async () => {
    const user = userEvent.setup();
    render(<EditorialGrid projects={projects} />);
    let items = within(getList()).getAllByRole("listitem");
    items.forEach((li, i) => expect(li).toHaveTextContent(formatProjectIndex(i + 1)));

    await user.click(screen.getByRole("button", { name: "Fine Art" }));
    items = within(getList()).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    items.forEach((li, i) => {
      expect(within(li).getByText(formatProjectIndex(i + 1))).toBeInTheDocument();
    });
  });

  it("CA-06/CA-08: cada card recebe o slot getEditorialSlot(posição - 1)", async () => {
    const user = userEvent.setup();
    render(<EditorialGrid projects={DEMO_PROJECTS} />);
    within(getList())
      .getAllByRole("listitem")
      .forEach((li, i) => expect(hasSlotClasses(li, i)).toBe(true));

    await user.click(screen.getByRole("button", { name: "Filme" }));
    within(getList())
      .getAllByRole("listitem")
      .forEach((li, i) => expect(hasSlotClasses(li, i)).toBe(true));
  });

  it("CA-08: lista em uma coluna abaixo de md e 12 colunas a partir de md", () => {
    render(<EditorialGrid projects={projects} />);
    const tokens = (getList().getAttribute("class") ?? "").split(/\s+/);
    expect(tokens).toContain("grid");
    expect(tokens).toContain("md:grid-cols-12");
    const multiColumnBelowMd = tokens.filter((t) => /^(sm:)?grid-cols-(?!1$)/.test(t));
    expect(multiColumnBelowMd).toEqual([]);
  });

  it("CA-07: os cards não são links", () => {
    render(<EditorialGrid projects={projects} />);
    expect(within(getList()).queryAllByRole("link")).toHaveLength(0);
  });
});
