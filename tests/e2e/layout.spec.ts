import { expect, test } from "@playwright/test";
import { PROJECT_PATH, gotoHydrated } from "./helpers";

test.describe("CA-06: sem rolagem horizontal em 320×640", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const path of ["/", PROJECT_PATH]) {
    test(`CA-06: ${path} tem scrollWidth <= innerWidth`, async ({ page }) => {
      await gotoHydrated(page, path);
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(innerWidth).toBe(320);
      expect(scrollWidth, `scrollWidth ${scrollWidth} > innerWidth ${innerWidth}`).toBeLessThanOrEqual(
        innerWidth,
      );
    });
  }
});
