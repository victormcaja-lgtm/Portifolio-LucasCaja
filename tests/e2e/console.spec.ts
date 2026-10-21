import { expect, test } from "@playwright/test";
import { PROJECT_PATH, gotoHydrated } from "./helpers";

test.describe("CA-10: sem erros no console", () => {
  for (const path of ["/", PROJECT_PATH]) {
    test(`CA-10: ${path} não gera console.error nem pageerror`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") {
          const { url, lineNumber } = message.location();
          errors.push(`console.error: ${message.text()} (${url}:${lineNumber})`);
        }
      });
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

      await gotoHydrated(page, path);
      // Rola até o fim para disparar imagens lazy e revelações.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForLoadState("networkidle");

      expect(errors, errors.join("\n")).toEqual([]);
    });
  }
});
