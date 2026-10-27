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

  it("TASK-04b (ciclo 1): é marcado como demonstração (isDemo === true)", () => {
    expect(DEMO_HERO.isDemo).toBe(true);
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

/** Imagens de galeria previstas na spec da TASK-02 (id Picsum → autor e página Unsplash). */
const GALLERY_SOURCES: Record<number, { author: string; sourceUrl: string }> = {
  23: { author: "Alejandro Escamilla", sourceUrl: "https://unsplash.com/photos/8yqds_91OLw" },
  35: { author: "Shane Colella", sourceUrl: "https://unsplash.com/photos/znM0ujn2RUA" },
  682: { author: "Logan Troxell", sourceUrl: "https://unsplash.com/photos/DsQmBlbywJ8" },
  722: { author: "Sebastian Kostrubala", sourceUrl: "https://unsplash.com/photos/4yDg-dDX9uM" },
  735: { author: "wyman H", sourceUrl: "https://unsplash.com/photos/ZQeRH1XD4Tc" },
  827: { author: "kazuend", sourceUrl: "https://unsplash.com/photos/2KXEb_8G5vo" },
  829: { author: "Drew Hays", sourceUrl: "https://unsplash.com/photos/e6Fi_FBMfY0" },
  833: { author: "Paul Green", sourceUrl: "https://unsplash.com/photos/OIbwHaG9NC8" },
  930: { author: "Dominik Lange", sourceUrl: "https://unsplash.com/photos/ZUvF7qEIcVI" },
  936: { author: "LoboStudio Hamburg", sourceUrl: "https://unsplash.com/photos/awnHOXjsdT4" },
  948: { author: "Mihail Ribkin", sourceUrl: "https://unsplash.com/photos/VjmlDjePHjE" },
  1003: { author: "E+N Photographies", sourceUrl: "https://unsplash.com/photos/GYumuBnTqKc" },
  1038: { author: "Marcelo Quinan", sourceUrl: "https://unsplash.com/photos/upywS5QFwr8" },
  1042: { author: "Jeremy Thomas", sourceUrl: "https://unsplash.com/photos/rMmibFe4czY" },
  1065: { author: "Bertrand Zuchuat", sourceUrl: "https://unsplash.com/photos/Uax2bg5EizU" },
  156: { author: "Christopher Sardegna", sourceUrl: "https://unsplash.com/photos/iRyGmA_no2Q" },
  512: { author: "Jeff Sheldon", sourceUrl: "https://unsplash.com/photos/jTeQavJjBDs" },
  486: { author: "Florian Klauer", sourceUrl: "https://unsplash.com/photos/mk7D-4UCfmg" },
  75: { author: "Jassy Onyae", sourceUrl: "https://unsplash.com/photos/1gBUXhf0PtA" },
  806: { author: "Giovanni Corte", sourceUrl: "https://unsplash.com/photos/n9SLYuyyZhQ" },
};

function picsumId(src: string): number {
  const match = PICSUM.exec(src);
  expect(match, `src fora do padrão demoImageUrl: ${src}`).not.toBeNull();
  return Number(match![1]);
}

describe("DEMO_PROJECTS — summary e gallery (contrato TASK-02)", () => {
  it('todo projeto tem summary começando com "Texto de demonstração."', () => {
    for (const p of DEMO_PROJECTS) {
      expect(typeof p.summary, `summary de ${p.slug}`).toBe("string");
      expect(p.summary!.startsWith("Texto de demonstração."), `summary de ${p.slug}`).toBe(true);
    }
  });

  it("todo projeto tem exatamente 2 imagens em gallery", () => {
    for (const p of DEMO_PROJECTS) {
      expect(Array.isArray(p.gallery), `gallery de ${p.slug}`).toBe(true);
      expect(p.gallery, `gallery de ${p.slug}`).toHaveLength(2);
    }
  });

  it("toda imagem de galeria tem alt não vazio, credit e src do Picsum via demoImageUrl", () => {
    for (const p of DEMO_PROJECTS) {
      for (const image of p.gallery) expectValidDemoImage(image);
    }
  });

  it("nenhuma imagem de galeria repete a capa do mesmo projeto", () => {
    for (const p of DEMO_PROJECTS) {
      const coverId = picsumId(p.cover.src);
      for (const image of p.gallery) {
        expect(image.src).not.toBe(p.cover.src);
        expect(picsumId(image.src), `galeria de ${p.slug} repete a capa`).not.toBe(coverId);
      }
    }
  });

  it("as duas imagens de galeria de um projeto são fotografias diferentes", () => {
    for (const p of DEMO_PROJECTS) {
      const ids = p.gallery.map((image) => picsumId(image.src));
      expect(new Set(ids).size, `galeria de ${p.slug}`).toBe(ids.length);
    }
  });

  it("as 20 imagens da lista da spec são distribuídas, 2 por projeto, com o crédito correspondente", () => {
    const used: number[] = [];
    for (const p of DEMO_PROJECTS) {
      for (const image of p.gallery) {
        const id = picsumId(image.src);
        const source = GALLERY_SOURCES[id];
        expect(source, `id ${id} (${p.slug}) não está na lista da spec`).toBeDefined();
        expect(image.credit).toEqual(source);
        used.push(id);
      }
    }
    expect(new Set(used).size).toBe(Object.keys(GALLERY_SOURCES).length);
  });
});
