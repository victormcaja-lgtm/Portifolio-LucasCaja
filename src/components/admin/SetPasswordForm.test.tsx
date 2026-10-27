import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SetPasswordForm } from "./SetPasswordForm";

/**
 * TASK-05, tela /admin/definir-senha?token=…. `SetPasswordForm` é um Client Component:
 * - props: `{ token: string | null }`;
 * - sem token → mensagem "Link inválido ou expirado." e nenhum formulário;
 * - campos "Nova senha" e "Confirmar senha" (autocomplete=new-password, mínimo 12);
 * - validação no cliente (tamanho e igualdade) antes de chamar a API;
 * - envia com `authClient.resetPassword({ newPassword, token })`;
 * - sucesso → "Senha definida com sucesso." e link "Entrar" (/admin/entrar), sem formulário;
 * - token inválido/expirado na resposta → "Link inválido ou expirado." e nenhum formulário.
 */
const auth = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: auth.signInEmail },
    signOut: auth.signOut,
    resetPassword: auth.resetPassword,
  },
}));

const router = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useRouter: () => router,
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/admin/definir-senha",
  };
});

const TOKEN = "token-de-teste-abc123";
const GOOD_PASSWORD = "uma-senha-bem-longa-42";
const INVALID_LINK = /link inválido ou expirado/i;
const MISMATCH = "As senhas não conferem.";
const TOO_SHORT = /pelo menos 12 caracteres/i;
const SUCCESS = "Senha definida com sucesso.";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function passwordInputs() {
  return document.querySelectorAll('input[type="password"]');
}

function expectNoForm() {
  expect(passwordInputs()).toHaveLength(0);
  expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Definir senha" })).not.toBeInTheDocument();
}

async function fill(newPassword: string, confirm: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Nova senha"), newPassword);
  await user.type(screen.getByLabelText("Confirmar senha"), confirm);
  return user;
}

/** Submete pelo evento do formulário (garante que a validação do componente roda, além da nativa). */
function submitForm() {
  const form = screen.getByLabelText("Nova senha").closest("form");
  expect(form).not.toBeNull();
  fireEvent.submit(form as HTMLFormElement);
}

beforeEach(() => {
  for (const fn of Object.values(auth)) fn.mockReset();
  for (const fn of Object.values(router)) fn.mockReset();
  auth.resetPassword.mockResolvedValue({ data: { status: true }, error: null });
});

describe("SetPasswordForm — token ausente", () => {
  it.each([null, ""])("token %j → mensagem clara e nenhum formulário", (token) => {
    render(<SetPasswordForm token={token} />);
    expect(screen.getByText(INVALID_LINK)).toBeInTheDocument();
    expectNoForm();
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });
});

describe("SetPasswordForm — campos e acessibilidade", () => {
  it.each(["Nova senha", "Confirmar senha"])(
    "%s: label visível, type=password, autocomplete=new-password, mínimo 12",
    (label) => {
      render(<SetPasswordForm token={TOKEN} />);
      const input = screen.getByLabelText(label) as HTMLInputElement;
      expect(input).toHaveAttribute("type", "password");
      expect(input).toHaveAttribute("autocomplete", "new-password");
      expect(input).toHaveAttribute("minlength", "12");
      expect(input).toBeRequired();
      expect(input.labels?.[0]?.tagName).toBe("LABEL");
    },
  );

  it('botão "Definir senha" do tipo submit', () => {
    render(<SetPasswordForm token={TOKEN} />);
    expect(screen.getByRole("button", { name: "Definir senha" })).toHaveAttribute("type", "submit");
  });

  it("não mostra o token na tela", () => {
    render(<SetPasswordForm token={TOKEN} />);
    expect(document.body).not.toHaveTextContent(TOKEN);
  });
});

describe("SetPasswordForm — validação no cliente", () => {
  it("senhas diferentes → \"As senhas não conferem.\" em role=alert, sem chamar a API", async () => {
    render(<SetPasswordForm token={TOKEN} />);
    await fill(GOOD_PASSWORD, `${GOOD_PASSWORD}-x`);
    submitForm();
    expect(await screen.findByRole("alert")).toHaveTextContent(MISMATCH);
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it("senha com 11 caracteres → mensagem de mínimo em role=alert, sem chamar a API", async () => {
    render(<SetPasswordForm token={TOKEN} />);
    await fill("12345678901", "12345678901");
    submitForm();
    expect(await screen.findByRole("alert")).toHaveTextContent(TOO_SHORT);
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });
});

describe("SetPasswordForm — envio e sucesso", () => {
  it("CA-2: envia newPassword e token para authClient.resetPassword", async () => {
    render(<SetPasswordForm token={TOKEN} />);
    const user = await fill(GOOD_PASSWORD, GOOD_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Definir senha" }));
    expect(auth.resetPassword).toHaveBeenCalledTimes(1);
    expect(auth.resetPassword).toHaveBeenCalledWith(
      expect.objectContaining({ newPassword: GOOD_PASSWORD, token: TOKEN }),
    );
  });

  it("o botão fica desabilitado durante o envio", async () => {
    const pending = deferred<unknown>();
    auth.resetPassword.mockReturnValue(pending.promise);
    render(<SetPasswordForm token={TOKEN} />);
    const user = await fill(GOOD_PASSWORD, GOOD_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Definir senha" }));
    expect(screen.getByRole("button")).toBeDisabled();
    await user.click(screen.getByRole("button"));
    expect(auth.resetPassword).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve({ data: { status: true }, error: null });
    });
  });

  it("sucesso → mensagem, link \"Entrar\" para /admin/entrar e nenhum formulário", async () => {
    render(<SetPasswordForm token={TOKEN} />);
    const user = await fill(GOOD_PASSWORD, GOOD_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Definir senha" }));
    expect(await screen.findByText(SUCCESS)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/admin/entrar");
    expectNoForm();
  });
});

describe("SetPasswordForm — erros da API", () => {
  it("token inválido ou expirado → mensagem clara em role=alert e nenhum formulário", async () => {
    auth.resetPassword.mockResolvedValue({
      data: null,
      error: { status: 400, code: "INVALID_TOKEN", message: "Invalid token" },
    });
    render(<SetPasswordForm token={TOKEN} />);
    const user = await fill(GOOD_PASSWORD, GOOD_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Definir senha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_LINK);
    expectNoForm();
    expect(document.body).not.toHaveTextContent("Invalid token");
  });

  it("outro erro (ex.: rede) → alerta com texto, formulário mantido e botão reabilitado", async () => {
    auth.resetPassword.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<SetPasswordForm token={TOKEN} />);
    const user = await fill(GOOD_PASSWORD, GOOD_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Definir senha" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent?.trim()).not.toBe("");
    expect(screen.getByRole("button", { name: "Definir senha" })).toBeEnabled();
    expect(alert).not.toHaveTextContent(GOOD_PASSWORD);
  });
});
