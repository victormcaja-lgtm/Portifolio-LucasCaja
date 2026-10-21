import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import { installIntersectionObserver } from "./intersection-observer";
import { mockMatchMedia } from "./match-media";

/**
 * Mock de `next/image`: renderiza um <img> simples, repassando alt, sizes, src,
 * loading e fetchPriority. `preload` (ou o legado `priority`) vira
 * fetchpriority="high" + loading="eager", refletindo o carregamento prioritário.
 * O atributo `data-next-image` permite verificar que a imagem veio de next/image.
 */
vi.mock("next/image", () => {
  const NEXT_ONLY_PROPS = [
    "fill",
    "quality",
    "placeholder",
    "blurDataURL",
    "unoptimized",
    "loader",
    "overrideSrc",
    "onLoadingComplete",
    "preload",
    "priority",
  ];

  function MockImage(props: Record<string, unknown>) {
    const { src, preload, priority, loading, fetchPriority } = props;
    const domProps: Record<string, unknown> = { ...props };
    for (const key of NEXT_ONLY_PROPS) delete domProps[key];
    const resolvedSrc =
      typeof src === "string"
        ? src
        : src && typeof src === "object" && "src" in src
          ? String((src as { src: unknown }).src)
          : undefined;
    const isPriority = preload === true || priority === true;
    return createElement("img", {
      ...domProps,
      "data-next-image": "true",
      src: resolvedSrc,
      loading: isPriority ? "eager" : loading,
      fetchPriority: isPriority ? "high" : fetchPriority,
    });
  }

  return { __esModule: true, default: MockImage };
});

beforeEach(() => {
  installIntersectionObserver();
  mockMatchMedia();
});

afterEach(() => {
  cleanup();
});
