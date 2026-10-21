import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "@/components/site/Hero";
import { SITE } from "@/lib/site-config";
import { makeImage } from "@/test/fixtures";

const image = makeImage({
  src: "https://picsum.photos/id/1011/2400/1600?grayscale",
  width: 2400,
  height: 1600,
  alt: "Retrato em contraluz (demonstração)",
});

describe("Hero", () => {
  it("CA-01: renderiza um <section>", () => {
    const { container } = render(<Hero image={image} />);
    expect(container.querySelector("section")).not.toBeNull();
  });

  it("CA-01: exibe a imagem recebida com alt igual a image.alt", () => {
    render(<Hero image={image} />);
    expect(screen.getByRole("img", { name: image.alt })).toBeInTheDocument();
  });

  it("CA-01: carrega a imagem com prioridade (fetchpriority=high ou loading=eager)", () => {
    render(<Hero image={image} />);
    const img = screen.getByRole("img", { name: image.alt });
    const prioritized =
      img.getAttribute("fetchpriority") === "high" || img.getAttribute("loading") === "eager";
    expect(prioritized).toBe(true);
  });

  it("CA-12: a imagem vem de next/image com sizes definido", () => {
    render(<Hero image={image} />);
    const img = screen.getByRole("img", { name: image.alt });
    expect(img).toHaveAttribute("data-next-image", "true");
    expect(img.getAttribute("sizes")?.trim()).toBeTruthy();
  });

  it("CA-01: tem um único h1 contendo SITE.name", () => {
    const { container } = render(<Hero image={image} />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(SITE.name);
  });

  it("CA-01: exibe todas as disciplinas de SITE.disciplines", () => {
    const { container } = render(<Hero image={image} />);
    for (const discipline of SITE.disciplines) {
      expect(container).toHaveTextContent(discipline);
    }
  });

  it("CA-01: ocupa a altura da viewport (100svh)", () => {
    const { container } = render(<Hero image={image} />);
    const section = container.querySelector("section")!;
    const className = section.getAttribute("class") ?? "";
    const style = section.getAttribute("style") ?? "";
    const usesSvh =
      /(^|\s)(min-)?h-(svh|\[100svh\])(\s|$)/.test(className) || /100svh/.test(style);
    expect(usesSvh).toBe(true);
  });
});
