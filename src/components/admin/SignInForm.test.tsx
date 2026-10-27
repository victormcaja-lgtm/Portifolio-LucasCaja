import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "./SignInForm";

/**
 * TASK-05, tela /admin/entrar. `SignInForm` é um Client Component:
 * - props: `{ next?: string | null }` (o `?next=` da URL);
 * - envia com `authClient.signIn.email({ email, password })` (`@/lib/auth-client`);
 * - sucesso → navega com `useRouter()` (replace ou push) para `safeAdminRedirect(next)`;
 * - erro → mensagem genérica com role="alert"; 429 → mensagem de rate limit.
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
    usePathname: () => "/admin/entrar",
  };
});

const EMAIL = "dono@exemplo.test";
const PASSWORD = "senha-correta-123";
const GENERIC_ERROR = "E-mail ou senha inválidos.";
const RATE_LIMIT_ERROR = "Muitas tentativas. Aguarde um minuto.";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function navigations(): string[] {
  return [...router.replace.mock.calls, ...router.push.mock.calls].map(([url]) => String(url));
}

async function fillAndSubmit(email = EMAIL, password = PASSWORD) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("E-mail"), email);
  await user.type(screen.getByLabelText("Senha"), password);
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  return user;
}

function expectNoAlertText() {
  const alert = screen.queryByRole("alert");
  if (alert) expect(alert).toHaveTextContent(/^\s*$/);
}

beforeEach(() => {
  for (const fn of Object.values(auth)) fn.mockReset();
  for (const fn of Object.values(router)) fn.mockReset();
  auth.signInEmail.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("SignInForm — campos e acessibilidade", () => {
  it("campo E-mail com label visível, type=email e autocomplete=username", () => {
    render(<SignInForm />);
    const email = screen.getByLabelText("E-mail");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "username");
    expect(email).toBeRequired();
    expect((email as HTMLInputElement).labels?.[0]?.tagName).toBe("LABEL");
  });

  it("campo Senha com label visível, type=password e autocomplete=current-password", () => {
    render(<SignInForm />);
    const password = screen.getByLabelText("Senha");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(password).toBeRequired();
    expect((password as HTMLInputElement).labels?.[0]?.tagName).toBe("LABEL");
  });

  it('botão "Entrar" do tipo submit, habilitado', () => {
    render(<SignInForm />);
    const button = screen.getByRole("button", { name: "Entrar" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toBeEnabled();
  });

  it('ciclo 2, item 1: o botão "Entrar" tem foco visível com contorno em ink', () => {
    render(<SignInForm />);
    const button = screen.getByRole("button", { name: "Entrar" });
    expect(button.className.split(/\s+/)).toContain("focus-visible:outline-ink");
  });

  it("sem erro, não há mensagem de alerta", () => {
    render(<SignInForm />);
    expectNoAlertText();
  });
});

describe("SignInForm — envio", () => {
  it("envia e-mail e senha para authClient.signIn.email", async () => {
    render(<SignInForm />);
    await fillAndSubmit();
    expect(auth.signInEmail).toHaveBeenCalledTimes(1);
    expect(auth.signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: EMAIL, password: PASSWORD }),
    );
  });

  it("o botão fica desabilitado durante o envio e volta ao fim (erro)", async () => {
    const pending = deferred<unknown>();
    auth.signInEmail.mockReturnValue(pending.promise);
    render(<SignInForm />);
    await fillAndSubmit();
    expect(screen.getByRole("button")).toBeDisabled();

    await act(async () => {
      pending.resolve({ data: null, error: { status: 401, message: "Invalid email or password" } });
    });
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("um clique duplo durante o envio não dispara duas requisições", async () => {
    const pending = deferred<unknown>();
    auth.signInEmail.mockReturnValue(pending.promise);
    render(<SignInForm />);
    const user = await fillAndSubmit();
    await user.click(screen.getByRole("button"));
    expect(auth.signInEmail).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve({ data: null, error: { status: 401 } });
    });
  });
});

describe("SignInForm — sucesso", () => {
  it("CA-3: sem next, vai para /admin", async () => {
    render(<SignInForm />);
    await fillAndSubmit();
    await waitFor(() => expect(navigations()).toContain("/admin"));
    expectNoAlertText();
  });

  it("com next válido, vai para o caminho pedido", async () => {
    render(<SignInForm next="/admin/projetos" />);
    await fillAndSubmit();
    await waitFor(() => expect(navigations()).toContain("/admin/projetos"));
  });

  it.each(["//evil.com", "https://evil.com", "/admin/../x", "/adminx", "/admin/entrar"])(
    "next malicioso %j → vai para /admin (safeAdminRedirect)",
    async (next) => {
      render(<SignInForm next={next} />);
      await fillAndSubmit();
      await waitFor(() => expect(navigations()).toContain("/admin"));
      for (const url of navigations()) expect(url).toBe("/admin");
    },
  );
});

describe("SignInForm — erros", () => {
  it("credenciais inválidas → mensagem genérica em role=alert, sem navegar", async () => {
    auth.signInEmail.mockResolvedValue({
      data: null,
      error: { status: 401, code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" },
    });
    render(<SignInForm />);
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(GENERIC_ERROR);
    expect(navigations()).toEqual([]);
  });

  it("CA-5: usuário banido (sessão recusada) → a mesma mensagem genérica, sem revelar o motivo", async () => {
    auth.signInEmail.mockResolvedValue({
      data: null,
      error: { status: 403, code: "BANNED_USER", message: "You have been banned from this application" },
    });
    render(<SignInForm />);
    await fillAndSubmit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(GENERIC_ERROR);
    expect(document.body).not.toHaveTextContent(/ban/i);
    expect(navigations()).toEqual([]);
  });

  it("erro interno do servidor → mensagem genérica", async () => {
    auth.signInEmail.mockResolvedValue({
      data: null,
      error: { status: 500, message: "Failed to create session" },
    });
    render(<SignInForm />);
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(GENERIC_ERROR);
    expect(document.body).not.toHaveTextContent("Failed to create session");
  });

  it("CA-6: rate limit (429) → \"Muitas tentativas. Aguarde um minuto.\"", async () => {
    auth.signInEmail.mockResolvedValue({
      data: null,
      error: { status: 429, message: "Too many requests. Please try again later." },
    });
    render(<SignInForm />);
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(RATE_LIMIT_ERROR);
    expect(navigations()).toEqual([]);
  });

  it("falha de rede (promessa rejeitada) → alerta com texto e botão reabilitado", async () => {
    auth.signInEmail.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<SignInForm />);
    await fillAndSubmit();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent?.trim()).not.toBe("");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    expect(navigations()).toEqual([]);
  });

  it("a mensagem de erro nunca contém a senha digitada", async () => {
    auth.signInEmail.mockResolvedValue({ data: null, error: { status: 401 } });
    render(<SignInForm />);
    await fillAndSubmit(EMAIL, "senha-ultra-secreta-999");
    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("senha-ultra-secreta-999");
  });
});
