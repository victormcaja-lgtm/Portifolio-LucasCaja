import type { Page } from "@playwright/test";

/** Títulos dos projetos de demonstração (src/content/demo.ts), por slug. */
export const PROJECT_TITLES: Record<string, string> = {
  "estudo-i": "Estudo I — Demonstração",
  "estudo-ii": "Estudo II — Demonstração",
  "estudo-iii": "Estudo III — Demonstração",
  "editorial-i": "Editorial I — Demonstração",
  "editorial-ii": "Editorial II — Demonstração",
  "colecao-i": "Coleção I — Demonstração",
  "colecao-ii": "Coleção II — Demonstração",
  "filme-i": "Filme I — Demonstração",
  "filme-ii": "Filme II — Demonstração",
  "filme-iii": "Filme III — Demonstração",
};

/** Projetos da categoria "Filme". */
export const FILME_SLUGS = ["filme-i", "filme-ii", "filme-iii"];

export const PROJECT_PATH = "/trabalhos/estudo-i";
export const NOT_FOUND_PATH = "/trabalhos/nao-existe";

/** Extrai o slug de uma URL /trabalhos/{slug}. */
export function slugFromUrl(url: string): string {
  const match = new URL(url).pathname.match(/^\/trabalhos\/([^/]+)\/?$/);
  if (!match) throw new Error(`URL não é de projeto: ${url}`);
  return match[1];
}

/** Navega e espera a rede ficar ociosa (JavaScript carregado e hidratado). */
export async function gotoHydrated(page: Page, path: string) {
  const response = await page.goto(path);
  await page.waitForLoadState("networkidle");
  return response;
}
