import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SITE } from "@/lib/site-config";
import type { ImageCredit } from "@/lib/types";

const credits: ImageCredit[] = [
  { author: "Ana Exemplo", sourceUrl: "https://unsplash.com/photos/abc" },
  { author: "Bruno Teste", sourceUrl: "https://unsplash.com/photos/def" },
];

describe("SiteFooter", () => {
  it('CA-10: renderiza <footer id="contato">', () => {
    render(<SiteFooter credits={credits} />);
    const footer = screen.getByRole("contentinfo");
    expect(footer.tagName).toBe("FOOTER");
    expect(footer).toHaveAttribute("id", "contato");
  });

  it('CA-10: título "Contato" e frase "Informações de contato em breve."', () => {
    render(<SiteFooter credits={credits} />);
    expect(screen.getByRole("heading", { name: "Contato" })).toBeInTheDocument();
    expect(screen.getByText("Informações de contato em breve.")).toBeInTheDocument();
  });

  it("CA-10: não inventa e-mail, telefone ou redes sociais", () => {
    render(<SiteFooter credits={credits} />);
    const footer = screen.getByRole("contentinfo");
    for (const link of within(footer).queryAllByRole("link")) {
      const href = link.getAttribute("href") ?? "";
      expect(href).not.toMatch(/^(mailto|tel):/i);
      expect(href).not.toMatch(/instagram|facebook|twitter|x\.com|tiktok|linkedin|behance|vimeo|youtube|whatsapp/i);
    }
    expect(footer.textContent).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(footer.textContent).not.toMatch(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
  });

  it("CA-10: lista os créditos com link para sourceUrl em nova aba e rel seguro", () => {
    render(<SiteFooter credits={credits} />);
    for (const credit of credits) {
      const link = screen.getByRole("link", { name: new RegExp(credit.author) });
      expect(link).toHaveAttribute("href", credit.sourceUrl);
      expect(link).toHaveAttribute("target", "_blank");
      const rel = (link.getAttribute("rel") ?? "").split(/\s+/);
      expect(rel).toContain("noopener");
      expect(rel).toContain("noreferrer");
    }
  });

  it("CA-10: os créditos mencionam Unsplash/Picsum", () => {
    render(<SiteFooter credits={credits} />);
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/Unsplash|Picsum/);
  });

  it("CA-10: exibe o ano corrente e SITE.name", () => {
    render(<SiteFooter credits={credits} />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent(String(new Date().getFullYear()));
    expect(footer).toHaveTextContent(SITE.name);
  });
});
