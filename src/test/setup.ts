import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import { installIntersectionObserver } from "./intersection-observer";
import { mockMatchMedia } from "./match-media";

/**
 * Mock de `next/image` fiel ao Next 16 (node_modules/next/dist/shared/lib/get-img-props.js,
 * `getImgProps`, e dist/client/image-component.js):
 * - `fetchPriority` é repassado ao <img> sem alteração;
 * - `loading` final = "lazy" quando a imagem não é `preload`/`priority` e `loading` é
 *   "lazy" ou ausente; caso contrário, o `loading` explícito (que pode ser ausente).
 *   src `data:`/`blob:` também desativa o lazy padrão;
 * - `preload` (e o depreciado `priority`, tratado igual) NÃO gera atributos no <img>:
 *   no Next 16 ele apenas insere um <link rel="preload"> no <head>.
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
    let isLazy =
      !priority && !preload && (loading === "lazy" || typeof loading === "undefined");
    if (!resolvedSrc || resolvedSrc.startsWith("data:") || resolvedSrc.startsWith("blob:")) {
      isLazy = false;
    }
    return createElement("img", {
      ...domProps,
      "data-next-image": "true",
      src: resolvedSrc,
      loading: isLazy ? "lazy" : loading,
      fetchPriority,
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
