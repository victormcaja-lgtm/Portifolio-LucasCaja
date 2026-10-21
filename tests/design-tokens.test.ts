import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// CA-13 (parcial): os tokens de cor/fonte/movimento do design system estão definidos em globals.css.
// Responsividade, alvos de toque e foco visível são validados pelo agente UI/UX no navegador.
const css = readFileSync(resolve(__dirname, "../src/app/globals.css"), "utf8");

function tokenValue(name: string): string | undefined {
  const match = new RegExp(`--${name}\\s*:\\s*([^;]+);`, "i").exec(css);
  return match?.[1].trim();
}

describe("globals.css — tokens do design system", () => {
  it.each([
    ["color-paper", "#F5F3EE"],
    ["color-paper-raised", "#FBFAF7"],
    ["color-ink", "#141413"],
    ["color-ink-muted", "#5E5A54"],
    ["color-rule", "#D9D5CC"],
    ["color-signal", "#9A3B1F"],
  ])("CA-13: define --%s = %s", (name, value) => {
    expect(tokenValue(name)?.toUpperCase()).toBe(value.toUpperCase());
  });

  it("CA-13: define a curva --ease-editorial", () => {
    expect(tokenValue("ease-editorial")?.replace(/\s+/g, "")).toBe("cubic-bezier(0.22,1,0.36,1)");
  });

  it("CA-13: define as famílias --font-display e --font-sans", () => {
    expect(tokenValue("font-display")).toBeTruthy();
    expect(tokenValue("font-sans")).toBeTruthy();
  });

  it("CA-13: tema único claro (não acompanha prefers-color-scheme: dark)", () => {
    expect(css).not.toMatch(/prefers-color-scheme\s*:\s*dark/i);
  });

  it("CA-09: a regra que oculta conteúdo não revelado depende de [data-revealed]", () => {
    expect(css).toMatch(/data-revealed/);
  });
});
