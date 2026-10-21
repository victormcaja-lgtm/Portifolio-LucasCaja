# Arquitetura e plano de implementação

Documento vivo. Descreve o que **está planejado** e marca explicitamente o que **já foi implementado**.

## 1. Ambiente verificado (2026-10-20)

| Ferramenta | Versão | Observação |
|---|---|---|
| Node.js | 24.22.0 | LTS ativo; compatível com Next 16, Vitest 5 e Prisma 7 |
| npm | 11.19.1 | gerenciador de pacotes do projeto |
| Git | 2.55.0 | remoto `origin` = `github.com/victormcaja-lgtm/Portifolio-LucasCaja` (público) |
| Docker | 29.6.1 | será usado para o PostgreSQL local (porta **5434**, a 5433 já está ocupada por outro projeto) |
| psql | — | não instalado; não é necessário (Prisma + Docker) |

## 2. Stack e compatibilidade

| Camada | Escolha | Versão | Motivo / compatibilidade |
|---|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.4.2 | estável; `cacheComponents` ativo |
| UI | React | 19.3 | exigido pelo Next 16 |
| Linguagem | TypeScript | 5.9.3 | o TS 7 (compilador nativo) ainda não é o alvo do plugin do Next; mantida a linha 5.x |
| Estilo | Tailwind CSS | 4.x | tokens via `@theme` em `globals.css` |
| Testes unitários | Vitest + Testing Library + jsdom | 5.0.5 | guia oficial do Next; Vitest 5 exige Node 22.12+/24 |
| Testes E2E | Playwright | 1.64 | planejado (etapa 3); peer opcional do Next 16 |
| ORM | Prisma ORM + `@prisma/adapter-pg` | **7.10.1** | a tag `latest` do npm aponta para `8.0.0-rc` (release candidate) — fixamos a 7.10.1 estável |
| Banco | PostgreSQL | 16 | Docker local; em produção, Postgres gerenciado (Neon, Supabase ou Vercel Postgres/Neon) |
| Autenticação | Better Auth | 1.7.x | estável; suporta Next 16 e Prisma 7 (peer `^7`); sessões em banco, cookies httpOnly, plugin `admin` para papéis. O `next-auth` estável (v4) não é otimizado para o App Router e a v5 nunca saiu de beta |
| Mídia | Cloudinary (`cloudinary` 2.x no servidor, `next-cloudinary` 6.x no cliente) | — | upload **assinado direto do navegador para o Cloudinary** (evita o limite de ~4,5 MB do corpo de requisição em funções da Vercel); entrega com `f_auto,q_auto`, recortes responsivos e streaming adaptativo de vídeo |
| Validação | Zod | 4.x | entradas do painel e variáveis de ambiente |
| Hospedagem | Vercel | — | build `next build`; variáveis por ambiente |

## 3. Visão geral

```
                ┌─────────────────────────── Vercel ───────────────────────────┐
 Visitante ───► │  Next.js App Router                                          │
                │   (site)  páginas públicas — Server Components, cacheadas    │
                │   (admin) painel — protegido por sessão + papel              │
                │   api/auth/[...all]     → Better Auth                        │
                │   api/media/sign        → assina upload (só usuários aptos)  │
                │   Server Actions        → CRUD de projetos/categorias        │
                └──────────┬───────────────────────────┬───────────────────────┘
                           │ Prisma (adapter-pg)       │ SDK (assinatura, admin)
                     ┌─────▼──────┐             ┌──────▼───────┐
                     │ PostgreSQL │             │  Cloudinary  │◄── upload direto do
                     └────────────┘             └──────────────┘    navegador (assinado)
```

Princípios:
- **Fotografia em primeiro lugar:** páginas públicas renderizadas no servidor, imagens com `sizes` corretos, pré-carregamento só do hero.
- **Camada de dados isolada:** os componentes consomem tipos de domínio (`src/lib/types.ts`). Hoje os dados vêm de `src/content/demo.ts`; na etapa de banco, uma função de repositório passa a ler do Prisma sem mudar os componentes.
- **Segredos só no servidor:** nada além de `NEXT_PUBLIC_*` chega ao navegador.

