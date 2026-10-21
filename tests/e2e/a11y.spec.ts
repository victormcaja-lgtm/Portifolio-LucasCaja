import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { NOT_FOUND_PATH, PROJECT_PATH, gotoHydrated } from "./helpers";

const PAGES = [
  { name: "página inicial", path: "/" },
  { name: "página de projeto", path: PROJECT_PATH },
  { name: "404", path: NOT_FOUND_PATH },
];

test.describe("CA-07: acessibilidade automatizada (axe)", () => {
  for (const { name, path } of PAGES) {
    test(`CA-07: ${name} (${path}) sem violações serious/critical`, async ({ page }) => {
      await gotoHydrated(page, path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      const severe = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      const report = severe
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.help}\n` +
            v.nodes
              .map(
                (n) =>
                  `    - ${n.target.join(" ")}\n      ${(n.failureSummary ?? "").replace(/\n/g, "\n      ")}`,
              )
              .join("\n"),
        )
        .join("\n");
      expect(severe.map((v) => v.id), `Violações axe em ${path}:\n${report}`).toEqual([]);
    });
  }
});

test.describe("CA-08: teclado", () => {
  test("CA-08: o primeiro Tab foca Pular para o conteúdo e ativá-lo move o foco para #conteudo", async ({
    page,
  }) => {
    await gotoHydrated(page, "/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#conteudo$/);
    await expect(page.locator("#conteudo")).toBeFocused();
  });
});

test.describe("CA-09: movimento reduzido", () => {
  test.use({ reducedMotion: "reduce" });

  test("CA-09: todos os cards ficam visíveis (opacidade 1) sem rolar", async ({ page }) => {
    await gotoHydrated(page, "/");
    const cards = page.locator("#trabalhos article");
    await expect(cards).toHaveCount(10);

    await expect
      .poll(() =>
        cards.evaluateAll((articles) =>
          articles.map((article) => {
            // Opacidade efetiva: produto das opacidades do bloco revelável até a raiz.
            let opacity = 1;
            let el: Element | null = article.querySelector("[data-revealed]") ?? article;
            for (; el; el = el.parentElement) opacity *= Number(getComputedStyle(el).opacity);
            return opacity;
          }),
        ),
      )
      .toEqual(Array(10).fill(1));
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});
