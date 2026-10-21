import { vi } from "vitest";

/**
 * Instala `window.matchMedia` cujo resultado é decidido por `matcher(query)`.
 * Por padrão (no setup) nenhuma media query casa.
 */
export function mockMatchMedia(matcher: (query: string) => boolean = () => false): void {
  const impl = vi.fn((query: string): MediaQueryList => ({
    matches: matcher(query),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }));
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: impl,
  });
}

/** Simula `prefers-reduced-motion: reduce` (true) ou `no-preference` (false). */
export function mockReducedMotion(reduce: boolean): void {
  mockMatchMedia((query) => {
    const q = query.replace(/\s+/g, "");
    if (q.includes("prefers-reduced-motion:reduce")) return reduce;
    if (q.includes("prefers-reduced-motion:no-preference")) return !reduce;
    return false;
  });
}
