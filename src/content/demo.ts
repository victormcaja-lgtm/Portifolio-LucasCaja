/**
 * Conteúdo de DEMONSTRAÇÃO da página inicial e das páginas de projeto.
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

/** Imagem de galeria: id Picsum, proporção, descrição neutra (sem o sufixo) e crédito. */
interface DemoGalleryInput {
  imageId: number;
  aspect: keyof typeof COVER_SIZE;
  description: string;
  credit: ImageCredit;
}

interface DemoProjectInput {
  slug: string;
  title: string;
  /** Na ordem canônica de CATEGORIES (a mesma que o banco devolve; ver src/server/mappers.ts). */
  categories: CategorySlug[];
  imageId: number;
  aspect: keyof typeof COVER_SIZE;
  alt: string;
  credit: ImageCredit;
  gallery: readonly [DemoGalleryInput, DemoGalleryInput];
}

/** Texto provisório, idêntico em todos os projetos: nada sobre o trabalho é inventado. */
const DEMO_SUMMARY =
  "Texto de demonstração. A descrição deste projeto será escrita pelo fotógrafo.";

const DEMO_ALT_SUFFIX = " — imagem de demonstração";

function unsplash(author: string, photoId: string): ImageCredit {
  return { author, sourceUrl: `https://unsplash.com/photos/${photoId}` };
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
    gallery: [
      {
        imageId: 735,
        aspect: "landscape",
        description: "Cânion coberto por névoa",
        credit: unsplash("wyman H", "ZQeRH1XD4Tc"),
      },
      {
        imageId: 722,
        aspect: "portrait",
        description: "Árvore na névoa",
        credit: unsplash("Sebastian Kostrubala", "4yDg-dDX9uM"),
      },
    ],
  },
  {
    slug: "editorial-i",
    title: "Editorial I — Demonstração",
    categories: ["fashion-editorial"],
    imageId: 1027,
    aspect: "portrait",
    alt: "Retrato de uma mulher com o olhar voltado para baixo — imagem de demonstração",
    credit: { author: "Roksolana Zasiadko", sourceUrl: "https://unsplash.com/photos/LyeduBb2Auk" },
    gallery: [
      {
        imageId: 936,
        aspect: "landscape",
        description: "Curva de uma estrutura arquitetônica",
        credit: unsplash("LoboStudio Hamburg", "awnHOXjsdT4"),
      },
      {
        imageId: 486,
        aspect: "portrait",
        description: "Máquina de escrever antiga",
        credit: unsplash("Florian Klauer", "mk7D-4UCfmg"),
      },
    ],
  },
  {
    slug: "estudo-ii",
    title: "Estudo II — Demonstração",
    categories: ["fine-art"],
    imageId: 738,
    aspect: "portrait",
    alt: "Copo-de-leite contra fundo escuro, em still life — imagem de demonstração",
    credit: { author: "Marta Pawlik", sourceUrl: "https://unsplash.com/photos/yqmlajPxR3Y" },
    gallery: [
      {
        imageId: 23,
        aspect: "landscape",
        description: "Garfos em still life",
        credit: unsplash("Alejandro Escamilla", "8yqds_91OLw"),
      },
      {
        imageId: 35,
        aspect: "portrait",
        description: "Detalhe de um cacto em close",
        credit: unsplash("Shane Colella", "znM0ujn2RUA"),
      },
    ],
  },
  {
    slug: "filme-i",
    title: "Filme I — Demonstração",
    categories: ["filme"],
    imageId: 31,
    aspect: "square",
    alt: "Pés em contraluz, em alto contraste — imagem de demonstração",
    credit: { author: "How-Soon Ngu", sourceUrl: "https://unsplash.com/photos/7Vz3DtQDT3Q" },
    gallery: [
      {
        imageId: 682,
        aspect: "landscape",
        description: "Abstração de luz",
        credit: unsplash("Logan Troxell", "DsQmBlbywJ8"),
      },
      {
        imageId: 1042,
        aspect: "portrait",
        description: "Rastros de estrelas no céu noturno",
        credit: unsplash("Jeremy Thomas", "rMmibFe4czY"),
      },
    ],
  },
  {
    slug: "filme-ii",
    title: "Filme II — Demonstração",
    categories: ["filme"],
    imageId: 1011,
    aspect: "landscape",
    alt: "Mulher remando uma canoa em um lago — imagem de demonstração",
    credit: { author: "Roberto Nickson", sourceUrl: "https://unsplash.com/photos/7BjmDICVloE" },
    gallery: [
      {
        imageId: 827,
        aspect: "landscape",
        description: "Lago ao entardecer",
        credit: unsplash("kazuend", "2KXEb_8G5vo"),
      },
      {
        imageId: 1038,
        aspect: "portrait",
        description: "Mar diante de montanhas",
        credit: unsplash("Marcelo Quinan", "upywS5QFwr8"),
      },
    ],
  },
  {
    slug: "colecao-i",
    title: "Coleção I — Demonstração",
    categories: ["high-fashion"],
    imageId: 64,
    aspect: "portrait",
    alt: "Mulher de óculos escuros segurando flores — imagem de demonstração",
    credit: { author: "Alexander Shustov", sourceUrl: "https://unsplash.com/photos/AHBiSKaENwc" },
    gallery: [
      {
        imageId: 948,
        aspect: "landscape",
        description: "Fachada de uma torre",
        credit: unsplash("Mihail Ribkin", "VjmlDjePHjE"),
      },
      {
        imageId: 75,
        aspect: "portrait",
        description: "Cachos de uva",
        credit: unsplash("Jassy Onyae", "1gBUXhf0PtA"),
      },
    ],
  },
  {
    slug: "editorial-ii",
    title: "Editorial II — Demonstração",
    categories: ["fashion-editorial"],
    imageId: 535,
    aspect: "landscape",
    alt: "Cabides em uma arara, com um calendário ao fundo — imagem de demonstração",
    credit: { author: "Jeff Sheldon", sourceUrl: "https://unsplash.com/photos/Lj1S1_KD61k" },
    gallery: [
      {
        imageId: 1065,
        aspect: "landscape",
        description: "Beco estreito com vista para o mar",
        credit: unsplash("Bertrand Zuchuat", "Uax2bg5EizU"),
      },
      {
        imageId: 156,
        aspect: "portrait",
        description: "Pegadas na areia",
        credit: unsplash("Christopher Sardegna", "iRyGmA_no2Q"),
      },
    ],
  },
  {
    slug: "colecao-ii",
    title: "Coleção II — Demonstração",
    categories: ["fashion-editorial", "high-fashion"],
    imageId: 978,
    aspect: "portrait",
    alt: "Rosto de uma mulher refletido em um vidro — imagem de demonstração",
    credit: {
      author: "María Victoria Heredia Reyes",
      sourceUrl: "https://unsplash.com/photos/0Hvh69RZjXs",
    },
    gallery: [
      {
        imageId: 930,
        aspect: "landscape",
        description: "Montanhas vistas do alto",
        credit: unsplash("Dominik Lange", "ZUvF7qEIcVI"),
      },
      {
        imageId: 833,
        aspect: "portrait",
        description: "Torre do relógio na névoa",
        credit: unsplash("Paul Green", "OIbwHaG9NC8"),
      },
    ],
  },
  {
    slug: "filme-iii",
    title: "Filme III — Demonstração",
    categories: ["fine-art", "filme"],
    imageId: 680,
    aspect: "portrait",
    alt: "Mão apoiada contra um vidro coberto de gotas — imagem de demonstração",
    credit: { author: "Milada Vigerova", sourceUrl: "https://unsplash.com/photos/kT0tsYZ2YE0" },
    gallery: [
      {
        imageId: 512,
        aspect: "landscape",
        description: "Mar coberto por névoa",
        credit: unsplash("Jeff Sheldon", "jTeQavJjBDs"),
      },
      {
        imageId: 1003,
        aspect: "portrait",
        description: "Filhote de cervo na floresta",
        credit: unsplash("E+N Photographies", "GYumuBnTqKc"),
      },
    ],
  },
  {
    slug: "estudo-iii",
    title: "Estudo III — Demonstração",
    categories: ["fine-art"],
    imageId: 1009,
    aspect: "square",
    alt: "Homem de costas diante do mar — imagem de demonstração",
    credit: { author: "Christopher Campbell", sourceUrl: "https://unsplash.com/photos/CMWRIzyMKZk" },
    gallery: [
      {
        imageId: 806,
        aspect: "landscape",
        description: "Cordilheira",
        credit: unsplash("Giovanni Corte", "n9SLYuyyZhQ"),
      },
      {
        imageId: 829,
        aspect: "portrait",
        description: "Formações rochosas",
        credit: unsplash("Drew Hays", "e6Fi_FBMfY0"),
      },
    ],
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
      summary: DEMO_SUMMARY,
      gallery: input.gallery.map((image) =>
        demoImage(
          image.imageId,
          COVER_SIZE[image.aspect],
          `${image.description}${DEMO_ALT_SUFFIX}`,
          image.credit,
        ),
      ),
    }),
  ),
);
