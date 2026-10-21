/**
 * Conteúdo de DEMONSTRAÇÃO da página inicial.
 * Imagens do Unsplash servidas pelo Picsum (escala de cinza), com crédito ao autor.
 * Nada aqui representa trabalhos, clientes ou fatos reais — substituir pelo acervo definitivo.
 */
import { demoImageUrl } from "@/lib/demo-images";
import type { CategorySlug, ImageAsset, ImageCredit, Project } from "@/lib/types";

/** Dimensões da capa conforme o aspecto do slot editorial que o projeto ocupa sem filtro. */
const COVER_SIZE = {
  portrait: { width: 1200, height: 1500 },
  landscape: { width: 1800, height: 1200 },
  square: { width: 1400, height: 1400 },
} as const;

function demoImage(
  id: number,
  size: { width: number; height: number },
  alt: string,
  credit: ImageCredit,
): ImageAsset {
  return {
    src: demoImageUrl(id, size.width, size.height),
    width: size.width,
    height: size.height,
    alt,
    credit,
  };
}

export const DEMO_HERO: ImageAsset = demoImage(
  65,
  { width: 2400, height: 1600 },
  "Retrato em contraluz de uma mulher de cabelos longos em um campo — imagem de demonstração",
  { author: "Alexander Shustov", sourceUrl: "https://unsplash.com/photos/2FrX56QL7P8" },
);

interface DemoProjectInput {
  slug: string;
  title: string;
  categories: CategorySlug[];
  imageId: number;
  aspect: keyof typeof COVER_SIZE;
  alt: string;
  credit: ImageCredit;
}

const INPUTS: readonly DemoProjectInput[] = [
  {
    slug: "estudo-i",
    title: "Estudo I — Demonstração",
    categories: ["fine-art"],
    imageId: 550,
    aspect: "landscape",
    alt: "Silhueta de uma pessoa sentada diante de uma paisagem enevoada — imagem de demonstração",
    credit: { author: "Christopher Sardegna", sourceUrl: "https://unsplash.com/photos/CMOa3H1SXG0" },
  },
  {
    slug: "editorial-i",
    title: "Editorial I — Demonstração",
    categories: ["fashion-editorial"],
    imageId: 1027,
    aspect: "portrait",
    alt: "Retrato de uma mulher com o olhar voltado para baixo — imagem de demonstração",
    credit: { author: "Roksolana Zasiadko", sourceUrl: "https://unsplash.com/photos/LyeduBb2Auk" },
  },
  {
    slug: "estudo-ii",
    title: "Estudo II — Demonstração",
    categories: ["fine-art"],
    imageId: 738,
    aspect: "portrait",
    alt: "Copo-de-leite contra fundo escuro, em still life — imagem de demonstração",
    credit: { author: "Marta Pawlik", sourceUrl: "https://unsplash.com/photos/yqmlajPxR3Y" },
  },
  {
    slug: "filme-i",
    title: "Filme I — Demonstração",
    categories: ["filme"],
    imageId: 31,
    aspect: "square",
    alt: "Pés em contraluz, em alto contraste — imagem de demonstração",
    credit: { author: "How-Soon Ngu", sourceUrl: "https://unsplash.com/photos/7Vz3DtQDT3Q" },
  },
  {
    slug: "filme-ii",
    title: "Filme II — Demonstração",
    categories: ["filme"],
    imageId: 1011,
    aspect: "landscape",
    alt: "Mulher remando uma canoa em um lago — imagem de demonstração",
    credit: { author: "Roberto Nickson", sourceUrl: "https://unsplash.com/photos/7BjmDICVloE" },
  },
  {
    slug: "colecao-i",
    title: "Coleção I — Demonstração",
    categories: ["high-fashion"],
    imageId: 64,
    aspect: "portrait",
    alt: "Mulher de óculos escuros segurando flores — imagem de demonstração",
    credit: { author: "Alexander Shustov", sourceUrl: "https://unsplash.com/photos/AHBiSKaENwc" },
  },
  {
    slug: "editorial-ii",
    title: "Editorial II — Demonstração",
    categories: ["fashion-editorial"],
    imageId: 535,
    aspect: "landscape",
    alt: "Cabides em uma arara, com um calendário ao fundo — imagem de demonstração",
    credit: { author: "Jeff Sheldon", sourceUrl: "https://unsplash.com/photos/Lj1S1_KD61k" },
  },
  {
    slug: "colecao-ii",
    title: "Coleção II — Demonstração",
    categories: ["high-fashion", "fashion-editorial"],
    imageId: 978,
    aspect: "portrait",
    alt: "Rosto de uma mulher refletido em um vidro — imagem de demonstração",
    credit: {
      author: "María Victoria Heredia Reyes",
      sourceUrl: "https://unsplash.com/photos/0Hvh69RZjXs",
    },
  },
  {
    slug: "filme-iii",
    title: "Filme III — Demonstração",
    categories: ["filme", "fine-art"],
    imageId: 680,
    aspect: "portrait",
    alt: "Mão apoiada contra um vidro coberto de gotas — imagem de demonstração",
    credit: { author: "Milada Vigerova", sourceUrl: "https://unsplash.com/photos/kT0tsYZ2YE0" },
  },
  {
    slug: "estudo-iii",
    title: "Estudo III — Demonstração",
    categories: ["fine-art"],
    imageId: 1009,
    aspect: "square",
    alt: "Homem de costas diante do mar — imagem de demonstração",
    credit: { author: "Christopher Campbell", sourceUrl: "https://unsplash.com/photos/CMWRIzyMKZk" },
  },
];

export const DEMO_PROJECTS: readonly Project[] = Object.freeze(
  INPUTS.map(
    (input, index): Project => ({
      id: `demo-${input.slug}`,
      slug: input.slug,
      title: input.title,
      categories: input.categories,
      cover: demoImage(input.imageId, COVER_SIZE[input.aspect], input.alt, input.credit),
      sortOrder: (index + 1) * 10,
      isDemo: true,
    }),
  ),
);
