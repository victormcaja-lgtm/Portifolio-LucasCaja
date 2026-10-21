import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SITE } from "@/lib/site-config";
import { mockMatchMediaControllable } from "@/test/match-media";

const ALLOWED_HREFS = new Set(["/", "/#trabalhos", "/#contato"]);

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

  it('CA-02/CA-09: navegação "Principal" com Trabalhos → /#trabalhos e Contato → /#contato', () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: "Trabalhos" })).toHaveAttribute("href", "/#trabalhos");
    expect(within(nav).getByRole("link", { name: "Contato" })).toHaveAttribute("href", "/#contato");
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
    expect(within(panel!).getByRole("link", { name: "Trabalhos" })).toHaveAttribute("href", "/#trabalhos");
    expect(within(panel!).getByRole("link", { name: "Contato" })).toHaveAttribute("href", "/#contato");
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

describe("SiteHeader — CA-09 variant", () => {
  function headerClasses(): string[] {
    return (screen.getByRole("banner").getAttribute("class") ?? "").split(/\s+/);
  }

  it('CA-09: sem variant, expõe data-variant="overlay" (padrão)', () => {
    render(<SiteHeader />);
    expect(screen.getByRole("banner")).toHaveAttribute("data-variant", "overlay");
  });

  it('CA-09: variant="overlay" expõe data-variant="overlay" e é transparente no topo', () => {
    render(<SiteHeader variant="overlay" />);
    expect(screen.getByRole("banner")).toHaveAttribute("data-variant", "overlay");
    const classes = headerClasses();
    expect(classes).not.toContain("bg-paper");
    expect(classes).toContain("text-paper");
  });

  it('CA-09: variant="solid" expõe data-variant="solid" e tem fundo paper e texto ink desde o início', () => {
    render(<SiteHeader variant="solid" />);
    expect(screen.getByRole("banner")).toHaveAttribute("data-variant", "solid");
    const classes = headerClasses();
    expect(classes).toContain("bg-paper");
    expect(classes).toContain("text-ink");
    expect(classes).not.toContain("bg-transparent");
    expect(classes).not.toContain("text-paper");
  });

  it('CA-09: variant="solid" mantém wordmark, links /#trabalhos e /#contato e o menu mobile', async () => {
    const user = userEvent.setup();
    render(<SiteHeader variant="solid" />);
    expect(screen.getByRole("link", { name: new RegExp(SITE.name) })).toHaveAttribute("href", "/");
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: "Trabalhos" })).toHaveAttribute("href", "/#trabalhos");
    expect(within(nav).getByRole("link", { name: "Contato" })).toHaveAttribute("href", "/#contato");

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    const panel = getPanel(screen.getByRole("button", { name: "Fechar menu" }));
    expect(isPanelHidden(panel)).toBe(false);
    expect(within(panel!).getByRole("link", { name: "Trabalhos" })).toHaveAttribute("href", "/#trabalhos");
  });
});

describe("SiteHeader — CA-13 escopo do inert com o menu aberto", () => {
  const extras: Element[] = [];

  function renderFullPage() {
    const result = render(
      <>
        <a href="#conteudo" data-testid="skip">
          Pular para o conteúdo
        </a>
        <SiteHeader />
        <main id="conteudo" data-testid="main">
          Conteúdo
        </main>
        <footer data-testid="footer">Rodapé</footer>
      </>,
    );
    // Elementos que o Next/React inserem no <body>, irmãos do cabeçalho.
    const announcer = document.createElement("next-route-announcer");
    const script = document.createElement("script");
    script.setAttribute("type", "application/json");
    const portal = document.createElement("div");
    portal.setAttribute("data-testid", "portal");
    result.container.append(announcer, script, portal);
    // E também diretamente no <body>, como o anunciador de rota real.
    const bodyAnnouncer = document.createElement("next-route-announcer");
    bodyAnnouncer.setAttribute("data-testid", "body-announcer");
    document.body.append(bodyAnnouncer);
    extras.push(bodyAnnouncer);
    return { ...result, announcer, script, portal, bodyAnnouncer };
  }

  afterEach(() => {
    for (const el of extras.splice(0)) el.remove();
  });

  it("CA-13: ao abrir, só o skip link, o <main> e o <footer> recebem inert", async () => {
    const user = userEvent.setup();
    const { announcer, script, portal, bodyAnnouncer } = renderFullPage();
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));

    expect(screen.getByTestId("skip")).toHaveAttribute("inert");
    expect(screen.getByTestId("main")).toHaveAttribute("inert");
    expect(screen.getByTestId("footer")).toHaveAttribute("inert");

    expect(screen.getByRole("banner")).not.toHaveAttribute("inert");
    expect(announcer).not.toHaveAttribute("inert");
    expect(script).not.toHaveAttribute("inert");
    expect(portal).not.toHaveAttribute("inert");
    expect(bodyAnnouncer).not.toHaveAttribute("inert");
  });

  it("CA-13: nenhum ancestral do header (nem o <body>) recebe inert", async () => {
    const user = userEvent.setup();
    renderFullPage();
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    for (let el = screen.getByRole("banner").parentElement; el; el = el.parentElement) {
      expect(el).not.toHaveAttribute("inert");
    }
  });

  it("CA-13: ao fechar, skip link, main e footer perdem inert; os demais continuam sem inert", async () => {
    const user = userEvent.setup();
    const { announcer, script, portal } = renderFullPage();
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    await user.keyboard("{Escape}");

    for (const el of [
      screen.getByTestId("skip"),
      screen.getByTestId("main"),
      screen.getByTestId("footer"),
      announcer,
      script,
      portal,
    ]) {
      expect(el).not.toHaveAttribute("inert");
    }
  });
});

describe("SiteHeader — CA-14 foco ao virar md", () => {
  it("CA-14: quando o menu fecha porque a viewport passou para md, o foco vai para o wordmark", async () => {
    const media = mockMatchMediaControllable(() => false);
    const user = userEvent.setup();
    render(
      <>
        <SiteHeader />
        <main>Conteúdo</main>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute("aria-expanded", "true");

    act(() => media.setMatcher((query) => /min-width:\s*48rem/.test(query)));

    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
    const wordmark = screen.getByRole("link", { name: new RegExp(SITE.name) });
    expect(wordmark).toHaveFocus();
    expect(document.activeElement).not.toBe(document.body);
  });

  it("CA-14: fechar com Escape continua devolvendo o foco ao botão do menu", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveFocus();
  });
});
