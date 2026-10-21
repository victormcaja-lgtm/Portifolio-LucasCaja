import { describe, expect, it } from "vitest";
import { DEMO_HERO, DEMO_PROJECTS } from "@/content/demo";
import { CATEGORIES } from "@/lib/categories";
import { demoImageUrl } from "@/lib/demo-images";
import type { ImageAsset } from "@/lib/types";

const PICSUM = /^https:\/\/picsum\.photos\/id\/(\d+)\/(\d+)\/(\d+)\?grayscale$/;

function expectValidDemoImage(image: ImageAsset) {
  expect(image.alt.trim().length).toBeGreaterThan(0);
  expect(image.width).toBeGreaterThan(0);
  expect(image.height).toBeGreaterThan(0);
  expect(image.credit).toBeDefined();
  expect(image.credit!.author.trim().length).toBeGreaterThan(0);
  expect(image.credit!.sourceUrl).toMatch(/^https:\/\//);
  const match = PICSUM.exec(image.src);
  expect(match, `src fora do padrão demoImageUrl: ${image.src}`).not.toBeNull();
  const [, id, w, h] = match!;
  expect(image.src).toBe(demoImageUrl(Number(id), Number(w), Number(h)));
  expect(new URL(image.src).hostname).toBe("picsum.photos");
}

describe("DEMO_HERO (contrato de módulo)", () => {
  it("tem alt, credit e src gerado por demoImageUrl", () => {
    expectValidDemoImage(DEMO_HERO);
  });
});

describe("DEMO_PROJECTS (contrato de módulo)", () => {
  it("tem exatamente 10 projetos", () => {
    expect(DEMO_PROJECTS).toHaveLength(10);
  });

  it("todos são marcados como demonstração", () => {
    for (const p of DEMO_PROJECTS) expect(p.isDemo).toBe(true);
  });

  it("ids e slugs são únicos", () => {
    expect(new Set(DEMO_PROJECTS.map((p) => p.id)).size).toBe(DEMO_PROJECTS.length);
    expect(new Set(DEMO_PROJECTS.map((p) => p.slug)).size).toBe(DEMO_PROJECTS.length);
  });

  it("cada projeto tem ao menos uma categoria válida e as 4 categorias estão representadas", () => {
    const valid = new Set(CATEGORIES.map((c) => c.slug));
    for (const p of DEMO_PROJECTS) {
      expect(p.categories.length).toBeGreaterThan(0);
      for (const slug of p.categories) expect(valid.has(slug)).toBe(true);
    }
    const used = new Set(DEMO_PROJECTS.flatMap((p) => p.categories));
    for (const c of CATEGORIES) expect(used.has(c.slug)).toBe(true);
  });

  it('títulos contêm "Demonstração"', () => {
    for (const p of DEMO_PROJECTS) expect(p.title).toContain("Demonstração");
  });

  it("toda capa tem alt não vazio, credit preenchido e src do Picsum via demoImageUrl", () => {
    for (const p of DEMO_PROJECTS) expectValidDemoImage(p.cover);
  });

  it("sortOrder é numérico e finito", () => {
    for (const p of DEMO_PROJECTS) expect(Number.isFinite(p.sortOrder)).toBe(true);
  });
});
