# Design system

Referência para o agente **UI/UX** e para o **Dev**. Os tokens vivem em `src/app/globals.css` (`@theme`) e devem ser usados via utilitários Tailwind — **não** usar cores, fontes ou durações literais nos componentes.

## Conceito

Fotografia autoral, editorial e silenciosa. A interface recua para a imagem aparecer: papel off-white, tinta quase preta, tipografia serifada de alto contraste para títulos e uma sans discreta para rótulos. Composições assimétricas, muito espaço negativo, navegação que não compete com a fotografia.

Tema único claro (off-white). O site **não** acompanha o modo escuro do sistema — decisão de direção de arte.

## Cores

| Token | Valor | Uso |
|---|---|---|
| `paper` | `#F5F3EE` | fundo da página |
| `paper-raised` | `#FBFAF7` | superfícies elevadas (menu mobile) |
| `ink` | `#141413` | texto principal, ícones, foco |
| `ink-muted` | `#5E5A54` | texto secundário, metadados (contraste ≈ 6,4:1 sobre `paper`) |
| `rule` | `#D9D5CC` | linhas finas, divisórias, placeholders de imagem |
| `signal` | `#9A3B1F` | **somente** marcação de conteúdo de demonstração (contraste ≈ 6,5:1 sobre `paper`) |

Texto sobre fotografia (hero) usa `paper` com um véu em gradiente para garantir legibilidade.

## Tipografia

| Token | Fonte | Uso |
|---|---|---|
| `font-display` | Cormorant Garamond (300, 400, itálico) | nome, títulos, números de índice |
| `font-sans` | Inter Tight (400, 500) | navegação, rótulos, corpo |

| Estilo | Tamanho | Detalhes |
|---|---|---|
| `text-display` | `clamp(3rem, 9vw, 9rem)` | hero; `leading-[0.9]`, `tracking-tight`, peso 300 |
| `text-headline` | `clamp(2rem, 4.5vw, 4rem)` | títulos de seção |
| `text-title` | `clamp(1.375rem, 2vw, 1.75rem)` | título de projeto |
| `text-label` | `0.75rem` | rótulos em caixa alta, `tracking-[0.16em]`, `font-sans` |
| corpo | `1rem`/`1.125rem` | `leading-relaxed`, largura máx. ~60ch |

## Espaçamento e grade

- Unidade base de 4 px (escala padrão do Tailwind).
- Margem lateral: 16 px (mobile) · 24 px (`md`) · 40 px (`lg`). Largura máxima do conteúdo: 1600 px.
- Espaço entre seções: `clamp(6rem, 14vw, 14rem)` (`py-section`).
- Grade editorial: **1 coluna** abaixo de `md`; **12 colunas** a partir de `md`, `gap-x-6 lg:gap-x-8`. Os cards ocupam larguras e alinhamentos variados definidos por `getEditorialSlot(index)` — ritmo assimétrico, nunca uma grade uniforme.
- Breakpoints Tailwind padrão: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536.

## Movimento

| Token | Valor |
|---|---|
| `ease-editorial` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `duration-reveal` | 900 ms (entrada de blocos na rolagem) |
| `duration-ui` | 300 ms (menus, filtros, hover) |
| hover de imagem | `scale(1.03)` em 1200 ms |

- Revelação na rolagem: opacidade 0 → 1 e deslocamento 24 px → 0.
- Com `prefers-reduced-motion: reduce`: nenhuma animação de deslocamento ou escala; conteúdo aparece imediatamente.
- Sem JavaScript, todo o conteúdo deve ficar visível.

## Componentes

| Componente | Regras |
|---|---|
| `SiteHeader` | fixo, transparente sobre o hero e com fundo `paper` depois; wordmark à esquerda, navegação à direita em `text-label`; no mobile, botão "Menu" com `aria-expanded`/`aria-controls`, painel em tela cheia, fecha com `Esc` e ao escolher um link |
| `Hero` | 100 `svh`, imagem `object-cover`, carregamento prioritário, único `h1` da página, rótulo das disciplinas, indicador de rolagem discreto |
| `CategoryFilter` | botões em `text-label`, estado ativo sublinhado, `aria-pressed` |
| `ProjectCard` | índice numérico (`01`), imagem, título em `font-display`, categorias em `text-label`, selo **Demo** em `signal` quando o conteúdo é de demonstração |
| `DemoNotice` | faixa discreta em `signal` informando que textos e imagens são provisórios |
| `SiteFooter` | contato (sem dados inventados) e créditos das imagens de demonstração |

## Acessibilidade (mínimo obrigatório)

- `lang="pt-BR"`; landmarks `header`, `main`, `footer`; link "Pular para o conteúdo".
- Um único `h1` por página; hierarquia de títulos sem saltos.
- Toda imagem com `alt` descritivo (decorativas com `alt=""`).
- Foco visível: contorno 2 px `ink` (ou `paper` sobre foto) com `outline-offset` 3 px.
- Contraste AA (4,5:1 texto normal, 3:1 texto grande).
- Alvos de toque ≥ 44×44 px no mobile.
- Sem rolagem horizontal em 320 px.
