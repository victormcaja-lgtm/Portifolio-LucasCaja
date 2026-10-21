import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectCard } from "@/components/site/ProjectCard";
import { getCategoryName } from "@/lib/categories";
import { getSlotClassName, type EditorialSlot } from "@/lib/editorial-layout";
import { formatProjectIndex } from "@/lib/projects";
import { makeImage, makeProject } from "@/test/fixtures";

const slot: EditorialSlot = { span: "wide", align: "end", aspect: "landscape", offset: true };

const project = makeProject({
  title: "Série Demonstração Um",
  categories: ["fashion-editorial", "filme"],
  cover: makeImage({ alt: "Modelo em vestido escuro (demonstração)" }),
  isDemo: true,
});

describe("ProjectCard", () => {
  it("CA-07: renderiza um <article>", () => {
    render(<ProjectCard project={project} position={3} slot={slot} />);
    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  it("CA-07: exibe o índice formatado", () => {
    render(<ProjectCard project={project} position={3} slot={slot} />);
    expect(screen.getByText(formatProjectIndex(3))).toBeInTheDocument();
  });

  it("CA-07: exibe a capa com alt = cover.alt e atributo sizes", () => {
    render(<ProjectCard project={project} position={1} slot={slot} />);
    const img = screen.getByRole("img", { name: project.cover.alt });
    expect(img).toHaveAttribute("data-next-image", "true");
    expect(img.getAttribute("sizes")?.trim()).toBeTruthy();
  });

  it("CA-07: título em h3", () => {
    render(<ProjectCard project={project} position={1} slot={slot} />);
    expect(screen.getByRole("heading", { level: 3, name: project.title })).toBeInTheDocument();
  });

  it("CA-07: exibe os nomes das categorias", () => {
    render(<ProjectCard project={project} position={1} slot={slot} />);
    const article = screen.getByRole("article");
    for (const slug of project.categories) {
      expect(article).toHaveTextContent(getCategoryName(slug));
    }
  });

  it('CA-07: exibe o selo "Demo" quando isDemo', () => {
    render(<ProjectCard project={project} position={1} slot={slot} />);
    expect(screen.getByText("Demo")).toBeInTheDocument();
  });

  it('CA-07: não exibe o selo "Demo" quando não é demonstração', () => {
    render(
      <ProjectCard project={{ ...project, title: "Série Real", isDemo: false }} position={1} slot={slot} />,
    );
    expect(screen.queryByText("Demo")).not.toBeInTheDocument();
  });

  it("CA-07: aplica as classes de getSlotClassName(slot) no elemento raiz ou no contêiner do card", () => {
    const { container } = render(<ProjectCard project={project} position={1} slot={slot} />);
    const tokens = getSlotClassName(slot).trim().split(/\s+/);
    const article = screen.getByRole("article");
    const candidates = [container.firstElementChild, article, article.parentElement].filter(
      (el): el is Element => el !== null && el !== container,
    );
    const hasAll = candidates.some((el) => tokens.every((t) => el.classList.contains(t)));
    expect(hasAll).toBe(true);
  });

  it("CA-07: cards não são links nesta task", () => {
    render(<ProjectCard project={project} position={1} slot={slot} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
