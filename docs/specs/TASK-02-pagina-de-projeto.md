# TASK-02 — Página de projeto com conteúdo de demonstração

**Tem tela:** sim (requer validação UI/UX)
**Rotas:** `/trabalhos/[slug]` e página 404
**Depende de:** TASK-01
**Fora de escopo:** banco de dados, vídeo real (projetos de filme mostram só fotografias/stills), lightbox, Cloudinary.

## Objetivo

Cada projeto da grade abre uma página editorial própria: título, categorias, texto provisório claramente marcado, capa de grande impacto e uma sequência de fotografias em composição assimétrica, terminando com navegação para o projeto anterior e o próximo.

## Mudanças em contratos existentes

### `src/lib/types.ts` — `Project` ganha dois campos
```ts
export interface Project {
  // …campos da TASK-01…
  summary?: string;                 // texto curto do projeto
  gallery: readonly ImageAsset[];   // imagens além da capa (pode ser vazio)
}
```

### `src/content/demo.ts`
- Todo projeto demo tem `summary` começando com **"Texto de demonstração."** e exatamente **2** imagens em `gallery`, cada uma com `alt` não vazio, `credit` e `src` de `demoImageUrl` (host picsum.photos).
- Nenhuma imagem de galeria repete a capa do mesmo projeto.

Imagens de galeria (id | autor | URL Unsplash), distribuir 2 por projeto:
```
23 | Alejandro Escamilla | https://unsplash.com/photos/8yqds_91OLw      (garfos, still life)
35 | Shane Colella | https://unsplash.com/photos/znM0ujn2RUA            (cacto em close)
682 | Logan Troxell | https://unsplash.com/photos/DsQmBlbywJ8           (abstração de luz)
722 | Sebastian Kostrubala | https://unsplash.com/photos/4yDg-dDX9uM    (árvore na névoa)
735 | wyman H | https://unsplash.com/photos/ZQeRH1XD4Tc                 (cânion enevoado)
827 | kazuend | https://unsplash.com/photos/2KXEb_8G5vo                 (lago ao entardecer)
829 | Drew Hays | https://unsplash.com/photos/e6Fi_FBMfY0               (formações rochosas)
833 | Paul Green | https://unsplash.com/photos/OIbwHaG9NC8              (torre do relógio na névoa)
930 | Dominik Lange | https://unsplash.com/photos/ZUvF7qEIcVI           (montanhas vistas do alto)
936 | LoboStudio Hamburg | https://unsplash.com/photos/awnHOXjsdT4      (curva arquitetônica)
948 | Mihail Ribkin | https://unsplash.com/photos/VjmlDjePHjE           (fachada de torre)
1003 | E+N Photographies | https://unsplash.com/photos/GYumuBnTqKc      (filhote de cervo na floresta)
1038 | Marcelo Quinan | https://unsplash.com/photos/upywS5QFwr8         (mar e montanhas)
1042 | Jeremy Thomas | https://unsplash.com/photos/rMmibFe4czY          (rastros de estrelas)
1065 | Bertrand Zuchuat | https://unsplash.com/photos/Uax2bg5EizU       (beco com vista para o mar)
156 | Christopher Sardegna | https://unsplash.com/photos/iRyGmA_no2Q    (pegadas na areia)
512 | Jeff Sheldon | https://unsplash.com/photos/jTeQavJjBDs            (mar com névoa)
486 | Florian Klauer | https://unsplash.com/photos/mk7D-4UCfmg          (máquina de escrever)
75 | Jassy Onyae | https://unsplash.com/photos/1gBUXhf0PtA              (cachos de uva)
806 | Giovanni Corte | https://unsplash.com/photos/n9SLYuyyZhQ          (cordilheira)
```

### `src/components/site/SiteHeader.tsx`
```ts
export function SiteHeader(props: { variant?: "overlay" | "solid" }): JSX.Element;
// "overlay" (padrão): comportamento da TASK-01 (transparente sobre o hero)
// "solid": fundo paper e texto ink desde o início (páginas sem hero)
// expõe o variant em data-variant no <header>
```
Os links de navegação passam a ser `/#trabalhos` e `/#contato`, para funcionarem a partir de qualquer página. Na página inicial continuam levando às seções.

### `src/components/site/ProjectCard.tsx`
O card passa a conter **um** link para `/trabalhos/{slug}`, com nome acessível igual ao título do projeto. A área clicável cobre o card inteiro, e o foco visível fica no card.

## Novos contratos

### `src/lib/projects.ts` (acréscimos)
```ts
export function getProjectBySlug(projects: readonly Project[], slug: string): Project | undefined;
export function getAdjacentProjects(projects: readonly Project[], slug: string):
  { previous: Project | null; next: Project | null };
//   ordem por sortOrder; circular (anterior do primeiro = último; próximo do último = primeiro);
//   lista com 1 projeto → ambos null; slug inexistente → lança Error
```

### `src/lib/credits.ts`
```ts
export function collectImageCredits(images: readonly ImageAsset[]): ImageCredit[];   // já existe (TASK-01) — formalizado aqui
//   créditos na ordem da primeira aparição, sem duplicar o par autor+sourceUrl, ignorando imagens sem credit
```
A função já é usada pela página inicial; esta task adiciona testes unitários dedicados a ela.

