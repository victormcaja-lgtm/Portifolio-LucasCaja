import { z } from "zod";

const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

function isPostgresUrl(value: string): boolean {
  try {
    return POSTGRES_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

// As mensagens são fixas: nunca incluem o valor recebido (pode conter credenciais).
const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string({ error: "ausente" })
    .min(1, { error: "ausente" })
    .refine(isPostgresUrl, { error: "deve ser uma URL postgres:// ou postgresql://" }),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Variáveis de ambiente do servidor, validadas. Lança `Error` citando a variável inválida. */
export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse({ DATABASE_URL: process.env.DATABASE_URL });
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Variáveis de ambiente do servidor inválidas — ${problems}. Veja .env.example.`);
  }
  return result.data;
}
