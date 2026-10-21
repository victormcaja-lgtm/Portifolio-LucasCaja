import { describe, expect, it } from "vitest";
import { CATEGORIES, getCategoryName } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";

describe("CATEGORIES (contrato de módulo)", () => {
  it("contém as 4 categorias na ordem exata", () => {
    expect(CATEGORIES.map((c) => ({ slug: c.slug, name: c.name }))).toEqual([
      { slug: "fine-art", name: "Fine Art" },
      { slug: "fashion-editorial", name: "Fashion Editorial" },
      { slug: "high-fashion", name: "High Fashion" },
      { slug: "filme", name: "Filme" },
    ]);
  });
});

describe("getCategoryName", () => {
  it.each([
    ["fine-art", "Fine Art"],
    ["fashion-editorial", "Fashion Editorial"],
    ["high-fashion", "High Fashion"],
    ["filme", "Filme"],
  ] as const)("retorna o nome de %s", (slug, name) => {
    expect(getCategoryName(slug)).toBe(name);
  });

  it("lança Error para slug desconhecido", () => {
    expect(() => getCategoryName("inexistente" as CategorySlug)).toThrow(Error);
  });
});
