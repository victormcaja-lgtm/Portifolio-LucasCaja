/**
 * TASK-05: usuário OWNER SÓ de teste, criado/atualizado pelo global setup do E2E no banco local.
 * A senha é conhecida de propósito (usuário fictício, banco local); não é um segredo real.
 */
export const E2E_OWNER = {
  email: "e2e-owner@exemplo.test",
  name: "Dono E2E",
  password: "senha-e2e-conhecida-2026",
} as const;

/**
 * Banco usado pelo servidor do E2E e pelo global setup. Por padrão, o Postgres local do Docker
 * (`npm run db:up`), o mesmo do `.env.example`. O `.env` não é lido aqui.
 */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://portfolio:portfolio@localhost:5434/portfolio?schema=public";

/** Segredo SÓ de teste para o servidor do E2E, usado quando BETTER_AUTH_SECRET está ausente. */
export const E2E_AUTH_SECRET = "segredo-somente-de-teste-e2e-0123456789abcdef";
