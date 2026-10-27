// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { createSlugGuard } from "./slug-guard";

const TTL = 60_000;
const DB_URL = "postgresql://portfolio:SENHA-SECRETA@db.exemplo.test:5432/portfolio";

/** Relógio controlável. */
function clock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

let errorSpy: MockInstance<typeof console.error>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("TASK-04b: createSlugGuard — carga e TTL (CA-05)", () => {
  it("a primeira chamada carrega a lista e reconhece slugs conhecidos e desconhecidos", async () => {
    const load = vi.fn(async () => ["estudo-i", "estudo-ii"]);
    const guard = createSlugGuard({ load, ttlMs: TTL, now: clock().now });

    expect(await guard.check("estudo-i")).toBe(true);
    expect(await guard.check("nao-existe")).toBe(false);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("não chama load antes da primeira verificação", () => {
    const load = vi.fn(async () => ["a"]);
    createSlugGuard({ load, ttlMs: TTL, now: clock().now });
    expect(load).not.toHaveBeenCalled();
  });

  it("CA-05: dentro do TTL, as chamadas seguintes não chamam load", async () => {
    const c = clock();
    const load = vi.fn(async () => ["a"]);
    const guard = createSlugGuard({ load, ttlMs: TTL, now: c.now });

    await guard.check("a");
    c.advance(TTL - 1);
    expect(await guard.check("a")).toBe(true);
    expect(await guard.check("b")).toBe(false);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("CA-05: expirado o TTL, a próxima chamada recarrega e passa a usar a lista nova", async () => {
    const c = clock();
    const load = vi
      .fn<() => Promise<readonly string[]>>()
      .mockResolvedValueOnce(["a"])
      .mockResolvedValueOnce(["a", "novo"]);
    const guard = createSlugGuard({ load, ttlMs: TTL, now: c.now });

    expect(await guard.check("novo")).toBe(false);
    c.advance(TTL + 1);
    expect(await guard.check("novo")).toBe(true);
    expect(load).toHaveBeenCalledTimes(2);

    // Recarregada, a lista vale por mais um TTL.
    c.advance(TTL - 1);
    expect(await guard.check("a")).toBe(true);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("um slug removido deixa de ser conhecido após a recarga", async () => {
    const c = clock();
    const load = vi
      .fn<() => Promise<readonly string[]>>()
      .mockResolvedValueOnce(["a", "b"])
      .mockResolvedValueOnce(["a"]);
    const guard = createSlugGuard({ load, ttlMs: TTL, now: c.now });

    expect(await guard.check("b")).toBe(true);
    c.advance(TTL + 1);
    expect(await guard.check("b")).toBe(false);
  });

  it("usa Date.now quando `now` não é informado", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const load = vi.fn(async () => ["a"]);
      const guard = createSlugGuard({ load, ttlMs: TTL });
      await guard.check("a");
      vi.setSystemTime(new Date(Date.now() + TTL - 1));
      await guard.check("a");
      expect(load).toHaveBeenCalledTimes(1);
      vi.setSystemTime(new Date(Date.now() + 2));
      await guard.check("a");
      expect(load).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("TASK-04b: createSlugGuard — concorrência (CA-05)", () => {
  it("CA-05: chamadas concorrentes durante um carregamento compartilham um único load", async () => {
    const pending = deferred<readonly string[]>();
    const load = vi.fn(() => pending.promise);
    const guard = createSlugGuard({ load, ttlMs: TTL, now: clock().now });

    const results = Promise.all([guard.check("a"), guard.check("b"), guard.check("c")]);
    pending.resolve(["a", "c"]);

    expect(await results).toEqual([true, false, true]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("CA-05: recargas concorrentes após o TTL também compartilham um único load", async () => {
    const c = clock();
    const second = deferred<readonly string[]>();
    const load = vi
      .fn<() => Promise<readonly string[]>>()
      .mockResolvedValueOnce(["a"])
      .mockReturnValueOnce(second.promise);
    const guard = createSlugGuard({ load, ttlMs: TTL, now: c.now });

    await guard.check("a");
    c.advance(TTL + 1);
    const results = Promise.all([guard.check("a"), guard.check("b"), guard.check("c")]);
    second.resolve(["a", "b"]);
    await results;

    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("TASK-04b: createSlugGuard — falhas de load", () => {
  it('sem lista anterior, uma falha retorna "unknown"', async () => {
    const load = vi.fn(async (): Promise<readonly string[]> => {
      throw new Error("conexão recusada");
    });
    const guard = createSlugGuard({ load, ttlMs: TTL, now: clock().now });

    expect(await guard.check("a")).toBe("unknown");
  });

  it("sem lista anterior, a chamada seguinte tenta carregar de novo", async () => {
    const load = vi
      .fn<() => Promise<readonly string[]>>()
      .mockRejectedValueOnce(new Error("conexão recusada"))
      .mockResolvedValueOnce(["a"]);
    const guard = createSlugGuard({ load, ttlMs: TTL, now: clock().now });

    expect(await guard.check("a")).toBe("unknown");
    expect(await guard.check("a")).toBe(true);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("com lista anterior, uma falha mantém a lista em uso", async () => {
    const c = clock();
    const load = vi
      .fn<() => Promise<readonly string[]>>()
      .mockResolvedValueOnce(["a"])
      .mockRejectedValue(new Error("conexão recusada"));
    const guard = createSlugGuard({ load, ttlMs: TTL, now: c.now });

    await guard.check("a");
    c.advance(TTL + 1);
    expect(await guard.check("a")).toBe(true);
    expect(await guard.check("b")).toBe(false);
  });

  it("com lista anterior, depois de uma falha a próxima chamada tenta de novo", async () => {
    const c = clock();
    const load = vi
      .fn<() => Promise<readonly string[]>>()
      .mockResolvedValueOnce(["a"])
      .mockRejectedValueOnce(new Error("conexão recusada"))
      .mockResolvedValueOnce(["a", "b"]);
    const guard = createSlugGuard({ load, ttlMs: TTL, now: c.now });

    await guard.check("a");
    c.advance(TTL + 1);
    expect(await guard.check("b")).toBe(false); // falhou: usa a lista antiga
    expect(await guard.check("b")).toBe(true); // tentou de novo e carregou
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("CA-08: a falha é registrada com console.error, sem a URL do banco", async () => {
    const load = vi.fn(async (): Promise<readonly string[]> => {
      throw new Error(`Can not reach database server at ${DB_URL}`);
    });
    const guard = createSlugGuard({ load, ttlMs: TTL, now: clock().now });

    await guard.check("a");

    expect(errorSpy).toHaveBeenCalled();
    const logged = errorSpy.mock.calls
      .flat()
      .map((arg: unknown) =>
        arg instanceof Error ? `${arg.message}\n${arg.stack ?? ""}` : String(arg),
      )
      .join("\n");
    expect(logged).not.toContain(DB_URL);
    expect(logged).not.toContain("SENHA-SECRETA");
  });

  it("um load bem-sucedido não registra erro", async () => {
    const guard = createSlugGuard({ load: async () => ["a"], ttlMs: TTL, now: clock().now });
    await guard.check("a");
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("TASK-04b: createSlugGuard — slug reservado", () => {
  it("__vazio__ nunca é conhecido, mesmo que esteja na lista", async () => {
    const guard = createSlugGuard({
      load: async () => ["__vazio__", "a"],
      ttlMs: TTL,
      now: clock().now,
    });
    expect(await guard.check("__vazio__")).toBe(false);
    expect(await guard.check("a")).toBe(true);
  });

  it("CA-04: com a lista vazia, nenhum slug é conhecido (inclusive __vazio__)", async () => {
    const guard = createSlugGuard({ load: async () => [], ttlMs: TTL, now: clock().now });
    expect(await guard.check("__vazio__")).toBe(false);
    expect(await guard.check("qualquer")).toBe(false);
  });
});
