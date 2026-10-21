import { act } from "@testing-library/react";
import { vi } from "vitest";

/**
 * Mock controlável de IntersectionObserver.
 * - `installIntersectionObserver()` instala o mock (feito automaticamente no setup antes de cada teste).
 * - `uninstallIntersectionObserver()` simula navegador sem suporte.
 * - `triggerIntersection()` dispara a interseção para os alvos observados.
 * - `isObserved(el)` informa se algum observer ainda observa o elemento.
 */
export class MockIntersectionObserver implements IntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;
  readonly scrollMargin: string = "0px";
  readonly callback: IntersectionObserverCallback;
  readonly targets = new Set<Element>();
  disconnected = false;

  readonly observe = vi.fn((target: Element) => {
    this.disconnected = false;
    this.targets.add(target);
  });

  readonly unobserve = vi.fn((target: Element) => {
    this.targets.delete(target);
  });

  readonly disconnect = vi.fn(() => {
    this.targets.clear();
    this.disconnected = true;
  });

  readonly takeRecords = vi.fn((): IntersectionObserverEntry[] => []);

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback;
    this.root = options.root ?? null;
    this.rootMargin = options.rootMargin ?? "0px";
    const threshold = options.threshold ?? 0;
    this.thresholds = Array.isArray(threshold) ? threshold : [threshold];
    MockIntersectionObserver.instances.push(this);
  }
}

function makeEntry(target: Element, isIntersecting: boolean): IntersectionObserverEntry {
  const rect = target.getBoundingClientRect();
  return {
    target,
    isIntersecting,
    intersectionRatio: isIntersecting ? 1 : 0,
    boundingClientRect: rect,
    intersectionRect: rect,
    rootBounds: null,
    time: Date.now(),
  };
}

export function installIntersectionObserver(): void {
  MockIntersectionObserver.instances = [];
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });
}

/** Simula ambiente sem suporte a IntersectionObserver. */
export function uninstallIntersectionObserver(): void {
  MockIntersectionObserver.instances = [];
  delete (window as unknown as Record<string, unknown>).IntersectionObserver;
  delete (globalThis as unknown as Record<string, unknown>).IntersectionObserver;
}

export function getObserverInstances(): MockIntersectionObserver[] {
  return MockIntersectionObserver.instances;
}

/** Todos os elementos atualmente observados por algum observer. */
export function getObservedTargets(): Element[] {
  return MockIntersectionObserver.instances.flatMap((io) => [...io.targets]);
}

export function isObserved(element: Element): boolean {
  return MockIntersectionObserver.instances.some((io) => io.targets.has(element));
}

/**
 * Dispara a interseção. Sem `target`, dispara para todos os elementos observados.
 * Envolto em `act` para aplicar as atualizações de estado do React.
 */
export function triggerIntersection(target?: Element, isIntersecting = true): void {
  act(() => {
    for (const io of [...MockIntersectionObserver.instances]) {
      const targets = [...io.targets].filter((t) => !target || t === target);
      if (targets.length === 0) continue;
      io.callback(
        targets.map((t) => makeEntry(t, isIntersecting)),
        io,
      );
    }
  });
}
