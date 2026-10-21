// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assertValidMedia } from "./media-rules";

type MediaInput = Parameters<typeof assertValidMedia>[0];

const externalImage: MediaInput = {
  provider: "EXTERNAL",
  url: "https://picsum.photos/id/10/1200/800?grayscale",
  publicId: null,
  type: "IMAGE",
  alt: "Paisagem enevoada — imagem de demonstração",
};

const cloudinaryImage: MediaInput = {
  provider: "CLOUDINARY",
  publicId: "portfolio/estudo-i/capa",
  url: null,
  type: "IMAGE",
  alt: "Retrato em estúdio",
};

describe("assertValidMedia (CA-04)", () => {
  it("CA-04: aceita EXTERNAL com url https e alt preenchido", () => {
    expect(() => assertValidMedia(externalImage)).not.toThrow();
  });

  it("CA-04: aceita CLOUDINARY com publicId (sem url)", () => {
    expect(() => assertValidMedia(cloudinaryImage)).not.toThrow();
    expect(() => assertValidMedia({ ...cloudinaryImage, url: undefined })).not.toThrow();
  });

  it("CA-04: aceita CLOUDINARY com publicId e url https", () => {
    expect(() =>
      assertValidMedia({ ...cloudinaryImage, url: "https://res.cloudinary.com/x/image/upload/a.jpg" }),
    ).not.toThrow();
  });

  it("CA-04: CLOUDINARY sem publicId (null, undefined ou vazio) → Error", () => {
    expect(() => assertValidMedia({ ...cloudinaryImage, publicId: null })).toThrow(Error);
    expect(() => assertValidMedia({ ...cloudinaryImage, publicId: undefined })).toThrow(Error);
    expect(() => assertValidMedia({ ...cloudinaryImage, publicId: "" })).toThrow(Error);
  });

  it("CA-04: EXTERNAL sem url (null, undefined ou vazia) → Error", () => {
    expect(() => assertValidMedia({ ...externalImage, url: null })).toThrow(Error);
    expect(() => assertValidMedia({ ...externalImage, url: undefined })).toThrow(Error);
    expect(() => assertValidMedia({ ...externalImage, url: "" })).toThrow(Error);
  });

  it("CA-04: EXTERNAL com publicId mas sem url → Error", () => {
    expect(() =>
      assertValidMedia({ ...externalImage, url: null, publicId: "algum/id" }),
    ).toThrow(Error);
  });

  it("CA-04: url não-https → Error", () => {
    expect(() =>
      assertValidMedia({ ...externalImage, url: "http://picsum.photos/id/10/1200/800" }),
    ).toThrow(Error);
    expect(() => assertValidMedia({ ...externalImage, url: "ftp://example.com/a.jpg" })).toThrow(
      Error,
    );
    expect(() => assertValidMedia({ ...externalImage, url: "nao-e-uma-url" })).toThrow(Error);
  });

  it("CA-04: url não-https também é rejeitada para CLOUDINARY", () => {
    expect(() =>
      assertValidMedia({ ...cloudinaryImage, url: "http://res.cloudinary.com/x/a.jpg" }),
    ).toThrow(Error);
  });

  it("CA-04: IMAGE com alt vazio → Error", () => {
    expect(() => assertValidMedia({ ...externalImage, alt: "" })).toThrow(Error);
    expect(() => assertValidMedia({ ...cloudinaryImage, alt: "" })).toThrow(Error);
  });

  it("CA-04: VIDEO com alt vazio é aceito (a exigência de alt vale só para IMAGE)", () => {
    expect(() =>
      assertValidMedia({ ...externalImage, type: "VIDEO", alt: "" }),
    ).not.toThrow();
  });

  it("CA-04: VIDEO continua sujeito às regras de provedor e https", () => {
    expect(() => assertValidMedia({ ...externalImage, type: "VIDEO", url: null })).toThrow(Error);
    expect(() =>
      assertValidMedia({ ...cloudinaryImage, type: "VIDEO", publicId: null }),
    ).toThrow(Error);
    expect(() =>
      assertValidMedia({ ...externalImage, type: "VIDEO", url: "http://example.com/v.mp4" }),
    ).toThrow(Error);
  });
});
