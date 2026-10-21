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

  // TASK-02 CA-08 substitui o teste da TASK-01 "cards não são links".
  it("CA-08 (TASK-02): o card tem exatamente um link, para /trabalhos/{slug}", () => {
    render(<ProjectCard project={project} position={1} slot={slot} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", `/trabalhos/${project.slug}`);
  });

  it("CA-08 (TASK-02): o nome acessível do link é igual ao título do projeto", () => {
    render(<ProjectCard project={project} position={1} slot={slot} />);
    expect(screen.getByRole("link")).toHaveAccessibleName(project.title);
  });

  it("CA-08 (TASK-02): o link fica dentro do card (article)", () => {
    render(<ProjectCard project={project} position={1} slot={slot} />);
    expect(screen.getByRole("article").contains(screen.getByRole("link"))).toBe(true);
  });

  it("CA-08 (TASK-02): href e nome acompanham o projeto recebido", () => {
    const other = makeProject({ slug: "outra-serie", title: "Outra Série" });
    render(<ProjectCard project={other} position={2} slot={slot} />);
    const link = screen.getByRole("link", { name: "Outra Série" });
    expect(link).toHaveAttribute("href", "/trabalhos/outra-serie");
  });
});
