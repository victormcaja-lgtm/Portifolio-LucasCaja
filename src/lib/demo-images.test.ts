import { describe, expect, it } from "vitest";
import { demoImageUrl } from "@/lib/demo-images";

describe("demoImageUrl (contrato de módulo)", () => {
  it("gera a URL do Picsum em escala de cinza", () => {
    expect(demoImageUrl(1015, 1200, 1500)).toBe("https://picsum.photos/id/1015/1200/1500?grayscale");
  });

  it("aceita id 0", () => {
    expect(demoImageUrl(0, 800, 600)).toBe("https://picsum.photos/id/0/800/600?grayscale");
  });

  it.each([
    [-1, 800, 600],
    [1.5, 800, 600],
    [Number.NaN, 800, 600],
    [10, 0, 600],
    [10, -800, 600],
    [10, 800.5, 600],
    [10, 800, 0],
    [10, 800, -1],
    [10, 800, 2.2],
    [10, Number.POSITIVE_INFINITY, 600],
  ])("lança RangeError para (%s, %s, %s)", (id, width, height) => {
    expect(() => demoImageUrl(id, width, height)).toThrow(RangeError);
  });
});
