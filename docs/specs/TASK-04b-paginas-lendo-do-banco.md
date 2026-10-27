# TASK-04b: páginas públicas lendo do banco

**Tem tela:** sim. Há um estado vazio novo na home e o aviso de demonstração passa a ser condicional. Requer validação de UI/UX.
**Rotas:** `/`, `/trabalhos/[slug]`, 404
**Depende de:** TASK-04
**Fora de escopo:**
- painel e invalidação disparada por ações do admin (TASK-07). Aqui só ficam definidas as tags de cache;
- hero configurável. A imagem de abertura continua sendo `DEMO_HERO`, até o painel permitir escolhê-la;
- autenticação e Cloudinary;
- seed automático em produção.

## Objetivo

A home e as páginas de projeto passam a ler projetos e categorias do PostgreSQL via `src/server/repositories/projects.ts`, mantendo:
- HTML estático gerado no build, com Cache Components;
- 404 real renderizada no servidor para slugs inexistentes;
- **build sem banco**: sem `DATABASE_URL`, o site usa o conteúdo de demonstração, como hoje;
- deploy na Vercel com o Postgres do Neon (Marketplace) e migrações aplicadas apenas em produção.

Consulte `node_modules/next/dist/docs/` antes de implementar: `01-app/01-getting-started/08-caching.md`, a referência de `use cache`, `cacheTag`, `cacheLife`, `generate-static-params.md` (nota sobre Cache Components) e `ensureStatic`.

## Fonte de conteúdo

### `src/server/content-source.ts`
```ts
export type ContentSource = "database" | "demo";
export function getContentSource(env?: NodeJS.ProcessEnv): ContentSource;
```
Regras:
- `DATABASE_URL` definida e não vazia (após `trim`) → `"database"`;
- caso contrário → `"demo"`;
- **exceção:** `VERCEL_ENV === "production"` sem `DATABASE_URL` → lança `Error` com uma mensagem clara que cita a variável, sem valores. Produção nunca deve cair no demo silenciosamente.

### `src/server/cache-tags.ts`
```ts
export const PROJECTS_TAG = "projects";
export function projectTag(slug: string): string; // "project:<slug>"
```

### `src/server/content.ts`
Esta é a camada que as páginas e o proxy usam. As páginas **não** importam mais `@/content/demo` diretamente, com uma exceção: `DEMO_HERO`, via `getHeroImage`.
```ts
export async function getPublishedProjects(): Promise<Project[]>;          // ordenado por sortOrder
export async function getPublishedProject(slug: string): Promise<Project | null>;
export async function getPublishedSlugs(): Promise<string[]>;
export function getHeroImage(): ImageAsset;                                 // DEMO_HERO (até a TASK-07)
```
- Em modo `"database"`, as funções delegam ao repositório. Em modo `"demo"`, usam `DEMO_PROJECTS` com as funções puras de `src/lib/projects.ts`.
- `getPublishedProjects` e `getPublishedProject` usam a diretiva `"use cache"`, com:
  - `cacheTag(PROJECTS_TAG)`, e também `projectTag(slug)` no caso do projeto único;
  - `cacheLife` com um perfil de longa duração, por exemplo `"days"`, sempre via tag. A justificativa vai num comentário.
- Erros de conexão com o banco **não** são engolidos: propagam e falham o build ou a requisição. Não existe fallback silencioso para o demo quando o modo é `"database"`.

`getPublishedSlugs` pode ou não usar `"use cache"`; veja a seção do proxy. Se precisar de uma consulta mais leve que `listPublishedProjects`, adicione `listPublishedSlugs(db?)` ao repositório, com teste de integração.

## Páginas

### `/` (`src/app/page.tsx`)
- Dados vêm de `getPublishedProjects()`; a imagem de abertura vem de `getHeroImage()`. Os créditos são calculados a partir desses dados, não mais de uma constante de módulo.
- O `DemoNotice` aparece se algum projeto exibido tiver `isDemo = true`, se a fonte for `"demo"` **ou se a imagem de abertura for de demonstração**. Enquanto `getHeroImage()` devolver `DEMO_HERO` (até a TASK-07), o aviso aparece sempre, inclusive com o banco vazio. *(Ciclo de correção 1: a regra do CLAUDE.md exige marcar conteúdo provisório.)* Para isso, `ImageAsset` ganha `isDemo?: boolean` e `DEMO_HERO` passa a ter `isDemo: true`; a condição usa `hero.isDemo`.
- **Estado vazio:** sem projetos publicados, a seção `#trabalhos` mostra o texto "Nenhum trabalho publicado no momento.", sem filtro nem contador e seguindo o design system (tipografia sans, `text-ink-muted`, espaço generoso). Não pode haver erro nem layout quebrado.

### `/trabalhos/[slug]`
- `generateStaticParams` usa `getPublishedSlugs()`. Com Cache Components, a lista **não pode ser vazia** (a documentação define isso como erro de build). Com zero slugs, retorne um único parâmetro reservado, que não é um slug válido (por exemplo `__vazio__`), documentado em comentário. A página responde a ele com `notFound()`, e o proxy também o trata como inexistente.
- `resolveProject` usa `getPublishedProject(slug)`. A navegação anterior/próximo usa `getPublishedProjects()` com `getAdjacentProjects`.
- Mantenha `ensureStatic = "navigation"` e `instant = false`, desde que a documentação continue permitindo isso com dados em `"use cache"`. Se não permitir, ajuste e justifique em comentário.
- Projetos publicados depois do build devem renderizar sob demanda e ser cacheados. Verifique na documentação que isso funciona sem `dynamicParams`.

## Proxy de 404 (`src/proxy.ts`)

O proxy **não pode consultar o banco a cada requisição**. A lista de slugs fica em cache em memória, com TTL.

