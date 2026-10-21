import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SITE } from "@/lib/site-config";
import { mockMatchMediaControllable } from "@/test/match-media";

const ALLOWED_HREFS = new Set(["/", "#trabalhos", "#contato"]);

function getPanel(button: HTMLElement): HTMLElement | null {
  const id = button.getAttribute("aria-controls");
  return id ? document.getElementById(id) : null;
}

function isPanelHidden(panel: HTMLElement | null): boolean {
  if (panel === null) return true;
  if (panel.hasAttribute("hidden") || panel.hasAttribute("inert")) return true;
  if (panel.getAttribute("aria-hidden") === "true") return true;
  try {
    expect(panel).not.toBeVisible();
    return true;
  } catch {
    return false;
  }
}

describe("SiteHeader", () => {
  it("CA-02: renderiza um <header>", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("CA-02: wordmark com SITE.name aponta para /", () => {
    render(<SiteHeader />);
    const wordmark = screen.getByRole("link", { name: new RegExp(SITE.name) });
    expect(wordmark).toHaveAttribute("href", "/");
  });

  it('CA-02: navegação "Principal" com Trabalhos → #trabalhos e Contato → #contato', () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: "Trabalhos" })).toHaveAttribute("href", "#trabalhos");
    expect(within(nav).getByRole("link", { name: "Contato" })).toHaveAttribute("href", "#contato");
  });

  it("CA-02: não há links para páginas inexistentes", async () => {
    const user = userEvent.setup();
    const { container } = render(<SiteHeader />);
    const check = () => {
      for (const link of container.querySelectorAll("a")) {
        expect(ALLOWED_HREFS.has(link.getAttribute("href") ?? "")).toBe(true);
      }
    };
    check();
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    check();
  });

  it('CA-03: botão "Abrir menu" começa com aria-expanded="false" e aria-controls válido', () => {
    render(<SiteHeader />);
    const button = screen.getByRole("button", { name: "Abrir menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button.getAttribute("aria-controls")?.trim()).toBeTruthy();
    expect(isPanelHidden(getPanel(button))).toBe(true);
  });

  it('CA-03: ao clicar abre o painel com os mesmos links e o botão vira "Fechar menu"', async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));

    const button = screen.getByRole("button", { name: "Fechar menu" });
    expect(button).toHaveAttribute("aria-expanded", "true");
    const panel = getPanel(button);
    expect(panel).not.toBeNull();
    expect(isPanelHidden(panel)).toBe(false);
    expect(panel).toBeVisible();
    expect(within(panel!).getByRole("link", { name: "Trabalhos" })).toHaveAttribute("href", "#trabalhos");
    expect(within(panel!).getByRole("link", { name: "Contato" })).toHaveAttribute("href", "#contato");
  });

  it("CA-03: fecha ao pressionar Escape", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");

    const button = screen.getByRole("button", { name: "Abrir menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(isPanelHidden(getPanel(button))).toBe(true);
  });

  it("CA-03: fecha ao clicar em um link do painel", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    const panel = getPanel(screen.getByRole("button", { name: "Fechar menu" }))!;

    await user.click(within(panel).getByRole("link", { name: "Contato" }));

    const button = screen.getByRole("button", { name: "Abrir menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(isPanelHidden(getPanel(button))).toBe(true);
  });

  it("CA-03: pode reabrir após fechar", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    await user.click(screen.getByRole("button", { name: "Fechar menu" }));
    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute("aria-expanded", "true");
  });

  describe("CA-03: foco contido no menu aberto (resto da página inerte)", () => {
    function renderPage(options: { preInert?: boolean } = {}) {
      return render(
        <>
          <SiteHeader />
          <main data-testid="main">Conteúdo</main>
          <aside data-testid="aside" {...(options.preInert ? { inert: true } : {})}>
            Lateral
          </aside>
          <footer data-testid="footer">Rodapé</footer>
        </>,
      );
    }

    it("ao abrir, os irmãos do header recebem inert; o header não", async () => {
      const user = userEvent.setup();
      renderPage();
      expect(screen.getByTestId("main")).not.toHaveAttribute("inert");
      expect(screen.getByTestId("footer")).not.toHaveAttribute("inert");

      await user.click(screen.getByRole("button", { name: "Abrir menu" }));

      expect(screen.getByTestId("main")).toHaveAttribute("inert");
      expect(screen.getByTestId("footer")).toHaveAttribute("inert");
      expect(screen.getByRole("banner")).not.toHaveAttribute("inert");
    });

    it("ao fechar com Escape, os irmãos perdem inert", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole("button", { name: "Abrir menu" }));
      await user.keyboard("{Escape}");

      expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByTestId("main")).not.toHaveAttribute("inert");
      expect(screen.getByTestId("footer")).not.toHaveAttribute("inert");
    });

    it("ao fechar pelo botão, os irmãos perdem inert", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole("button", { name: "Abrir menu" }));
      await user.click(screen.getByRole("button", { name: "Fechar menu" }));

      expect(screen.getByTestId("main")).not.toHaveAttribute("inert");
      expect(screen.getByTestId("footer")).not.toHaveAttribute("inert");
    });

    it("ao desmontar com o menu aberto, inert é removido dos irmãos", async () => {
      const user = userEvent.setup();
      const { rerender } = renderPage();
      await user.click(screen.getByRole("button", { name: "Abrir menu" }));
      expect(screen.getByTestId("main")).toHaveAttribute("inert");

      rerender(
        <>
          <main data-testid="main">Conteúdo</main>
          <aside data-testid="aside">Lateral</aside>
          <footer data-testid="footer">Rodapé</footer>
        </>,
      );

      expect(screen.queryByRole("banner")).not.toBeInTheDocument();
      expect(screen.getByTestId("main")).not.toHaveAttribute("inert");
      expect(screen.getByTestId("footer")).not.toHaveAttribute("inert");
    });

    it("elementos que já eram inert antes de abrir continuam inert após fechar", async () => {
      const user = userEvent.setup();
      renderPage({ preInert: true });
      expect(screen.getByTestId("aside")).toHaveAttribute("inert");

      await user.click(screen.getByRole("button", { name: "Abrir menu" }));
      expect(screen.getByTestId("aside")).toHaveAttribute("inert");
      await user.keyboard("{Escape}");

      expect(screen.getByTestId("aside")).toHaveAttribute("inert");
      expect(screen.getByTestId("main")).not.toHaveAttribute("inert");
    });

    it("fecha o menu quando a viewport passa a casar (min-width: 48rem)", async () => {
      const isDesktopQuery = (query: string) => /min-width:\s*48rem/.test(query);
      const media = mockMatchMediaControllable(() => false);
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole("button", { name: "Abrir menu" }));
      expect(screen.getByTestId("main")).toHaveAttribute("inert");

      act(() => media.setMatcher(isDesktopQuery));

      const button = screen.getByRole("button", { name: "Abrir menu" });
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(isPanelHidden(getPanel(button))).toBe(true);
      expect(screen.getByTestId("main")).not.toHaveAttribute("inert");
      expect(screen.getByTestId("footer")).not.toHaveAttribute("inert");
    });
  });
});
