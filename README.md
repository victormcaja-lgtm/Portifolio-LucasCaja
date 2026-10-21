# Lucas Caja — Portfólio

Portfólio autoral de fotografia e filme (Fine Art, Fashion Editorial, High Fashion), com painel administrativo planejado.

> **Estado atual:** o site público usa **conteúdo de demonstração**: imagens do Unsplash via Picsum, com créditos no rodapé, e textos provisórios. Ainda **não** existem banco de dados, autenticação, painel nem integração com o Cloudinary. A sequência de etapas está em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Requisitos

- Node.js 22.12+ (testado com 24.22)
- npm 11
- Docker (a partir da etapa de banco de dados)

## Como rodar

```bash
npm install
cp .env.example .env.local     # opcional nesta fase
npm run dev                    # http://localhost:3000
```

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

Na primeira execução do E2E, instale o navegador com `npx playwright install chromium`.

## Estrutura

```
src/app/            rotas (/, /trabalhos/[slug], 404)
src/components/     componentes do site (site/) e primitivas (ui/)
src/content/demo.ts conteúdo de DEMONSTRAÇÃO
src/lib/            tipos de domínio e funções puras
src/proxy.ts        404 real para slugs inexistentes
docs/               arquitetura, design system, processo e specs
.claude/agents/     agentes Dev, Teste, Revisor e UI/UX
```

## Processo

Cada task segue o fluxo **Teste → Dev → Teste → Revisor → UI/UX**, com no máximo 3 ciclos de correção. Veja [`docs/PROCESSO.md`](docs/PROCESSO.md).

## Variáveis de ambiente

Nenhum segredo é versionado. Copie `.env.example` para `.env.local` e preencha somente quando a etapa correspondente for implementada. Na Vercel, configure as variáveis em *Project Settings → Environment Variables*.
