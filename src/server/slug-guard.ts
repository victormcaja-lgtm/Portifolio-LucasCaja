/**
 * Lista de slugs de projeto em memória, com TTL, para o proxy de 404 (src/proxy.ts).
 * Puro: não importa o banco; a carga vem de `load`.
 */

/**
 * Parâmetro reservado que `generateStaticParams` devolve quando não há projetos publicados
 * (com Cache Components, a lista não pode ser vazia). Nunca é um slug válido.
 */
export const RESERVED_EMPTY_SLUG = "__vazio__";

export interface SlugGuardOptions {
  load: () => Promise<readonly string[]>;
  ttlMs: number;
  now?: () => number;
}

export interface SlugGuard {
  /** true = slug conhecido; "unknown" = não foi possível carregar a lista. */
  check(slug: string): Promise<boolean | "unknown">;
}

export function createSlugGuard({ load, ttlMs, now = Date.now }: SlugGuardOptions): SlugGuard {
  let slugs: ReadonlySet<string> | null = null;
  let loadedAt = 0;
  /** Carga em andamento, compartilhada por chamadas concorrentes. */
  let pending: Promise<void> | null = null;
  /** Depois de uma falha, a próxima chamada tenta de novo, mesmo dentro do TTL. */
  let failed = false;

  function isFresh(): boolean {
    return slugs !== null && !failed && now() - loadedAt < ttlMs;
  }

  function refresh(): Promise<void> {
    pending ??= load()
      .then((list) => {
        slugs = new Set(list);
        loadedAt = now();
        failed = false;
      })
      .catch((error: unknown) => {
        failed = true;
        // Mensagem fixa: a mensagem e a stack do erro podem conter a URL do banco.
        const kind = error instanceof Error ? error.name : typeof error;
        console.error(`[slug-guard] Falha ao carregar os slugs publicados (${kind}).`);
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  }

  return {
    async check(slug) {
      if (!isFresh()) await refresh();
      if (slugs === null) return "unknown";
      if (slug === RESERVED_EMPTY_SLUG) return false;
      return slugs.has(slug);
    },
  };
}
