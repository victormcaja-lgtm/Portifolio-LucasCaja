import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E_OWNER } from "./auth-fixtures";
import { gotoHydrated } from "./helpers";

/**
 * TASK-05: autenticação do /admin no build de produção.
 * O OWNER de teste é criado pelo global setup (tests/e2e/global-setup.ts).
 *
 * Rate limit: o login aceita 5 tentativas por 60 s por IP, e todas as requisições do E2E saem do
 * mesmo IP. Por isso cada projeto (desktop e mobile) faz só 2 tentativas: uma certa (no fluxo
 * completo: login → painel → axe → logout) e uma errada. O global setup limpa a tabela de rate
 * limit antes de cada execução.
 */

// CA-8: traces gravam cookies de sessão e valores digitados; não gerar esse artefato aqui.
test.use({ trace: "off" });

async function expectNoSevereAxeViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const severe = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const report = severe
    .map((v) => `[${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes.map((n) => n.target.join(" ")).join("\n    ")}`)
    .join("\n");
  expect(severe.map((v) => v.id), `Violações axe em ${label}:\n${report}`).toEqual([]);
}

async function expectNoIndex(page: Page) {
  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveCount(1);
  const content = (await robots.getAttribute("content")) ?? "";
  expect(content).toMatch(/noindex/);
  expect(content).toMatch(/nofollow/);
}

async function expectAdminShell(page: Page) {
  await expect(page.getByRole("link", { name: "Ver site" })).toBeVisible();
  // Sem o cabeçalho público (menu Trabalhos/Contato).
  await expect(page.getByRole("link", { name: "Trabalhos" })).toHaveCount(0);
}

function expectLoginUrl(url: string, next: string | null) {
  const parsed = new URL(url);
  expect(parsed.pathname).toBe("/admin/entrar");
  expect(parsed.searchParams.get("next")).toBe(next);
}

async function fillLogin(page: Page, password: string) {
  await page.getByLabel("E-mail").fill(E2E_OWNER.email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.describe("TASK-05: /admin sem sessão", () => {
  test("CA-3: /admin sem sessão redireciona para /admin/entrar?next=/admin", async ({ page }) => {
    await page.goto("/admin");
    expectLoginUrl(page.url(), "/admin");
    await expect(page.getByLabel("E-mail")).toBeVisible();
  });

  test("CA-1: não há link nem tela de cadastro", async ({ page }) => {
    await gotoHydrated(page, "/admin/entrar");
    await expect(page.getByRole("link", { name: /cadastr|criar conta|registr/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /cadastr|criar conta|registr/i })).toHaveCount(0);
  });

  test("/admin/entrar: noindex, layout do admin e sem violações graves de axe", async ({ page }) => {
    await gotoHydrated(page, "/admin/entrar");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expectNoIndex(page);
    await expectAdminShell(page);
    await expectNoSevereAxeViolations(page, "/admin/entrar");
  });

  test("/admin/definir-senha sem token: mensagem clara, sem formulário, sem violações graves", async ({
    page,
  }) => {
    await gotoHydrated(page, "/admin/definir-senha");
    await expect(page.getByText(/link inválido ou expirado/i)).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expectNoIndex(page);
    await expectAdminShell(page);
    await expectNoSevereAxeViolations(page, "/admin/definir-senha");
  });

  test("/admin/definir-senha com token: formulário acessível, sem violações graves", async ({
    page,
  }) => {
    await gotoHydrated(page, "/admin/definir-senha?token=token-e2e-qualquer");
    // Se a página validar o token no servidor, mostra a mensagem de link inválido; caso
    // contrário, o formulário. Nos dois casos, a tela precisa passar no axe.
    const form = page.getByLabel("Nova senha");
    const invalid = page.getByText(/link inválido ou expirado/i);
    await expect(form.or(invalid).first()).toBeVisible();
    await expectNoIndex(page);
    await expectNoSevereAxeViolations(page, "/admin/definir-senha?token=…");
  });

  test("/admin/entrar não gera console.error nem pageerror", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    await gotoHydrated(page, "/admin/entrar");
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("TASK-05: login e logout", () => {
  test("CA-3: senha errada mostra o erro genérico e não entra", async ({ page }) => {
    await gotoHydrated(page, "/admin/entrar");
    await fillLogin(page, "senha-errada-qualquer-123");
    await expect(page.getByRole("alert")).toHaveText("E-mail ou senha inválidos.");
    expect(new URL(page.url()).pathname).toBe("/admin/entrar");
    await page.goto("/admin");
    expectLoginUrl(page.url(), "/admin");
  });

  test("CA-3: login com sucesso, painel com nome e papel, axe, e Sair encerra a sessão", async ({
    page,
  }) => {
    await test.step("redirect sem sessão e login", async () => {
      await page.goto("/admin");
      expectLoginUrl(page.url(), "/admin");
      await page.waitForLoadState("networkidle");
      await fillLogin(page, E2E_OWNER.password);
      await page.waitForURL((url) => url.pathname === "/admin");
    });

    await test.step("painel: nome, papel e texto honesto", async () => {
      await expect(
        page.getByRole("heading", { level: 1, name: `Olá, ${E2E_OWNER.name}` }),
      ).toBeVisible();
      await expect(page.getByText("Proprietário")).toBeVisible();
      await expect(page.getByText("O painel de projetos chega na próxima etapa.")).toBeVisible();
      await expectNoIndex(page);
      await expectAdminShell(page);
    });

    await test.step("o cookie de sessão é httpOnly", async () => {
      const cookies = await page.context().cookies();
      const session = cookies.find((c) => /session_token$/.test(c.name));
      expect(session, "cookie de sessão").toBeDefined();
      expect(session?.httpOnly).toBe(true);
    });

    await test.step("axe em /admin", async () => {
      await page.waitForLoadState("networkidle");
      await expectNoSevereAxeViolations(page, "/admin");
    });

    await test.step("já logado, /admin/entrar redireciona para /admin", async () => {
      await page.goto("/admin/entrar");
      await page.waitForURL((url) => url.pathname === "/admin");
    });

    await test.step("Sair encerra a sessão e volta para /admin/entrar", async () => {
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Sair" }).click();
      await page.waitForURL((url) => url.pathname === "/admin/entrar");
      const cookies = await page.context().cookies();
      expect(cookies.find((c) => /session_token$/.test(c.name) && c.value !== "")).toBeUndefined();
      await page.goto("/admin");
      expectLoginUrl(page.url(), "/admin");
    });
  });
});
