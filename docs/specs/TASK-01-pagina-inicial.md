# TASK-01 — Página inicial com conteúdo de demonstração

**Tem tela:** sim (requer validação UI/UX)
**Rota:** `/`
**Fora de escopo:** banco de dados, autenticação, Cloudinary, página de projeto (cards ainda **não** são links), páginas Sobre/Contato.

## Objetivo

Página inicial sofisticada, responsiva e coerente com fotografia autoral: começa com uma fotografia de grande impacto em tela cheia e evolui, na rolagem, para uma grade editorial assimétrica de projetos. Todo o conteúdo é de **demonstração**, claramente identificado. Nada de biografia, clientes, prêmios ou trabalhos inventados.

## Contratos de módulo

Os testes importam exatamente estes caminhos e nomes (alias `@/` = `src/`).

### `src/lib/types.ts`
```ts
export type CategorySlug = "fine-art" | "fashion-editorial" | "high-fashion" | "filme";
export type CategoryFilterValue = CategorySlug | "todos";
export interface Category { slug: CategorySlug; name: string }
export interface ImageCredit { author: string; sourceUrl: string }
export interface ImageAsset {
  src: string; width: number; height: number;
  alt: string;              // não vazio
  credit?: ImageCredit;     // obrigatório em conteúdo de demonstração
}
export interface Project {
  id: string; slug: string; title: string;
  categories: CategorySlug[];   // ao menos uma
  cover: ImageAsset;
  sortOrder: number;
  isDemo: boolean;
}
```

### `src/lib/site-config.ts`
```ts
export const SITE: {
  name: string;                 // "Lucas Caja"
  disciplines: readonly string[]; // ["Fine Art", "Fashion Editorial", "High Fashion", "Fotografia & Filme"]
  description: string;          // descrição neutra, sem fatos biográficos
};
```

### `src/lib/categories.ts`
```ts
export const CATEGORIES: readonly Category[];
// ordem exata: fine-art "Fine Art", fashion-editorial "Fashion Editorial",
//              high-fashion "High Fashion", filme "Filme"
export function getCategoryName(slug: CategorySlug): string;  // lança Error para slug desconhecido
```

### `src/lib/projects.ts`
```ts
export function sortProjects(projects: readonly Project[]): Project[];
//   nova lista ordenada por sortOrder crescente; não muta a entrada
export function filterProjectsByCategory(projects: readonly Project[], filter: CategoryFilterValue): Project[];
//   "todos" → todos (ordenados); slug → só os que contêm o slug (ordenados); não muta a entrada
export function formatProjectIndex(position: number): string;
//   1 → "01", 9 → "09", 10 → "10", 123 → "123"; lança RangeError se não for inteiro ≥ 1
```

### `src/lib/editorial-layout.ts`
```ts
export type SlotSpan = "wide" | "medium" | "narrow";
export type SlotAlign = "start" | "center" | "end";
export type SlotAspect = "portrait" | "landscape" | "square";
export interface EditorialSlot { span: SlotSpan; align: SlotAlign; aspect: SlotAspect; offset: boolean }
export const EDITORIAL_PATTERN_LENGTH: number;            // 6
export function getEditorialSlot(index: number): EditorialSlot;
//   índice base 0; padrão cíclico: getEditorialSlot(i) igual a getEditorialSlot(i + EDITORIAL_PATTERN_LENGTH)
//   slots consecutivos nunca têm o mesmo `align`
//   cada ciclo contém ao menos um "wide", um "narrow", um "portrait" e um "landscape"
//   lança RangeError para índice negativo ou não inteiro
export function getSlotClassName(slot: EditorialSlot): string;
//   classes Tailwind de posicionamento na grade de 12 colunas (string não vazia, sem classes repetidas)
```

### `src/lib/demo-images.ts`
```ts
export function demoImageUrl(id: number, width: number, height: number): string;
//   "https://picsum.photos/id/{id}/{width}/{height}?grayscale"
//   lança RangeError se algum argumento não for inteiro positivo (id pode ser 0)
```

### `src/content/demo.ts`
```ts
export const DEMO_HERO: ImageAsset;          // com alt e credit
export const DEMO_PROJECTS: readonly Project[];
//   exatamente 10 projetos; todos isDemo === true; ids e slugs únicos;
//   todas as 4 categorias representadas; títulos contêm "Demonstração";
//   toda capa com alt não vazio, credit preenchido e src gerado por demoImageUrl (host picsum.photos)
```

### Componentes (`src/components/...`)

| Arquivo | Export | Props |
|---|---|---|
| `site/SiteHeader.tsx` (client) | `SiteHeader` | — |
| `site/DemoNotice.tsx` | `DemoNotice` | — |
| `site/Hero.tsx` | `Hero` | `{ image: ImageAsset }` |
| `site/CategoryFilter.tsx` (client) | `CategoryFilter` | `{ categories: readonly Category[]; value: CategoryFilterValue; onChange(v: CategoryFilterValue): void }` |
| `site/ProjectCard.tsx` | `ProjectCard` | `{ project: Project; position: number; slot: EditorialSlot }` |
| `site/EditorialGrid.tsx` (client) | `EditorialGrid` | `{ projects: readonly Project[] }` |
| `site/SiteFooter.tsx` | `SiteFooter` | `{ credits: readonly ImageCredit[] }` |
| `ui/Reveal.tsx` (client) | `Reveal` | `{ children: ReactNode; className?: string; delayMs?: number }` |

