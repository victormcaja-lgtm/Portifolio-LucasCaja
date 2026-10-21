import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout, { metadata } from "@/app/layout";
import { SITE } from "@/lib/site-config";

// next/font/google não roda fora do compilador do Next: qualquer fonte vira {variable, className}.
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "font-mock-variable", className: "font-mock-class", style: {} });
  return new Proxy(
    { __esModule: true },
    {
      get(target, prop) {
        if (prop in target) return target[prop as keyof typeof target];
        if (typeof prop !== "string" || prop === "then" || prop.startsWith("__")) return undefined;
        return font;
      },
      // O vitest checa `prop in módulo` antes de ler um export nomeado.
      has(target, prop) {
        return prop in target || (typeof prop === "string" && prop !== "then" && !prop.startsWith("__"));
      },
    },
  );
});

function titleText(title: unknown): string {
  if (typeof title === "string") return title;
  if (title && typeof title === "object") {
    const t = title as { default?: string; absolute?: string };
    return t.absolute ?? t.default ?? "";
  }
  return "";
}

describe("RootLayout", () => {
  it("CA-11: metadata.title contém SITE.name", () => {
    expect(titleText(metadata.title)).toContain(SITE.name);
  });

  it("CA-11: metadata.description é SITE.description", () => {
    expect(metadata.description).toBe(SITE.description);
  });

  it('CA-11: <html lang="pt-BR">', () => {
    const Layout = RootLayout as unknown as (props: { children: ReactNode }) => ReactElement;
    const markup = renderToStaticMarkup(
      <Layout>
        <p>conteúdo</p>
      </Layout>,
    );
    expect(markup).toMatch(/<html[^>]*\slang="pt-BR"/);
    expect(markup).toContain("conteúdo");
  });
});
