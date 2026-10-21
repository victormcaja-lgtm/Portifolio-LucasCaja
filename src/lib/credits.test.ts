import { describe, expect, it } from "vitest";
import { collectImageCredits } from "./credits";
import type { ImageAsset, ImageCredit } from "./types";

function img(src: string, credit?: ImageCredit): ImageAsset {
  return { src, width: 100, height: 100, alt: `Imagem ${src}`, credit };
}

const ana: ImageCredit = { author: "Ana", sourceUrl: "https://example.com/ana-1" };
const anaOutra: ImageCredit = { author: "Ana", sourceUrl: "https://example.com/ana-2" };
const bruno: ImageCredit = { author: "Bruno", sourceUrl: "https://example.com/bruno" };

describe("collectImageCredits", () => {
  it("retorna lista vazia para lista de imagens vazia", () => {
    expect(collectImageCredits([])).toEqual([]);
  });

  it("mantém a ordem de primeira aparição", () => {
    const result = collectImageCredits([img("a", bruno), img("b", ana), img("c", bruno)]);
    expect(result).toEqual([bruno, ana]);
  });

  it("remove duplicatas de autor + sourceUrl (mesmo com objetos distintos)", () => {
    const result = collectImageCredits([
      img("a", ana),
      img("b", { author: "Ana", sourceUrl: "https://example.com/ana-1" }),
      img("c", ana),
    ]);
    expect(result).toEqual([ana]);
  });

  it("não considera duplicata o mesmo autor com URLs diferentes", () => {
    const result = collectImageCredits([img("a", ana), img("b", anaOutra)]);
    expect(result).toEqual([ana, anaOutra]);
  });

  it("não considera duplicata autores diferentes com a mesma URL", () => {
    const outro: ImageCredit = { author: "Carla", sourceUrl: ana.sourceUrl };
    expect(collectImageCredits([img("a", ana), img("b", outro)])).toEqual([ana, outro]);
  });

  it("ignora imagens sem crédito", () => {
    const result = collectImageCredits([img("a"), img("b", ana), img("c")]);
    expect(result).toEqual([ana]);
  });

  it("retorna lista vazia quando nenhuma imagem tem crédito", () => {
    expect(collectImageCredits([img("a"), img("b")])).toEqual([]);
  });
});

describe("collectImageCredits — complementos (CA-10)", () => {
  it("CA-10: não muta a lista de entrada", () => {
    const images = Object.freeze([img("a", ana), img("b", ana), img("c", bruno)]);
    const copy = images.map((i) => ({ ...i }));
    collectImageCredits(images);
    expect(images).toEqual(copy);
  });

  it("CA-10: capa + galeria de um projeto → créditos na ordem capa, galeria", () => {
    const cover = img("capa", bruno);
    const gallery = [img("g1", ana), img("g2", bruno), img("g3", anaOutra)];
    expect(collectImageCredits([cover, ...gallery])).toEqual([bruno, ana, anaOutra]);
  });
});
