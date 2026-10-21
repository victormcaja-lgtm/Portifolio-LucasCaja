# TASK-04 — Banco de dados: PostgreSQL local, Prisma 7, schema, seed e repositório

**Tem tela:** não
**Depende de:** TASK-01, TASK-02
**Fora de escopo:**
- trocar as páginas públicas para lerem do banco (isso fica para a TASK-04b);
- tabelas de sessão e conta do Better Auth (TASK-05);
- Cloudinary (TASK-06).

## Objetivo

Criar a base de dados real do portfólio:
- Postgres em Docker para desenvolvimento;
- schema Prisma com projetos, categorias, mídia e usuários com papéis;
- migração inicial;
- seed que importa o conteúdo de demonstração **sem perder a marcação de demo**;
- repositório de leitura testado contra um banco real.

## Infraestrutura

O orquestrador instala as dependências: `prisma@7.10.1` (dev), `@prisma/client@7.10.1`, `@prisma/adapter-pg@7.10.1`, `pg`, `@types/pg` (dev), `tsx` (dev) e `zod@4`.

O Dev cria:
- **`docker-compose.yml`**:
  - serviço `db` com `postgres:16-alpine`, porta host **5434** → 5432;
  - volume nomeado e `healthcheck` com `pg_isready`;
  - as credenciais vêm de `.env` (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`), com padrões **apenas de desenvolvimento** documentados no `.env.example`;
  - um script de init cria também o banco `portfolio_test`.
- **`prisma.config.ts`** e **`prisma/schema.prisma`**, seguindo as convenções do Prisma 7. Consulte a saída de `npx prisma@7.10.1 init --help` e a documentação do pacote instalado. Requisitos:
  - gerador `prisma-client` com `output` em `src/generated/prisma`, pasta que entra no `.gitignore`;
  - conexão via `DATABASE_URL`.
- **Scripts no `package.json`:** `db:up` (`docker compose up -d db`), `db:down`, `db:migrate` (`prisma migrate dev`), `db:deploy` (`prisma migrate deploy`), `db:seed`, `db:studio`, `db:generate`, `test:integration`. Além disso, `postinstall` roda `prisma generate`, necessário no build da Vercel.

## Modelo de dados

O schema segue `docs/ARQUITETURA.md §5`, com estes ajustes:

```prisma
enum Role          { OWNER ADMIN EDITOR }
enum ProjectStatus { DRAFT PUBLISHED ARCHIVED }
enum MediaType     { IMAGE VIDEO }
enum MediaProvider { CLOUDINARY EXTERNAL }      // EXTERNAL = imagens de demonstração (Picsum)

model User      { id, name, email @unique, emailVerified, image?, role Role @default(EDITOR), banned, createdAt, updatedAt }
model Category  { id, name, slug @unique, description?, sortOrder, createdAt, updatedAt, projects ProjectCategory[] }
model Project   { id, title, slug @unique, summary?, body?, credits?, status @default(DRAFT), featured,
                  isDemo Boolean @default(false),
                  sortOrder, publishedAt?, coverId? @unique → Media (SetNull), media Media[], categories ProjectCategory[],
                  authorId? → User (SetNull), createdAt, updatedAt; @@index([status, sortOrder]) }
model ProjectCategory { projectId, categoryId, @@id([projectId, categoryId]), cascata nos dois lados }
model Media     { id, type, provider MediaProvider, publicId String? @unique, url String?,
                  width, height, durationSec?, bytes?, format?, alt, caption?,
                  creditAuthor String?, creditUrl String?,
                  sortOrder, projectId? → Project (Cascade), uploadedById? → User (SetNull), createdAt;
                  @@index([projectId, sortOrder]) }
```

Regra de mídia:
- `provider = CLOUDINARY` exige `publicId`;
- `provider = EXTERNAL` exige `url`.

A validação fica em `src/server/media-rules.ts` (`assertValidMedia`), porque o Prisma não expressa `CHECK`. Se o Prisma 7 permitir SQL bruto na migração, adicione também uma `CHECK` constraint na migração.

## Contratos de módulo

### `src/server/env.ts`
```ts
export function getServerEnv(): { DATABASE_URL: string };
//   valida com zod; lança Error com mensagem clara listando a variável ausente/inválida (sem imprimir valores)
```

### `src/server/db.ts`
```ts
export function getDb(): PrismaClient;
//   singleton (reaproveitado entre hot reloads em dev via globalThis), usando @prisma/adapter-pg
```
O arquivo começa com `import "server-only"`. Instale `server-only` se ainda não estiver presente.

### `src/server/media-rules.ts`
```ts
export function assertValidMedia(m: { provider: "CLOUDINARY" | "EXTERNAL"; publicId?: string | null; url?: string | null; type: "IMAGE" | "VIDEO"; alt: string }): void;
//   lança Error se CLOUDINARY sem publicId, EXTERNAL sem url, url não-https, ou IMAGE com alt vazio
```

### `src/server/mappers.ts`
Funções puras, testadas sem banco:
```ts
export function toImageAsset(media: MediaRow): ImageAsset;     // EXTERNAL → src = url; CLOUDINARY → lança Error("Cloudinary ainda não configurado") nesta task
export function toDomainProject(row: ProjectRowWithRelations): Project;
//   categorias por sortOrder da categoria; gallery = mídias IMAGE do projeto exceto a capa, por sortOrder;
//   isDemo copiado; summary null → undefined
```
`MediaRow` e `ProjectRowWithRelations` são os tipos gerados pelo Prisma com o `include` usado no repositório.

### `src/server/repositories/projects.ts`
```ts
export async function listPublishedProjects(db?: PrismaClient): Promise<Project[]>;          // só PUBLISHED, por sortOrder
export async function getPublishedProjectBySlug(slug: string, db?: PrismaClient): Promise<Project | null>;
export async function listCategories(db?: PrismaClient): Promise<Category[]>;                // por sortOrder
```

### `prisma/seed.ts`
- É idempotente (`upsert` por slug); rodar duas vezes não duplica nada.
- Cria as 4 categorias de `CATEGORIES`, na mesma ordem.
- Importa os 10 projetos de `DEMO_PROJECTS` com `isDemo = true` e `status = PUBLISHED`, mais capas e galerias como `Media` `EXTERNAL`, com crédito e alt.
- **Não** cria usuários.

## Critérios de aceite

**CA-01 Docker.** `npm run db:up` sobe o Postgres na porta 5434 e o healthcheck fica `healthy`. Os bancos `portfolio` e `portfolio_test` existem. O contêiner `grana-postgres` (porta 5433), de outro projeto, não é afetado.

**CA-02 Migração.** `npm run db:migrate` cria a migração inicial em `prisma/migrations/`, que é versionada. `npx prisma migrate status` reporta o banco em dia.

**CA-03 Env.** `getServerEnv` valida `DATABASE_URL`. Se ela faltar, a mensagem de erro cita o nome da variável e não vaza nenhum valor. `.env.example` é atualizado e nenhum `.env*` real entra no Git.

**CA-04 Regras de mídia.** `assertValidMedia` segue o contrato. Testes unitários cobrem cada ramo.

**CA-05 Mapeadores.** `toImageAsset` e `toDomainProject` seguem o contrato. Testes unitários usam objetos literais, sem banco.

**CA-06 Seed.** `npm run db:seed` popula 4 categorias, 10 projetos com `isDemo = true` e 30 mídias (10 capas e 20 imagens de galeria). Rodar de novo mantém as mesmas contagens.

**CA-07 Repositório (integração).** Os testes em `tests/integration/` rodam com `npm run test:integration` contra o banco `portfolio_test`. Essa configuração do Vitest é separada da principal, com ambiente `node`. Os testes:
- aplicam as migrações (`prisma migrate deploy` com `DATABASE_URL` do banco de teste) e limpam as tabelas antes de cada arquivo;
- verificam que `listPublishedProjects` ignora `DRAFT` e `ARCHIVED` e respeita `sortOrder`;
- verificam que `getPublishedProjectBySlug` retorna `null` para slug inexistente ou não publicado;
- verificam que o resultado de `listPublishedProjects` depois do seed é **igual** a `sortProjects(DEMO_PROJECTS)` (a ida e volta preserva o domínio);
- verificam a cascata: apagar um projeto apaga suas mídias e vínculos de categoria.

O `npm run test` principal **não** depende do Docker.

**CA-08 Sem regressão.** As páginas públicas continuam funcionando com `src/content/demo.ts`, sem exigir banco. `npm run build` passa **sem** `DATABASE_URL` definida. O `postinstall`/`prisma generate` também não exige a variável.

**CA-09 Qualidade.** Passam `npm run lint`, `npm run typecheck`, `npm run test:coverage` (≥ 80%; a cobertura inclui `src/server/**` exceto `db.ts` e `src/generated/**`), `npm run test:integration` e `npm run build`.
