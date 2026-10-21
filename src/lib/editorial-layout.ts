export type SlotSpan = "wide" | "medium" | "narrow";
export type SlotAlign = "start" | "center" | "end";
export type SlotAspect = "portrait" | "landscape" | "square";

export interface EditorialSlot {
  span: SlotSpan;
  align: SlotAlign;
  aspect: SlotAspect;
  offset: boolean;
}

/**
 * Ritmo editorial de 6 tempos. Com o auto-posicionamento da grade de 12 colunas,
 * resulta em linhas alternadas: par assimétrico (largo + estreito deslocado),
 * peça isolada ao centro, par invertido, respiro estreito ao centro.
 * Nos dois pares o deslocamento vertical fica na peça estreita (a mais baixa), para que as
 * duas colunas terminem próximas e a cadência vertical se repita — sem vão sob o par invertido.
 */
const PATTERN: readonly EditorialSlot[] = Object.freeze([
  { span: "wide", align: "start", aspect: "landscape", offset: false },
  { span: "narrow", align: "end", aspect: "portrait", offset: true },
  { span: "medium", align: "center", aspect: "portrait", offset: false },
  { span: "narrow", align: "start", aspect: "square", offset: true },
  { span: "wide", align: "end", aspect: "landscape", offset: false },
  { span: "narrow", align: "center", aspect: "portrait", offset: false },
]);

export const EDITORIAL_PATTERN_LENGTH: number = PATTERN.length;

/** Slot editorial para o índice (base 0) do card na lista exibida. */
export function getEditorialSlot(index: number): EditorialSlot {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(`Índice inválido: ${index}`);
  }
  return { ...PATTERN[index % EDITORIAL_PATTERN_LENGTH] };
}

/** Largura em colunas (de 12) a partir de md. */
const SPAN_CLASS: Record<SlotSpan, string> = {
  wide: "md:col-span-7",
  // Em tablet (md) a peça estreita ganha uma coluna para não ficar apertada.
  medium: "md:col-span-6 lg:col-span-5",
  narrow: "md:col-span-5 lg:col-span-4",
};

/**
 * Coluna inicial por largura e alinhamento (a peça sempre termina até a coluna 12).
 * Em md, os pares largo + estreito somam 12 colunas (7 + 5); em lg o estreito volta a 4
 * e sobra uma coluna vazia entre as peças do par, dando respiro.
 */
const START_CLASS: Record<SlotSpan, Record<SlotAlign, string>> = {
  wide: { start: "md:col-start-1", center: "md:col-start-3", end: "md:col-start-6" },
  medium: {
    start: "md:col-start-1",
    center: "md:col-start-4",
    end: "md:col-start-7 lg:col-start-8",
  },
  narrow: {
    start: "md:col-start-1",
    center: "md:col-start-4 lg:col-start-5",
    end: "md:col-start-8 lg:col-start-9",
  },
};

const OFFSET_CLASS = "md:mt-32 lg:mt-48";

/** Classes Tailwind de posicionamento na grade de 12 colunas (sem efeito abaixo de md). */
export function getSlotClassName(slot: EditorialSlot): string {
  const classes = [SPAN_CLASS[slot.span], START_CLASS[slot.span][slot.align], "md:self-start"];
  if (slot.offset) classes.push(OFFSET_CLASS);
  return classes.join(" ");
}
