import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import NotFound from "@/app/not-found";

/**
 * Hipótese: `src/app/not-found.tsx` é um componente síncrono sem APIs de servidor
 * (renderiza SiteHeader, NotFoundView e SiteFooter), portanto renderizável no jsdom.
 */
const NotFoundPage = NotFound as unknown as () => ReactElement;

function precedes(a: Node, b: Node): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("Página 404 (src/app/not-found.tsx) — CA-05/CA-06", () => {
  it('CA-06: renderiza o SiteHeader com variant "solid"', () => {
    render(<NotFoundPage />);
    expect(screen.getByRole("banner")).toHaveAttribute("data-variant", "solid");
  });

  it("CA-06: renderiza o NotFoundView (h1, link Voltar ao início)", () => {
    const { container } = render(<NotFoundPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Página não encontrada");
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Voltar ao início" })).toHaveAttribute("href", "/");
  });

  it("CA-06: renderiza o SiteFooter sem créditos de imagens", () => {
    render(<NotFoundPage />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).queryByText(/Créditos das imagens/)).not.toBeInTheDocument();
    for (const link of within(footer).queryAllByRole("link")) {
      expect(link.getAttribute("href") ?? "").not.toMatch(/unsplash\.com/);
    }
  });

  it("CA-06: ordem header → conteúdo 404 → footer", () => {
    render(<NotFoundPage />);
    const header = screen.getByRole("banner");
    const h1 = screen.getByRole("heading", { level: 1 });
    const footer = screen.getByRole("contentinfo");
    expect(precedes(header, h1)).toBe(true);
    expect(precedes(h1, footer)).toBe(true);
    expect(header.contains(h1)).toBe(false);
    expect(footer.contains(h1)).toBe(false);
  });

  it("CA-11: imagens, se houver, têm alt", () => {
    const { container } = render(<NotFoundPage />);
    for (const img of container.querySelectorAll("img")) {
      expect(img.getAttribute("alt")).not.toBeNull();
    }
  });
});
