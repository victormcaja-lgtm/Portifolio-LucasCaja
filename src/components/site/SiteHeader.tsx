"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { SITE } from "@/lib/site-config";

const NAV_LINKS = [
  { href: "/#trabalhos", label: "Trabalhos" },
  { href: "/#contato", label: "Contato" },
] as const;

/**
 * Conteúdo da página que fica inerte com o menu aberto: skip link, <main> e <footer>.
 * Nada além disso — o anunciador de rota do Next, scripts e portais continuam ativos.
 * O skip link é identificado pelo atributo `data-skip-link` (definido em SkipLink); o seletor
 * por href é mantido como alternativa para um link de pulo sem o atributo.
 */
const INERT_SELECTOR = '[data-skip-link], a[href="#conteudo"], main, footer';

/** Distância rolada a partir da qual o cabeçalho ganha fundo `paper`. */
const SCROLL_THRESHOLD = 48;

function subscribeToScroll(onChange: () => void): () => void {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

function getScrolled(): boolean {
  return window.scrollY > SCROLL_THRESHOLD;
}

function getServerScrolled(): boolean {
  return false;
}

interface SiteHeaderProps {
  /** "overlay" (padrão): transparente sobre o hero. "solid": fundo paper desde o início. */
  variant?: "overlay" | "solid";
}

export function SiteHeader({ variant = "overlay" }: SiteHeaderProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const scrolled = useSyncExternalStore(subscribeToScroll, getScrolled, getServerScrolled);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLAnchorElement>(null);

  /** Fecha o menu e, se pedido, leva o foco ao botão do menu ou ao wordmark. */
  const close = useCallback((focusTarget: "toggle" | "wordmark" | null) => {
    setOpen(false);
    if (focusTarget === "toggle") toggleRef.current?.focus();
    if (focusTarget === "wordmark") wordmarkRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close("toggle");
    }
    document.addEventListener("keydown", onKeyDown);

    // Enquanto o menu está aberto, o conteúdo da página (irmãos do cabeçalho: skip link,
    // <main> e <footer>) fica inerte: o foco não escapa para trás do painel.
    const header = headerRef.current;
    const siblings = Array.from(header?.parentElement?.children ?? []).filter(
      (el) => el !== header && el.matches(INERT_SELECTOR) && !el.hasAttribute("inert"),
    );
    for (const el of siblings) el.setAttribute("inert", "");

    // Ao passar para md, o painel mobile deixa de existir: fecha o menu, libera a página e
    // leva o foco ao wordmark (o botão do menu some em md; o foco não pode cair no <body>).
    const desktop = window.matchMedia("(min-width: 48rem)");
    function onViewportChange(event: MediaQueryListEvent) {
      if (event.matches) close("wordmark");
    }
    desktop.addEventListener("change", onViewportChange);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onViewportChange);
      for (const el of siblings) el.removeAttribute("inert");
    };
  }, [open, close]);

  // Sobre o hero (topo da página, menu fechado) o texto é claro; depois, tinta sobre papel.
  // Na variante "solid" (páginas sem hero) é tinta sobre papel desde o início.
  const isSolidVariant = variant === "solid";
  const solid = isSolidVariant || scrolled || open;
  const bordered = (isSolidVariant || scrolled) && !open;

  return (
    <header
      ref={headerRef}
      data-variant={variant}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-ui ease-editorial ${
        solid ? "bg-paper text-ink" : "bg-transparent text-paper"
      } ${bordered ? "border-b border-rule" : "border-b border-transparent"}`}
    >
      <div className="mx-auto flex h-16 max-w-page items-center justify-between px-4 md:h-20 md:px-6 lg:px-10">
        <Link
          ref={wordmarkRef}
          href="/"
          onClick={() => setOpen(false)}
          className="-ml-2 inline-flex min-h-11 items-center px-2 font-display text-2xl leading-none font-normal tracking-tight"
        >
          {SITE.name}
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`inline-flex min-h-11 items-center px-3 font-sans text-label uppercase transition-opacity duration-ui ease-editorial ${
                    solid ? "opacity-80 hover:opacity-100" : ""
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((value) => !value)}
          className="-mr-3 inline-flex min-h-11 min-w-11 items-center justify-center px-3 font-sans text-label uppercase md:hidden"
        >
          {open ? "Fechar" : "Menu"}
        </button>
      </div>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="fixed inset-x-0 top-16 bottom-0 overflow-y-auto bg-paper-raised text-ink md:hidden"
      >
        <nav aria-label="Menu" className="flex min-h-full flex-col justify-between px-4 pt-12 pb-10">
          <ul className="flex flex-col gap-2">
            {NAV_LINKS.map((link, i) => (
              <li key={link.href} className="flex items-baseline gap-4 border-b border-rule">
                <span aria-hidden="true" className="font-display text-lg font-light text-ink-muted italic">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Link
                  href={link.href}
                  onClick={() => close(null)}
                  className="block flex-1 py-4 font-display text-headline leading-none font-light"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-12 font-sans text-label text-ink-muted uppercase">
            {SITE.disciplines.join(" · ")}
          </p>
        </nav>
      </div>
    </header>
  );
}
