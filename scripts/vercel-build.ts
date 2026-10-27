/**
 * Build na Vercel (`npm run vercel-build`; a Vercel usa este script no lugar de `build`).
 *
 * - Produção (`VERCEL_ENV === "production"`): `prisma migrate deploy` e depois `next build`.
 * - Qualquer outro ambiente (Preview, Development, local): só `next build`. Assim, um preview
 *   nunca migra o banco de produção.
 *
 * As migrações usam `DATABASE_URL_UNPOOLED` quando existe (ver prisma.config.ts).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Comandos a executar, em ordem. Pura: só decide, não executa nada. */
export function planBuildSteps(env: NodeJS.ProcessEnv): string[][] {
  const build = ["npx", "next", "build"];
  if (env.VERCEL_ENV === "production") return [["npx", "prisma", "migrate", "deploy"], build];
  return [build];
}

/** Executa os passos; uma falha encerra com o código de saída do comando. */
function run(steps: readonly string[][]): void {
  for (const [command, ...args] of steps) {
    console.log(`\n> ${[command, ...args].join(" ")}`);
    // No Windows, `npx` é um .cmd e só roda via shell; os passos são constantes deste arquivo,
    // então a linha montada não contém entrada externa. Na Vercel (Linux) não há shell.
    const result =
      process.platform === "win32"
        ? spawnSync([command, ...args].join(" "), { stdio: "inherit", shell: true })
        : spawnSync(command, args, { stdio: "inherit" });
    if (result.error) {
      console.error(`Falha ao iniciar "${command}" (${result.error.name}).`);
      process.exit(1);
    }
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

/** Verdadeiro só quando este arquivo é o ponto de entrada (`tsx scripts/vercel-build.ts`). */
function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && path.resolve(entry) === fileURLToPath(import.meta.url);
}

if (isMainModule()) run(planBuildSteps(process.env));
