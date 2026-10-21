// @vitest-environment node
import { describe, expect, it } from "vitest";
import { toDomainProject, toImageAsset } from "./mappers";

/**
 * Os tipos de linha vêm do Prisma gerado (`MediaRow`, `ProjectRowWithRelations`).
 * Aqui os objetos são literais, no formato do schema da TASK-04, convertidos
 * para o tipo do parâmetro de cada função.
 */
type MediaRow = Parameters<typeof toImageAsset>[0];
type ProjectRow = Parameters<typeof toDomainProject>[0];

const CREATED_AT = new Date("2026-01-01T00:00:00Z");

function media(overrides: Record<string, unknown> = {}): MediaRow {
  return {
    id: "m-1",
    type: "IMAGE",
    provider: "EXTERNAL",
    publicId: null,
    url: "https://picsum.photos/id/10/1200/1500?grayscale",
    width: 1200,
    height: 1500,
    durationSec: null,
    bytes: null,
    format: null,
    alt: "Retrato em contraluz — imagem de demonstração",
    caption: null,
    creditAuthor: "Alexander Shustov",
    creditUrl: "https://unsplash.com/photos/2FrX56QL7P8",
    sortOrder: 0,
    projectId: "p-1",
    uploadedById: null,
    createdAt: CREATED_AT,
    ...overrides,
  } as unknown as MediaRow;
}

function category(slug: string, name: string, sortOrder: number) {
  return {
    id: `c-${slug}`,
    name,
    slug,
    description: null,
    sortOrder,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function link(projectId: string, cat: ReturnType<typeof category>) {
  return { projectId, categoryId: cat.id, category: cat };
}

const cover = media({ id: "m-cover", sortOrder: 0, url: "https://picsum.photos/id/1/1200/1500" });
const galleryB = media({
  id: "m-b",
  sortOrder: 2,
  url: "https://picsum.photos/id/3/1800/1200",
  width: 1800,
  height: 1200,
  alt: "Imagem B",
  creditAuthor: "Autor B",
  creditUrl: "https://unsplash.com/photos/b",
});
const galleryA = media({
  id: "m-a",
  sortOrder: 1,
  url: "https://picsum.photos/id/2/1400/1400",
  width: 1400,
  height: 1400,
  alt: "Imagem A",
  creditAuthor: "Autor A",
  creditUrl: "https://unsplash.com/photos/a",
});
const video = media({
  id: "m-video",
  type: "VIDEO",
  sortOrder: 3,
  url: "https://example.com/video.mp4",
  alt: "",
  durationSec: 30,
});

function projectRow(overrides: Record<string, unknown> = {}): ProjectRow {
  const fashion = category("fashion-editorial", "Fashion Editorial", 2);
  const fineArt = category("fine-art", "Fine Art", 1);
  return {
    id: "p-1",
    title: "Estudo I — Demonstração",
    slug: "estudo-i",
    summary: "Texto de demonstração.",
    body: null,
    credits: null,
    status: "PUBLISHED",
    featured: false,
    isDemo: true,
    sortOrder: 10,
    publishedAt: CREATED_AT,
    coverId: "m-cover",
    authorId: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    cover,
    // Fora de ordem de propósito: o mapeador deve ordenar.
    media: [galleryB, video, cover, galleryA],
    categories: [link("p-1", fashion), link("p-1", fineArt)],
    ...overrides,
  } as unknown as ProjectRow;
}

describe("toImageAsset (CA-05)", () => {
  it("CA-05: EXTERNAL → src = url, dimensões, alt e crédito montado de creditAuthor/creditUrl", () => {
    expect(toImageAsset(media())).toEqual({
      src: "https://picsum.photos/id/10/1200/1500?grayscale",
      width: 1200,
      height: 1500,
      alt: "Retrato em contraluz — imagem de demonstração",
      credit: { author: "Alexander Shustov", sourceUrl: "https://unsplash.com/photos/2FrX56QL7P8" },
    });
  });

  it("CA-05: EXTERNAL sem creditAuthor/creditUrl → sem credit", () => {
    const asset = toImageAsset(media({ creditAuthor: null, creditUrl: null }));
    expect(asset.credit).toBeUndefined();
    expect(asset.src).toBe("https://picsum.photos/id/10/1200/1500?grayscale");
  });

  it('CA-05: CLOUDINARY → lança Error("Cloudinary ainda não configurado")', () => {
    const row = media({ provider: "CLOUDINARY", publicId: "portfolio/x", url: null });
    expect(() => toImageAsset(row)).toThrow(Error);
    expect(() => toImageAsset(row)).toThrow("Cloudinary ainda não configurado");
  });
});

describe("toDomainProject (CA-05)", () => {
  it("CA-05: mapeia campos escalares (id, slug, title, sortOrder, isDemo, summary)", () => {
    const project = toDomainProject(projectRow());
    expect(project.id).toBe("p-1");
    expect(project.slug).toBe("estudo-i");
    expect(project.title).toBe("Estudo I — Demonstração");
    expect(project.sortOrder).toBe(10);
    expect(project.isDemo).toBe(true);
    expect(project.summary).toBe("Texto de demonstração.");
  });

  it("CA-05: isDemo false é copiado", () => {
    expect(toDomainProject(projectRow({ isDemo: false })).isDemo).toBe(false);
  });

  it("CA-05: summary null → undefined", () => {
    const project = toDomainProject(projectRow({ summary: null }));
    expect(project.summary).toBeUndefined();
  });

  it("CA-05: categorias ordenadas pelo sortOrder da categoria", () => {
    expect(toDomainProject(projectRow()).categories).toEqual(["fine-art", "fashion-editorial"]);
  });

  it("CA-05: capa mapeada como ImageAsset", () => {
    expect(toDomainProject(projectRow()).cover).toEqual(toImageAsset(cover));
  });

  it("CA-05: gallery = mídias IMAGE exceto a capa, por sortOrder", () => {
    const { gallery } = toDomainProject(projectRow());
    expect(gallery).toEqual([toImageAsset(galleryA), toImageAsset(galleryB)]);
  });

  it("CA-05: sem mídias além da capa → gallery vazia", () => {
    expect(toDomainProject(projectRow({ media: [cover] })).gallery).toEqual([]);
  });

  it("CA-05: resultado completo segue o tipo de domínio Project", () => {
    expect(toDomainProject(projectRow())).toEqual({
      id: "p-1",
      slug: "estudo-i",
      title: "Estudo I — Demonstração",
      categories: ["fine-art", "fashion-editorial"],
      cover: toImageAsset(cover),
      sortOrder: 10,
      isDemo: true,
      summary: "Texto de demonstração.",
      gallery: [toImageAsset(galleryA), toImageAsset(galleryB)],
    });
  });
});
