import { describe, expect, it } from "vitest";
import { PRIMARY_BUTTON } from "./form-styles";

/**
 * TASK-05, ciclo de correção 2, item 1 (bloqueante do ui-ux): o contorno de foco do botão
 * primário herdava `currentColor` (`paper`) e ficava invisível sobre o fundo `ink`/`paper`.
 * `PRIMARY_BUTTON` precisa fixar a cor do contorno com `focus-visible:outline-ink`.
 */
describe("PRIMARY_BUTTON", () => {
  it("ciclo 2, item 1: tem foco visível com contorno em ink (focus-visible:outline-ink)", () => {
    expect(PRIMARY_BUTTON.split(/\s+/)).toContain("focus-visible:outline-ink");
  });
});
