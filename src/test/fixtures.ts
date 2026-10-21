import type { CategorySlug, ImageAsset, Project } from "@/lib/types";

export function makeImage(overrides: Partial<ImageAsset> = {}): ImageAsset {
  return {
    src: "https://picsum.photos/id/10/1200/1500?grayscale",
    width: 1200,
    height: 1500,
    alt: "Paisagem em preto e branco (imagem de teste)",
    credit: { author: "Autor de Teste", sourceUrl: "https://unsplash.com/photos/teste" },
    ...overrides,
  };
}

let counter = 0;

export function makeProject(overrides: Partial<Project> = {}): Project {
  counter += 1;
  const n = counter;
  return {
    id: `p-${n}`,
    slug: `projeto-${n}`,
    title: `Projeto ${n}`,
    categories: ["fine-art"] as CategorySlug[],
    cover: makeImage({ alt: `Capa do projeto ${n}` }),
    sortOrder: n,
    isDemo: true,
    gallery: [],
    ...overrides,
  };
}
