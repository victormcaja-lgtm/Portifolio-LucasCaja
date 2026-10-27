export type ContentSource = "database" | "demo";

/**
 * De onde vêm os projetos públicos.
 *
 * - `DATABASE_URL` definida e não vazia (após `trim`) → `"database"`;
 * - caso contrário → `"demo"` (conteúdo de src/content/demo.ts), o que permite o build sem banco;
 * - exceção: em produção na Vercel (`VERCEL_ENV === "production"`) sem `DATABASE_URL`, lança.
 *   Produção nunca cai no demo silenciosamente.
 *
 * A mensagem de erro cita só o nome da variável, nunca valores.
 */
export function getContentSource(env: NodeJS.ProcessEnv = process.env): ContentSource {
  const hasDatabaseUrl = (env.DATABASE_URL ?? "").trim() !== "";
  if (hasDatabaseUrl) return "database";
  if (env.VERCEL_ENV === "production") {
    throw new Error(
      "DATABASE_URL ausente em produção (VERCEL_ENV=production). Configure a variável no projeto " +
        "da Vercel; o site de produção não usa o conteúdo de demonstração.",
    );
  }
  return "demo";
}