## Critérios de aceite

**CA-01 Hero.** `Hero` renderiza um `<section>` com a imagem recebida (`alt` igual a `image.alt`) carregada com prioridade (`fetchpriority="high"` ou `loading="eager"`), o único `h1` da página contendo `SITE.name`, e as disciplinas de `SITE.disciplines`. Ocupa a altura da viewport (`100svh`).

**CA-02 Header e navegação.** `SiteHeader` renderiza um `<header>` com link do wordmark (`SITE.name`) para `/` e navegação (`<nav aria-label="Principal">`) com links **Trabalhos** → `#trabalhos` e **Contato** → `#contato`. Não há links para páginas inexistentes.

**CA-03 Menu mobile.** Botão com nome acessível "Abrir menu", `aria-expanded="false"` e `aria-controls` apontando para o painel. Ao clicar: `aria-expanded="true"`, painel visível com os mesmos links e nome do botão "Fechar menu". Fecha ao pressionar `Escape` e ao clicar em um link do painel.

**CA-04 Aviso de demonstração.** `DemoNotice` renderiza um elemento `role="note"` com o texto "Conteúdo de demonstração" e explicação de que imagens e textos são provisórios.

**CA-05 Filtro.** `CategoryFilter` renderiza um grupo (`role="group"`, `aria-label="Filtrar por categoria"`) com o botão **Todos** seguido de um botão por categoria, na ordem de `CATEGORIES`. O botão do valor atual tem `aria-pressed="true"`, os demais `"false"`. Clicar chama `onChange` com o valor correspondente.

**CA-06 Grade editorial.** `EditorialGrid` renderiza `<section id="trabalhos" aria-labelledby=…>` com título de seção "Trabalhos", o filtro e uma lista (`<ul>`) com um `<li>` por projeto, em ordem de `sortOrder`. Estado inicial: "Todos". Ao escolher uma categoria, exibe só os projetos dela, e um contador em região viva (`aria-live="polite"`) informa a quantidade ("10 projetos", "1 projeto"). Cada card recebe a posição (1, 2, …) **dentro da lista filtrada** e o slot `getEditorialSlot(posição - 1)`.

**CA-07 Card.** `ProjectCard` renderiza um `<article>` com o índice formatado (`formatProjectIndex(position)`), a imagem da capa (`alt` = `cover.alt`, atributo `sizes` definido), o título em `h3`, os nomes das categorias e, se `isDemo`, o selo com texto "Demo". As classes de `getSlotClassName(slot)` são aplicadas ao elemento raiz do card ou ao seu contêiner. Cards **não** são links nesta task.

**CA-08 Layout assimétrico.** Abaixo de `md` a grade tem uma coluna; a partir de `md`, 12 colunas com larguras/alinhamentos variados conforme `getEditorialSlot` (ver contratos).

**CA-09 Revelação na rolagem.** `Reveal` renderiza os filhos dentro de um wrapper com `data-revealed="false"` até o elemento entrar na viewport (IntersectionObserver), quando passa a `data-revealed="true"` e deixa de observar. Com `prefers-reduced-motion: reduce` **ou** sem suporte a IntersectionObserver, já inicia com `data-revealed="true"`. Desconecta o observer ao desmontar. O CSS só oculta o conteúdo quando JavaScript está ativo (sem JS, tudo visível).

**CA-10 Rodapé.** `SiteFooter` renderiza `<footer id="contato">` com título "Contato", a frase "Informações de contato em breve." (nenhum e-mail, telefone ou rede social inventados), e a lista de créditos das imagens de demonstração: nome do autor com link para `sourceUrl` (abre em nova aba com `rel="noopener noreferrer"`), mencionando Unsplash/Picsum. Exibe o ano corrente e `SITE.name`.

**CA-11 Página.** `/` compõe, nesta ordem: link "Pular para o conteúdo" (alvo `#conteudo`), `SiteHeader`, `<main id="conteudo">` com `Hero` (`DEMO_HERO`), `DemoNotice`, `EditorialGrid` (`DEMO_PROJECTS`), e `SiteFooter` (créditos do hero e das capas, sem duplicatas de autor+URL). `<html lang="pt-BR">`. Metadata: título com `SITE.name` e descrição `SITE.description`.

**CA-12 Imagens.** Todas via `next/image` com `sizes`. `next.config.ts` permite apenas `https://picsum.photos/id/**` (e o host de redirecionamento `fastly.picsum.photos`) em `images.remotePatterns`.

**CA-13 Design system e responsividade.** Tokens de `docs/DESIGN-SYSTEM.md` definidos em `globals.css` e usados pelos componentes; sem rolagem horizontal em 320 px; alvos de toque ≥ 44 px no mobile; foco visível.

**CA-14 Qualidade.** `npm run lint`, `npm run typecheck`, `npm run test:coverage` (≥ 80% em linhas, funções, ramos e instruções para `src/lib`, `src/components`, `src/content`) e `npm run build` passam.
