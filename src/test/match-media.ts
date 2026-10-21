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

export interface MatchMediaController {
  /** Troca o critério de correspondência e dispara `change` nas listas cujo `matches` mudou. */
  setMatcher(matcher: (query: string) => boolean): void;
}

/**
 * Como `mockMatchMedia`, mas as `MediaQueryList` devolvidas são "vivas": guardam ouvintes
 * (`addEventListener("change")`/`addListener`) e o controlador permite simular mudanças
 * de viewport, disparando `change` como o navegador faria.
 */
export function mockMatchMediaControllable(
  initial: (query: string) => boolean = () => false,
): MatchMediaController {
  let matcher = initial;
  type Listener = (event: MediaQueryListEvent) => void;
  const lists: Array<{ mql: MediaQueryList; listeners: Set<Listener>; last: boolean }> = [];

  const impl = vi.fn((query: string): MediaQueryList => {
    const listeners = new Set<Listener>();
    const entry = { mql: undefined as unknown as MediaQueryList, listeners, last: matcher(query) };
    const mql = {
      get matches() {
        return matcher(query);
      },
      media: query,
      onchange: null,
      addListener: (fn: Listener | null) => {
        if (fn) listeners.add(fn);
      },
      removeListener: (fn: Listener | null) => {
        if (fn) listeners.delete(fn);
      },
      addEventListener: (type: string, fn: Listener) => {
        if (type === "change") listeners.add(fn);
      },
      removeEventListener: (type: string, fn: Listener) => {
        if (type === "change") listeners.delete(fn);
      },
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
    entry.mql = mql;
    lists.push(entry);
    return mql;
  });

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: impl,
  });

  return {
    setMatcher(next) {
      matcher = next;
      for (const entry of lists) {
        const now = matcher(entry.mql.media);
        if (now === entry.last) continue;
        entry.last = now;
        const event = { matches: now, media: entry.mql.media } as MediaQueryListEvent;
        for (const fn of [...entry.listeners]) fn(event);
      }
    },
  };
}
