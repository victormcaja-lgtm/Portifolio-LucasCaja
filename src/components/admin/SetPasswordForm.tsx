"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { ERROR_MESSAGE, FIELD_INPUT, FIELD_LABEL, PRIMARY_BUTTON, TEXT_LINK } from "./form-styles";

/** Mesmos limites do servidor (src/server/auth-options.ts). */
const MIN_LENGTH = 12;
const MAX_LENGTH = 128;

const INVALID_LINK = "Link inválido ou expirado.";
const TOO_SHORT = `A senha deve ter pelo menos ${MIN_LENGTH} caracteres.`;
const TOO_LONG = `A senha deve ter no máximo ${MAX_LENGTH} caracteres.`;
const MISMATCH = "As senhas não conferem.";
const RATE_LIMIT = "Muitas tentativas. Aguarde um minuto.";
const GENERIC = "Não foi possível definir a senha. Tente novamente.";

/** Códigos do Better Auth que significam link inutilizável (inválido, expirado ou já usado). */
const INVALID_LINK_CODES = new Set(["INVALID_TOKEN", "USER_NOT_FOUND"]);

type Status = "form" | "invalid" | "success";

interface SetPasswordFormProps {
  /** Token do link de uso único (`?token=`). Nunca é exibido. */
  token: string | null;
}

function validate(password: string, confirmation: string): string | null {
  if (password.length < MIN_LENGTH) return TOO_SHORT;
  if (password.length > MAX_LENGTH) return TOO_LONG;
  if (password !== confirmation) return MISMATCH;
  return null;
}

function messageFor(error: { status?: number; code?: string }): string {
  if (error.status === 429) return RATE_LIMIT;
  if (error.code === "PASSWORD_TOO_SHORT") return TOO_SHORT;
  if (error.code === "PASSWORD_TOO_LONG") return TOO_LONG;
  return GENERIC;
}

/** Definição de senha pelo link de uso único (primeiro acesso do OWNER; convites na TASK-08). */
export function SetPasswordForm({ token }: SetPasswordFormProps) {
  const id = useId();
  const [status, setStatus] = useState<Status>(token ? "form" : "invalid");
  const [announceInvalid, setAnnounceInvalid] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !token) return;
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");

    const problem = validate(newPassword, confirmation);
    if (problem) {
      setError(problem);
      return;
    }

    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const result = await authClient.resetPassword({ newPassword, token });
      if (!result.error) {
        setStatus("success");
      } else if (result.error.code && INVALID_LINK_CODES.has(result.error.code)) {
        setAnnounceInvalid(true);
        setStatus("invalid");
      } else {
        setError(messageFor(result.error));
      }
    } catch {
      setError(GENERIC);
    }
    inFlight.current = false;
    setPending(false);
  }

  if (status === "invalid") {
    return (
      <div className="grid max-w-md gap-6">
        <p role={announceInvalid ? "alert" : undefined} className="font-sans text-lg leading-relaxed text-ink">
          {INVALID_LINK}
        </p>
        <p className="font-sans text-base leading-relaxed text-ink-muted">
          Cada link funciona uma única vez e expira em 60 minutos. Peça um novo link a quem
          administra o site.
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="grid max-w-md gap-6">
        <p role="status" className="font-sans text-lg leading-relaxed text-ink">
          Senha definida com sucesso.
        </p>
        <div>
          <Link href="/admin/entrar" className={TEXT_LINK}>
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  return (
    // noValidate: a validação é própria (mensagem do design system em role="alert"), nunca o
    // balão nativo. minLength/maxLength ficam como dica para tecnologias assistivas.
    <form noValidate onSubmit={handleSubmit} className="grid max-w-md gap-8">
      <p id={`${id}-regra`} className="font-sans text-base leading-relaxed text-ink-muted">
        Use pelo menos {MIN_LENGTH} caracteres.
      </p>
      <div>
        <label htmlFor={`${id}-nova`} className={FIELD_LABEL}>
          Nova senha
        </label>
        <input
          id={`${id}-nova`}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          maxLength={MAX_LENGTH}
          required
          aria-describedby={`${id}-regra`}
          className={FIELD_INPUT}
        />
      </div>
      <div>
        <label htmlFor={`${id}-confirmar`} className={FIELD_LABEL}>
          Confirmar senha
        </label>
        <input
          id={`${id}-confirmar`}
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          maxLength={MAX_LENGTH}
          required
          className={FIELD_INPUT}
        />
      </div>
      <p role="alert" className={ERROR_MESSAGE}>
        {error}
      </p>
      <div>
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
          {pending ? "Salvando…" : "Definir senha"}
        </button>
      </div>
    </form>
  );
}
