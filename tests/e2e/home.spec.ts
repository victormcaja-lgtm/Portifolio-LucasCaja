import { expect, test } from "@playwright/test";
import { FILME_SLUGS, gotoHydrated } from "./helpers";

test.describe("Página inicial", () => {
  test("CA-01: carrega com 200, hero, um único h1, 10 cards e aviso de demonstração", async ({
    page,
  }) => {
    const response = await gotoHydrated(page, "/");
    expect(response?.status()).toBe(200);

    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText("Lucas Caja");

    // Hero: a seção que contém o h1, com a imagem de destaque visível.
    const hero = page.locator("section", { has: h1 });
    await expect(hero).toBeVisible();
    await expect(hero.locator("img").first()).toBeVisible();

    const grid = page.locator("#trabalhos");
    await expect(grid.locator("article")).toHaveCount(10);
    await expect(grid.getByRole("link")).toHaveCount(10);

    const notice = page.getByRole("note");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("Conteúdo de demonstração");
  });

  test("CA-02: filtro Filme reduz a lista e atualiza o contador; Todos restaura", async ({
    page,
  }) => {
    await gotoHydrated(page, "/");
    const grid = page.locator("#trabalhos");
    const cards = grid.locator("article");
    const filters = page.getByRole("group", { name: "Filtrar por categoria" });
    const counter = grid.getByText(/^\d+ projetos?$/);

    await expect(cards).toHaveCount(10);
    await expect(counter).toHaveText("10 projetos");

    const filme = filters.getByRole("button", { name: "Filme", exact: true });
    await filme.click();
    await expect(filme).toHaveAttribute("aria-pressed", "true");
    await expect(cards).toHaveCount(FILME_SLUGS.length);
    await expect(counter).toHaveText(`${FILME_SLUGS.length} projetos`);
    const hrefs = await grid
      .getByRole("link")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs.sort()).toEqual(FILME_SLUGS.map((s) => `/trabalhos/${s}`).sort());

    const todos = filters.getByRole("button", { name: "Todos", exact: true });
    await todos.click();
    await expect(todos).toHaveAttribute("aria-pressed", "true");
    await expect(filme).toHaveAttribute("aria-pressed", "false");
    await expect(cards).toHaveCount(10);
    await expect(counter).toHaveText("10 projetos");
  });
});

test.describe("CA-03: menu mobile", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "O menu mobile só existe no projeto mobile.");
  });

  test("CA-03: Abrir menu abre o painel com os links", async ({ page }) => {
    await gotoHydrated(page, "/");
    await page.getByRole("button", { name: "Abrir menu" }).click();

    const panel = page.getByRole("navigation", { name: "Menu" });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link", { name: "Trabalhos" })).toBeVisible();
    await expect(panel.getByRole("link", { name: "Contato" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Fechar menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  test("CA-03: Escape fecha o painel e devolve o foco ao botão", async ({ page }) => {
    await gotoHydrated(page, "/");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    const panel = page.getByRole("navigation", { name: "Menu" });
    await expect(panel).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    const toggle = page.getByRole("button", { name: "Abrir menu" });
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("CA-03: clicar em Contato fecha o painel e rola até #contato", async ({ page }) => {
    await gotoHydrated(page, "/");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    const panel = page.getByRole("navigation", { name: "Menu" });
    await panel.getByRole("link", { name: "Contato" }).click();

    await expect(panel).toBeHidden();
    await expect(page).toHaveURL(/#contato$/);
    await expect(page.locator("#contato")).toBeInViewport();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
});
