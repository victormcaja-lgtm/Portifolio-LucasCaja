import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotFoundView } from "@/components/site/NotFoundView";

describe("NotFoundView (CA-06)", () => {
  it('CA-06: h1 "Página não encontrada" (único h1)', () => {
    const { container } = render(<NotFoundView />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Página não encontrada");
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("CA-06: exibe uma frase curta além do título", () => {
    const { container } = render(<NotFoundView />);
    const paragraphs = [...container.querySelectorAll("p")].filter(
      (p) => (p.textContent ?? "").trim().length > 0,
    );
    expect(paragraphs.length).toBeGreaterThanOrEqual(1);
    const text = paragraphs[0].textContent!.trim();
    expect(text).not.toBe("Página não encontrada");
    expect(text.length).toBeLessThanOrEqual(200);
  });

  it('CA-06: link "Voltar ao início" para /', () => {
    render(<NotFoundView />);
    expect(screen.getByRole("link", { name: "Voltar ao início" })).toHaveAttribute("href", "/");
  });
});