## 4. Estrutura de diretórios

Legenda: ✅ existe hoje · ⏳ planejado

```
.claude/agents/          ✅ dev, teste, revisor, ui-ux
docs/                    ✅ arquitetura, spec, design system, processo
prisma/                  ✅ schema.prisma, migrations/, seed.ts
prisma.config.ts         ✅ configuração do Prisma 7
docker-compose.yml       ✅ Postgres local (porta 5434)
public/                  ✅ arquivos estáticos
src/
  app/
    layout.tsx           ✅ fontes, metadata, idioma pt-BR
    page.tsx             ✅ página inicial (etapa 1)
    globals.css          ✅ tokens do design system
    trabalhos/[slug]/    ✅ página de projeto · not-found.tsx ✅ 404
    sobre/  contato/     ⏳ quando houver conteúdo real fornecido pelo fotógrafo
    admin/               ⏳ painel (login, projetos, categorias, mídia, usuários)
    api/auth/[...all]/   ⏳ Better Auth
    api/media/sign/      ⏳ assinatura de upload Cloudinary
  components/
    site/                ✅ header, hero, grade editorial, card, filtro, rodapé, aviso demo
    ui/                  ✅ primitivas (Reveal)
    admin/               ⏳
  content/               ✅ demo.ts — conteúdo de DEMONSTRAÇÃO (removido quando houver banco)
  lib/                   ✅ funções puras e tipos de domínio
  server/                ✅ env.ts, db.ts, mappers.ts, repositories/ · ⏳ auth.ts, cloudinary.ts
  test/                  ✅ setup do Vitest
tests/e2e/               ✅ Playwright · tests/integration/ ✅ Postgres real
```

## 5. Modelo de dados (planejado — Prisma)

```prisma
enum Role          { OWNER  ADMIN  EDITOR }          // OWNER: fotógrafo; ADMIN: gestão total; EDITOR: conteúdo
enum ProjectStatus { DRAFT  PUBLISHED  ARCHIVED }
enum MediaType     { IMAGE  VIDEO }

model User {            // tabelas user/session/account/verification seguem o schema gerado pelo Better Auth
  id            String   @id
  name          String
  email         String   @unique
  emailVerified Boolean  @default(false)
  image         String?
  role          Role     @default(EDITOR)
  banned        Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  sessions      Session[]
  accounts      Account[]
  projects      Project[] @relation("ProjectAuthor")
  media         Media[]   @relation("MediaUploader")
}

model Category {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  sortOrder   Int      @default(0)
  projects    ProjectCategory[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Project {
  id          String        @id @default(cuid())
  title       String
  slug        String        @unique
  summary     String?
  body        String?       // texto do projeto (markdown simples)
  credits     String?       // ficha técnica informada pelo fotógrafo
  status      ProjectStatus @default(DRAFT)
  featured    Boolean       @default(false)
  sortOrder   Int           @default(0)
  publishedAt DateTime?
  coverId     String?       @unique
  cover       Media?        @relation("ProjectCover", fields: [coverId], references: [id], onDelete: SetNull)
  media       Media[]       @relation("ProjectMedia")
  categories  ProjectCategory[]
  authorId    String?
  author      User?         @relation("ProjectAuthor", fields: [authorId], references: [id], onDelete: SetNull)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  @@index([status, sortOrder])
}

model ProjectCategory {
  projectId  String
  categoryId String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@id([projectId, categoryId])
}

model Media {
  id           String    @id @default(cuid())
  type         MediaType
  publicId     String    @unique      // public_id do Cloudinary
  version      Int?
  format       String?
  width        Int
  height       Int
  durationSec  Float?                 // vídeos
  bytes        Int?
  alt          String                 // obrigatório para imagens (acessibilidade)
  caption      String?
  sortOrder    Int       @default(0)
  projectId    String?
  project      Project?  @relation("ProjectMedia", fields: [projectId], references: [id], onDelete: Cascade)
  coverOf      Project?  @relation("ProjectCover")
  uploadedById String?
  uploadedBy   User?     @relation("MediaUploader", fields: [uploadedById], references: [id], onDelete: SetNull)
  createdAt    DateTime  @default(now())
  @@index([projectId, sortOrder])
}
```

