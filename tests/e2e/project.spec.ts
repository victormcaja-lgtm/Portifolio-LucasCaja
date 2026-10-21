import { expect, test } from "@playwright/test";
import { NOT_FOUND_PATH, PROJECT_TITLES, gotoHydrated, slugFromUrl } from "./helpers";

test.describe("Página de projeto", () => {
  test("CA-04: o primeiro card leva ao projeto; Próximo, Anterior e Todos os trabalhos navegam", async ({
    page,
  }) => {
    await gotoHydrated(page, "/");
    const firstLink = page.locator("#trabalhos article").first().getByRole("link");
    const href = await firstLink.getAttribute("href");
    expect(href).toMatch(/^\/trabalhos\/[^/]+$/);
    await firstLink.click();

    await expect(page).toHaveURL(new RegExp(`${href}$`));
    const firstSlug = slugFromUrl(page.url());
    // Com cacheComponents, o Next preserva a rota anterior oculta (React Activity, display:none);
    // por isso o h1 é buscado pelo papel ARIA, que ignora elementos ocultos.
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(PROJECT_TITLES[firstSlug]);

    // Próximo: leva a outro projeto.
    await page.getByRole("link", { name: /Próximo/ }).click();
    await expect(page).not.toHaveURL(new RegExp(`/trabalhos/${firstSlug}$`));
    await expect(page).toHaveURL(/\/trabalhos\/[^/]+$/);
    const nextSlug = slugFromUrl(page.url());
    await expect(h1).toHaveText(PROJECT_TITLES[nextSlug]);

    // Anterior: leva a outro projeto (de volta ao primeiro).
    await page.getByRole("link", { name: /Anterior/ }).click();
    await expect(page).not.toHaveURL(new RegExp(`/trabalhos/${nextSlug}$`));
    await expect(page).toHaveURL(/\/trabalhos\/[^/]+$/);
    const previousSlug = slugFromUrl(page.url());
    expect(previousSlug).toBe(firstSlug);
    await expect(h1).toHaveText(PROJECT_TITLES[previousSlug]);

    // Todos os trabalhos: volta para /#trabalhos.
    await page.getByRole("link", { name: "Todos os trabalhos" }).click();
    await expect(page).toHaveURL(/\/#trabalhos$/);
    await expect(page.locator("#trabalhos")).toBeInViewport();
  });

  test("CA-05: /trabalhos/nao-existe responde 404 e mostra Página não encontrada", async ({
    page,
  }) => {
    const response = await page.goto(NOT_FOUND_PATH);
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "Página não encontrada" }),
    ).toBeVisible();
  });
});

test.describe("CA-12: proxy de 404 (HTML do servidor, sem JavaScript)", () => {
  test("CA-12: slug inexistente responde 404 e o HTML já contém o h1 Página não encontrada", async ({
    request,
  }) => {
    const response = await request.get(NOT_FOUND_PATH);
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).toMatch(/<h1[^>]*>\s*Página não encontrada\s*<\/h1>/);
  });

  test("CA-12: slug existente responde 200", async ({ request }) => {
    const response = await request.get("/trabalhos/estudo-i");
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(PROJECT_TITLES["estudo-i"]);
  });
});
