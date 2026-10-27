# Lucas Caja — Portfólio

Portfólio autoral de fotografia e filme (Fine Art, Fashion Editorial, High Fashion), com painel administrativo planejado.

> **Estado atual:** o site público lê projetos e categorias do **PostgreSQL** (Prisma). Sem `DATABASE_URL`, usa o **conteúdo de demonstração** de `src/content/demo.ts`. Hoje, mesmo no banco, os projetos são os de demonstração (carregados pelo seed): imagens do Unsplash via Picsum, com créditos no rodapé, e textos provisórios. Ainda **não** existem autenticação, painel nem integração com o Cloudinary. A sequência de etapas está em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Requisitos

- Node.js 22.12+ (testado com 24.22)
- npm 11
- Docker (a partir da etapa de banco de dados)

## Como rodar

```bash
npm install
cp .env.example .env           # valores locais de desenvolvimento
npm run db:up                  # Postgres no Docker (porta 5434)
npm run db:deploy              # aplica as migrações
npm run db:seed                # carrega o conteúdo de demonstração no banco
npm run dev                    # http://localhost:3000
```

### Fonte do conteúdo

| Situação | Fonte |
|---|---|
| `DATABASE_URL` definida | banco de dados. Se o banco estiver inacessível, o build **falha** (não cai no demo) |
| `DATABASE_URL` ausente ou vazia | conteúdo de demonstração (`src/content/demo.ts`), útil para build sem banco: `DATABASE_URL= npm run build` |
| produção na Vercel (`VERCEL_ENV=production`) sem `DATABASE_URL` | erro: produção nunca usa o demo |

As páginas são geradas no build (Cache Components, `"use cache"` com as tags `projects` e `project:<slug>`). Um projeto publicado depois do build é renderizado na primeira visita; o proxy de 404 guarda a lista de slugs em memória por 60 s.

Build de produção local:

```bash
npm run build
npm run start
```

## Testes e qualidade

| Comando | O que faz |
|---|---|
| `npm run test` | testes unitários e de componentes (Vitest + Testing Library) |
| `npm run test:coverage` | idem, com cobertura mínima de 80% |
| `npm run test:e2e` | testes E2E e de acessibilidade (Playwright + axe) em desktop e mobile; faz o build e sobe o servidor na porta 3100 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run test:integration` | testes de integração com o Postgres real (banco `portfolio_test`; requer `npm run db:up`) |

Na primeira execução do E2E, instale o navegador com `npx playwright install chromium`.

**Pré-requisito do E2E:** o build lê o banco definido em `DATABASE_URL` (no `.env`). Antes de `npm run test:e2e`, deixe o banco local migrado e com seed:

```bash
npm run db:up && npm run db:deploy && npm run db:seed
```

Para rodar o E2E sem banco, use o conteúdo de demonstração (os dados são os mesmos do seed):

```bash
# Git Bash
DATABASE_URL= npm run test:e2e
```

```powershell
# PowerShell
$env:DATABASE_URL=" "; npm run test:e2e; Remove-Item Env:DATABASE_URL
```

No PowerShell, o valor é um espaço, não `""`: atribuir `""` apaga a variável, e aí o Next.js lê a `DATABASE_URL` do `.env`. Um valor só com espaços conta como vazio. O mesmo vale para o build sem banco (`npm run build` no lugar de `npm run test:e2e`).

## Estrutura

```
src/app/            rotas (/, /trabalhos/[slug], 404)
src/components/     componentes do site (site/) e primitivas (ui/)
src/content/demo.ts conteúdo de DEMONSTRAÇÃO (fonte sem banco e base do seed)
src/lib/            tipos de domínio e funções puras
src/server/         banco (Prisma), repositórios e camada de conteúdo das páginas
src/proxy.ts        404 real para slugs inexistentes
prisma/             schema, migrações e seed de demonstração
scripts/            vercel-build.ts (migra só em produção)
docs/               arquitetura, design system, processo e specs
.claude/agents/     agentes Dev, Teste, Revisor e UI/UX
```

## Processo

Cada task segue o fluxo **Teste → Dev → Teste → Revisor → UI/UX**, com no máximo 3 ciclos de correção. Veja [`docs/PROCESSO.md`](docs/PROCESSO.md).

## Variáveis de ambiente

Nenhum segredo é versionado. O passo a passo para configurar a Vercel (projeto e Postgres/Neon), o segredo da autenticação e o Cloudinary está em [`docs/GUIA-CONFIGURACAO.md`](docs/GUIA-CONFIGURACAO.md).

Copie `.env.example` para `.env` e preencha somente quando a etapa correspondente for implementada. Na Vercel, configure as variáveis em *Project Settings → Environment Variables*.

### Deploy na Vercel

A Vercel executa `npm run vercel-build` (`scripts/vercel-build.ts`) no lugar de `build`:

- **Production** (`VERCEL_ENV=production`): `prisma migrate deploy` e depois `next build`;
- **Preview** e demais ambientes: só `next build`. Um preview nunca migra o banco de produção.

O Neon cria duas variáveis: `DATABASE_URL` (com pool, usada pela aplicação) e `DATABASE_URL_UNPOOLED` (conexão direta, usada pelas migrações; ver `prisma.config.ts`). O seed não roda automaticamente em produção; veja o [guia de configuração](docs/GUIA-CONFIGURACAO.md#13-carregar-o-conteúdo-de-demonstração-no-banco-de-produção).
