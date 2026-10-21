import { describe, expect, it } from "vitest";
import {
  EDITORIAL_PATTERN_LENGTH,
  getEditorialSlot,
  getSlotClassName,
  type EditorialSlot,
} from "@/lib/editorial-layout";

const SPANS = ["wide", "medium", "narrow"] as const;
const ALIGNS = ["start", "center", "end"] as const;
const ASPECTS = ["portrait", "landscape", "square"] as const;

function cycle(): EditorialSlot[] {
  return Array.from({ length: EDITORIAL_PATTERN_LENGTH }, (_, i) => getEditorialSlot(i));
}

function mdSpan(className: string): number | undefined {
  const match = className.split(/\s+/).find((t) => /^md:col-span-\d+$/.test(t));
  return match ? Number(match.replace("md:col-span-", "")) : undefined;
}

describe("getEditorialSlot (contrato de módulo)", () => {
  it("EDITORIAL_PATTERN_LENGTH é 6", () => {
    expect(EDITORIAL_PATTERN_LENGTH).toBe(6);
  });

  it("retorna slots com valores válidos", () => {
    for (const slot of cycle()) {
      expect(SPANS).toContain(slot.span);
      expect(ALIGNS).toContain(slot.align);
      expect(ASPECTS).toContain(slot.aspect);
      expect(typeof slot.offset).toBe("boolean");
    }
  });

  it("é cíclico: slot(i) igual a slot(i + EDITORIAL_PATTERN_LENGTH)", () => {
    for (let i = 0; i < EDITORIAL_PATTERN_LENGTH * 4; i++) {
      expect(getEditorialSlot(i + EDITORIAL_PATTERN_LENGTH)).toEqual(getEditorialSlot(i));
    }
  });

  it("slots consecutivos nunca têm o mesmo align (inclusive na virada do ciclo)", () => {
    for (let i = 0; i < EDITORIAL_PATTERN_LENGTH * 3; i++) {
      expect(getEditorialSlot(i + 1).align).not.toBe(getEditorialSlot(i).align);
    }
  });

  it('cada ciclo contém ao menos um "wide", um "narrow", um "portrait" e um "landscape"', () => {
    const slots = cycle();
    expect(slots.some((s) => s.span === "wide")).toBe(true);
    expect(slots.some((s) => s.span === "narrow")).toBe(true);
    expect(slots.some((s) => s.aspect === "portrait")).toBe(true);
    expect(slots.some((s) => s.aspect === "landscape")).toBe(true);
  });

  it.each([-1, -6, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "lança RangeError para índice %s",
    (index) => {
      expect(() => getEditorialSlot(index)).toThrow(RangeError);
    },
  );
});

describe("getSlotClassName (contrato de módulo / CA-08)", () => {
  const allSlots: EditorialSlot[] = SPANS.flatMap((span) =>
    ALIGNS.flatMap((align) =>
      ASPECTS.flatMap((aspect) => [true, false].map((offset) => ({ span, align, aspect, offset }))),
    ),
  );

  it("retorna string não vazia e sem classes repetidas para qualquer slot", () => {
    for (const slot of allSlots) {
      const className = getSlotClassName(slot);
      expect(className.trim().length).toBeGreaterThan(0);
      const tokens = className.trim().split(/\s+/);
      expect(new Set(tokens).size).toBe(tokens.length);
    }
  });

  it("CA-08: posiciona na grade de 12 colunas a partir de md (md:col-span-N)", () => {
    for (const slot of allSlots) {
      const span = mdSpan(getSlotClassName(slot));
      expect(span).toBeDefined();
      expect(span).toBeGreaterThanOrEqual(1);
      expect(span).toBeLessThanOrEqual(12);
    }
  });

  it("CA-08: abaixo de md não divide a coluna única (colunas só com prefixo md+ ou ocupando toda a largura)", () => {
    const safeUnprefixed = /^(col-span-full|col-span-1|col-start-1|col-auto)$/;
    for (const slot of allSlots) {
      for (const token of getSlotClassName(slot).split(/\s+/)) {
        if (/^(sm:)?col-(span|start|end)-/.test(token)) {
          expect(token.replace(/^sm:/, "")).toMatch(safeUnprefixed);
        }
      }
    }
  });

  it("CA-08: larguras variadas — wide > medium > narrow em md", () => {
    const base = { align: "start", aspect: "portrait", offset: false } as const;
    const wide = mdSpan(getSlotClassName({ ...base, span: "wide" }))!;
    const medium = mdSpan(getSlotClassName({ ...base, span: "medium" }))!;
    const narrow = mdSpan(getSlotClassName({ ...base, span: "narrow" }))!;
    expect(wide).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(narrow);
  });

  it("CA-08: alinhamentos diferentes geram posicionamentos diferentes", () => {
    const base = { span: "narrow", aspect: "portrait", offset: false } as const;
    const classes = ALIGNS.map((align) => getSlotClassName({ ...base, align }));
    expect(new Set(classes).size).toBe(ALIGNS.length);
  });

  it("CA-08: o ciclo editorial não é uniforme", () => {
    const classes = cycle().map(getSlotClassName);
    expect(new Set(classes).size).toBeGreaterThan(1);
  });
});