Permissões planejadas:

| Ação | OWNER | ADMIN | EDITOR |
|---|:-:|:-:|:-:|
| Criar/editar projetos e mídia | ✔ | ✔ | ✔ |
| Publicar/arquivar projeto | ✔ | ✔ | — |
| Gerir categorias | ✔ | ✔ | — |
| Gerir usuários e papéis | ✔ | ✔ (exceto OWNER) | — |

O cadastro público fica **desativado**; usuários são convidados por OWNER/ADMIN. O primeiro OWNER é criado por script de seed a partir de variáveis de ambiente.

## 6. Integrações e variáveis de ambiente

Nenhum segredo é versionado. Os valores ficam em `.env.local` (desenvolvimento) e no painel da Vercel (produção). Veja `.env.example`.

| Variável | Onde | Etapa | Uso |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | público | 1 | URL canônica (metadata, sitemap) |
| `DATABASE_URL` | servidor | 4 | conexão PostgreSQL (pooling em produção) |
| `BETTER_AUTH_SECRET` | servidor | 5 | chave de assinatura de sessões (gerar com `npx @better-auth/cli secret` ou `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | servidor | 5 | URL base da aplicação |
| `SEED_OWNER_EMAIL` / `SEED_OWNER_NAME` | servidor (só no seed) | 5 | primeiro usuário OWNER; a senha é definida no primeiro acesso |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | público | 6 | nome da conta Cloudinary (não é segredo) |
| `CLOUDINARY_API_KEY` | servidor | 6 | assinatura de uploads |
| `CLOUDINARY_API_SECRET` | servidor | 6 | assinatura de uploads — **nunca** expor |
| `CLOUDINARY_UPLOAD_FOLDER` | servidor | 6 | pasta raiz das mídias (ex.: `portfolio`) |

## 7. Sequência de implementação

Cada etapa é pequena, testável e passa pelo fluxo Teste → Dev → Teste → Revisor → UI/UX (ver `docs/PROCESSO.md`).

| # | Etapa | Entrega testável | Status |
|---|---|---|---|
| 1 | **Página inicial com conteúdo de demonstração** | hero, grade editorial assimétrica, filtro, header, rodapé, responsivo; testes unitários | ✅ concluída |
| 2 | Página de projeto (`/trabalhos/[slug]`) com dados demo | galeria vertical editorial, navegação anterior/próximo, 404 | ✅ concluída |
| 3 | Testes E2E (Playwright) e auditoria de acessibilidade/performance | smoke desktop + mobile, axe | ✅ concluída |
| 4 | Banco de dados: Docker Postgres + Prisma schema + migração + seed demo; repositório troca `content/demo.ts` por Prisma | `npm run db:migrate`, testes de repositório | ✅ concluída (as páginas ainda leem o conteúdo demo; a troca é a etapa 4b) |
| 4b | Páginas públicas lendo do banco (estratégia de cache e do proxy de 404) | páginas servidas pelo Postgres, build sem banco continua possível | ⏳ |
| 5 | Autenticação: Better Auth, login, proteção do `/admin`, papéis | login/logout, acesso negado por papel | ⏳ |
| 6 | Cloudinary: assinatura de upload, upload de foto/vídeo, metadados salvos em `Media` | upload real com credenciais do usuário | ⏳ |
| 7 | Painel: CRUD de projetos, categorias, ordenação, publicação | fluxos completos no painel | ⏳ |
| 8 | Gestão de colaboradores e papéis | convite, troca de papel | ⏳ |
| 9 | SEO, sitemap, Open Graph, deploy na Vercel | build de produção publicado | ⏳ |
