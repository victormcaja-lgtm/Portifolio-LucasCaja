"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { SITE } from "@/lib/site-config";

const NAV_LINKS = [
  { href: "#trabalhos", label: "Trabalhos" },
  { href: "#contato", label: "Contato" },
] as const;

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

export function SiteHeader() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const scrolled = useSyncExternalStore(subscribeToScroll, getScrolled, getServerScrolled);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(true);
    }
    document.addEventListener("keydown", onKeyDown);

    // Enquanto o menu está aberto, o restante da página (irmãos do cabeçalho) fica inerte:
    // o foco (Tab e Shift+Tab) não escapa para o conteúdo escondido atrás do painel.
    const header = headerRef.current;
    const siblings = Array.from(header?.parentElement?.children ?? []).filter(
      (el) => el !== header && !el.hasAttribute("inert"),
    );
    for (const el of siblings) el.setAttribute("inert", "");

    // Ao passar para md, o painel mobile deixa de existir: fecha o menu e libera a página.
    const desktop = window.matchMedia("(min-width: 48rem)");
    function onViewportChange(event: MediaQueryListEvent) {
      if (event.matches) close(false);
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
  const solid = scrolled || open;

  return (
    <header
      ref={headerRef}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-ui ease-editorial ${
        solid ? "bg-paper text-ink" : "bg-transparent text-paper"
      } ${scrolled && !open ? "border-b border-rule" : "border-b border-transparent"}`}
    >
      <div className="mx-auto flex h-16 max-w-page items-center justify-between px-4 md:h-20 md:px-6 lg:px-10">
        <Link
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
                <a
                  href={link.href}
                  className={`inline-flex min-h-11 items-center px-3 font-sans text-label uppercase transition-opacity duration-ui ease-editorial ${
                    solid ? "opacity-80 hover:opacity-100" : ""
                  }`}
                >
                  {link.label}
                </a>
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
                <a
                  href={link.href}
                  onClick={() => close(false)}
                  className="block flex-1 py-4 font-display text-headline leading-none font-light"
                >
                  {link.label}
                </a>
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