### `src/server/slug-guard.ts` (puro, testável)
```ts
export interface SlugGuardOptions {
  load: () => Promise<readonly string[]>;
  ttlMs: number;
  now?: () => number;                 // padrão Date.now
}
export function createSlugGuard(options: SlugGuardOptions): {
  /** true = slug conhecido; "unknown" = não foi possível carregar a lista. */
  check(slug: string): Promise<boolean | "unknown">;
};
```
Regras:
- A primeira chamada carrega a lista. Dentro do TTL, as chamadas seguintes não chamam `load`.
- Chamadas concorrentes durante um carregamento compartilham a mesma promessa (um único `load`).
- Expirado o TTL, a próxima chamada recarrega.
- Se `load` falhar:
  - com uma lista anterior em memória, ela continua sendo usada e a próxima chamada tenta de novo;
  - sem nenhuma lista, retorna `"unknown"`.
  - O erro é registrado com `console.error`, sem a URL do banco.
- O slug `__vazio__` reservado nunca é conhecido.

### `src/proxy.ts`
- Usa `createSlugGuard({ load: getPublishedSlugs, ttlMs: 60_000 })` no escopo do módulo.
- Slug conhecido → `NextResponse.next()`. Slug desconhecido → rewrite para `/404`, como hoje.
- `"unknown"` → `NextResponse.next()` (*fail open*: a página decide com `notFound()`). Documente a troca em comentário: um erro de banco não deve virar 404 em massa.
- Verifique na documentação do Next 16 que o proxy roda no runtime Node.js e pode importar o cliente Prisma. Se não puder, adapte e justifique.
- Limitação aceita, documentada em comentário: um projeto publicado pode responder 404 por até 60 s, até o TTL expirar. A TASK-07 pode reduzir isso.

## Banco em produção (Vercel + Neon)

- **`prisma.config.ts`:** `datasource.url` passa a usar `DATABASE_URL_UNPOOLED` quando existir, senão `DATABASE_URL`. As migrações precisam de conexão direta, sem o pooler. Explique em comentário. O cliente da aplicação (`src/server/db.ts`) continua usando `DATABASE_URL`, a conexão com pool.
- **`scripts/vercel-build.ts`**, executado por `"vercel-build": "tsx scripts/vercel-build.ts"` no `package.json`. A Vercel usa esse script no lugar de `build`.
  - Com `VERCEL_ENV === "production"`, roda `prisma migrate deploy` e depois `next build`.
  - Em qualquer outro ambiente (Preview, local), roda só `next build`. Assim, um preview nunca migra o banco de produção.
  - A decisão fica numa função pura exportada, testável: `planBuildSteps(env): string[][]`, que devolve a lista de comandos.
  - Os comandos rodam com `spawnSync` e `stdio: "inherit"`; uma falha encerra com o código de saída do comando.
- O script `build` continua sendo `next build`.

## Testes esperados (agente teste)

- **Unitários:**
  - `content-source`: as regras acima, incluindo string vazia e espaços, e o caso de produção sem a variável;
  - `cache-tags`;
  - `slug-guard`: TTL, concorrência, falha com e sem cache anterior, slug reservado;
  - `content`: modo demo e modo database com o repositório mockado, mais as chamadas de `cacheTag`/`cacheLife` com `next/cache` mockado;
  - `planBuildSteps`;
  - páginas: home com dados mockados, estado vazio, `DemoNotice` condicional, `generateStaticParams` com lista vazia e com o slug reservado;
  - proxy: conhecido, desconhecido, `"unknown"`.
- **Integração:** `listPublishedSlugs`, se criado, inclusive ignorando rascunhos e arquivados.
- **E2E:** a suíte existente continua verde com o banco local migrado e com seed (os dados são os mesmos do demo). Documente o pré-requisito (`npm run db:up && npm run db:deploy && npm run db:seed`).
- Os testes que hoje importam `@/content/demo` para checar páginas podem continuar usando os dados demo como fixture.

## Critérios de aceite

1. Com o banco local migrado e com seed, `npm run build` gera `/` e as 10 páginas de projeto a partir do banco. Prova: alterar o título de um projeto no banco (via Studio) e rebuildar muda o HTML.
2. Sem `DATABASE_URL` (por exemplo `DATABASE_URL= npm run build`), o build passa usando o demo.
3. Com `DATABASE_URL` apontando para um banco inacessível, o build **falha** com erro claro, sem cair no demo.
4. Com o banco vazio (migrado, sem seed), o build passa, a home mostra o estado vazio e qualquer `/trabalhos/x` responde 404.
5. O slug inexistente responde 404 com a página renderizada no servidor. O banco é consultado no máximo uma vez por instância a cada 60 s pelo proxy.
6. `vercel-build` só migra em produção.
7. Lint, typecheck, testes unitários (cobertura ≥ 80%), integração e E2E passam.
8. Nenhum segredo nem valor de variável aparece em logs, mensagens de erro ou commits.

## Pendências registradas (não bloqueantes)

Sugestões dos revisores para tasks futuras:
- **TASK-07:**
  - invalidar `PROJECTS_TAG` e `projectTag(slug)` ao publicar ou editar. Um `null` de slug inexistente também fica em cache sob `project:<slug>`;
  - permitir escolher o hero (com isso, o aviso de demonstração deixa de ser permanente);
  - um backoff curto no slug guard quando o banco está fora do ar.
- **DemoNotice:** uma variante de texto para quando só a foto de abertura for provisória.
- **Âncora `/#trabalhos`:** `md:scroll-mt-20`, para alinhar com o header de 80 px.
- **`tests/prisma-config.test.ts`:** um timeout maior, ou aquecer o import, para a CI com cache frio.
- **Agentes:** não rodar builds simultâneos na mesma pasta `.next`.