### `src/lib/metadata.ts`
```ts
export function buildProjectMetadata(project: Project): { title: string; description: string };
//   title = `${project.title} — ${SITE.name}`
//   description = project.summary ?? SITE.description
```

### Componentes

| Arquivo | Export | Props |
|---|---|---|
| `site/ProjectView.tsx` | `ProjectView` | `{ project: Project; previous: Project \| null; next: Project \| null }` |
| `site/ProjectNav.tsx` | `ProjectNav` | `{ previous: Project \| null; next: Project \| null }` |
| `site/NotFoundView.tsx` | `NotFoundView` | — |

### Rotas
- `src/app/trabalhos/[slug]/page.tsx`: `generateStaticParams` com os slugs de `DEMO_PROJECTS`; `generateMetadata` usando `buildProjectMetadata`; slug inexistente → `notFound()`; renderiza `SiteHeader variant="solid"`, `<main id="conteudo">` com `ProjectView`, e `SiteFooter` com `collectImageCredits` das imagens do projeto (capa + galeria).
- `src/app/not-found.tsx`: renderiza `SiteHeader variant="solid"`, `NotFoundView` e `SiteFooter` sem créditos.

## Critérios de aceite

**CA-01 Cabeçalho do projeto.** `ProjectView` renderiza um `<article>` com:
- `h1` = título;
- nomes das categorias;
- selo "Demo" quando `isDemo`;
- o `summary`.

Conteúdo de demonstração também traz o texto visível "Conteúdo de demonstração" (`role="note"`, pode reutilizar `DemoNotice`).

**CA-02 Capa.** A capa é exibida em destaque, com `alt` = `cover.alt`, `sizes` definido e carregamento prioritário. Nenhuma outra imagem da página é prioritária.

**CA-03 Galeria.** Cada imagem de `gallery` é renderizada em uma lista (`<ul>`/`<li>` ou `<figure>`s), na ordem, com `alt` e `sizes`. A composição alterna largura e alinhamento (assimétrica) a partir de `md` e tem uma coluna no mobile. Galeria vazia não renderiza a lista.

**CA-04 Navegação entre projetos.** `ProjectNav` renderiza `<nav aria-label="Outros trabalhos">` com:
- link "Anterior" para `/trabalhos/{previous.slug}`, exibindo o título;
- link "Próximo" para `/trabalhos/{next.slug}`, exibindo o título;
- link "Todos os trabalhos" para `/#trabalhos`.

Se `previous` ou `next` for `null`, o link correspondente não é renderizado.

**CA-05 Rota.** `/trabalhos/{slug}` de cada projeto demo é gerada estaticamente no build (`generateStaticParams`). Slug inexistente responde com a página 404.

**CA-06 404.** `NotFoundView` renderiza um `h1` "Página não encontrada", uma frase curta e um link "Voltar ao início" para `/`.

**CA-07 Metadata.** `buildProjectMetadata` segue o contrato. A página de projeto a usa em `generateMetadata`.

**CA-08 Card com link.** Na página inicial, cada card tem exatamente um link para `/trabalhos/{slug}`, com nome acessível igual ao título. O teste da TASK-01 "cards não são links" é **substituído** por este critério.

**CA-09 Header.** `SiteHeader` aceita `variant`, expõe `data-variant`, e os links passam a `/#trabalhos` e `/#contato`. A TASK-01 continua passando, com os testes de href atualizados.

**CA-10 Créditos.** `collectImageCredits` segue o contrato. O rodapé da página de projeto lista só os créditos das imagens daquele projeto.

**CA-11 Design system, acessibilidade e responsividade.**
- Tokens de `docs/DESIGN-SYSTEM.md`.
- Um único `h1` por página.
- Foco visível.
- Sem rolagem horizontal em 320 px.
- Alvos de toque ≥ 44 px.
- Imagens com `alt`.

**CA-12 Qualidade.** Passam:
- `npm run lint`;
- `npm run typecheck`;
- `npm run test:coverage`, com ≥ 80%;
- `npm run build`, gerando as 10 rotas de projeto.

## Pendências herdadas da TASK-01 (entram nesta task)

**CA-13 Escopo do `inert`.** Com o menu mobile aberto, o `inert` vale somente para o conteúdo da página: o skip link, o `<main>` e o `<footer>`. Fica de fora qualquer outro elemento do `<body>`, especialmente `next-route-announcer`, `<script>` e portais. Agora existe navegação entre rotas, e o anunciador de rota não pode ser silenciado.

**CA-14 Foco ao virar `md`.** Quando o menu fecha porque a viewport passou para `md`, o foco vai para o wordmark e não se perde no `<body>`.

**CA-15 Asserções do hero.** O `<img>` do hero tem **ambos**, `fetchpriority="high"` e `loading="eager"`. Os testes passam a exigir os dois.

**Refinamentos visuais, sem teste unitário (avaliados pelo UI/UX):**
- O véu superior do hero passa a usar um gradiente com mais paradas, sem faixa chapada. O contraste do header deve continuar ≥ 4,5:1.
- O `sizes` do hero deve considerar o recorte `object-cover` em viewport retrato, por exemplo `(max-aspect-ratio: 3/2) 150svh, 100vw`.
- Na grade em `lg`, o par 03/04 deve ter cadência consistente com os demais pares, sem o vão de cerca de 580 px abaixo do 04.
