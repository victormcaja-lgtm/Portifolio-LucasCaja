"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { safeAdminRedirect } from "@/lib/safe-redirect";
import { ERROR_MESSAGE, FIELD_INPUT, FIELD_LABEL, PRIMARY_BUTTON } from "./form-styles";

const GENERIC_ERROR = "E-mail ou senha inválidos.";
const RATE_LIMIT_ERROR = "Muitas tentativas. Aguarde um minuto.";
const NETWORK_ERROR = "Não foi possível conectar. Verifique a conexão e tente novamente.";

interface SignInFormProps {
  /** Valor de `?next=` da URL; passa por safeAdminRedirect antes de navegar. */
  next?: string | null;
}

/**
 * Login por e-mail e senha. Qualquer recusa (senha errada, usuário banido, erro do servidor)
 * mostra a mesma mensagem genérica; só o rate limit (429) tem mensagem própria.
 */
export function SignInForm({ next = null }: SignInFormProps) {
  const router = useRouter();
  const id = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  // Trava síncrona contra envio duplo (o estado `pending` só vale no próximo render).
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.status === 429 ? RATE_LIMIT_ERROR : GENERIC_ERROR);
      } else {
        // Continua desabilitado durante a navegação.
        router.replace(safeAdminRedirect(next));
        return;
      }
    } catch {
      setError(NETWORK_ERROR);
    }
    inFlight.current = false;
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-md gap-8">
      <div>
        <label htmlFor={`${id}-email`} className={FIELD_LABEL}>
          E-mail
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="username"
          required
          className={FIELD_INPUT}
        />
      </div>
      <div>
        <label htmlFor={`${id}-senha`} className={FIELD_LABEL}>
          Senha
        </label>
        <input
          id={`${id}-senha`}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={FIELD_INPUT}
        />
      </div>
      <p role="alert" className={ERROR_MESSAGE}>
        {error}
      </p>
      <div>
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </div>
    </form>
  );
}
