# TASK-03 — Testes E2E (Playwright) e auditoria de acessibilidade

**Tem tela:** não, mas verifica as telas da TASK-01 e da TASK-02 no navegador real.
**Depende de:** TASK-01 e TASK-02
**Fora de escopo:** testes visuais por screenshot (regressão de pixels), testes de performance em CI.

## Objetivo

Garantir, num navegador real, que as páginas públicas funcionam em desktop e mobile e não têm violações de acessibilidade graves.

## Infraestrutura

O orquestrador instala `@playwright/test`, `@axe-core/playwright` e o Chromium, e cria o script `test:e2e` = `playwright test`.

O `playwright.config.ts` é escrito pelo agente Teste:
- diretório `tests/e2e`;
- `webServer` rodando `npm run build && npx next start -p 3100`, com `reuseExistingServer` fora de CI e `baseURL` `http://localhost:3100`;
- dois projetos: **desktop** (Chromium, 1440×900) e **mobile** (Chromium com o dispositivo `Pixel 7`);
- relatório `list` e `html`, sem abrir automaticamente.

## Critérios de aceite

**CA-01 Página inicial.** `/` carrega com status 200. O hero e o `h1` aparecem e há exatamente 1 `h1`. A grade mostra 10 cards e o aviso de demonstração está visível.

**CA-02 Filtro.** Clicar em "Filme" reduz a lista aos projetos dessa categoria e atualiza o contador. "Todos" restaura os 10.

**CA-03 Menu mobile** (só no projeto mobile):
- "Abrir menu" abre o painel com os links;
- `Escape` fecha o painel e devolve o foco ao botão;
- clicar em "Contato" fecha o painel e rola até `#contato`.

**CA-04 Navegação até o projeto.** Clicar no primeiro card leva a `/trabalhos/{slug}`, onde o `h1` é o título do projeto. Os links "Próximo" e "Anterior" levam a outros projetos. "Todos os trabalhos" volta para `/#trabalhos`.

**CA-05 404.** `/trabalhos/nao-existe` responde 404 e mostra "Página não encontrada".

**CA-06 Sem rolagem horizontal.** Em 320×640, a página inicial e uma página de projeto têm `scrollWidth <= innerWidth`.

**CA-07 Acessibilidade automatizada.** O axe (`@axe-core/playwright`, tags `wcag2a`, `wcag2aa`, `wcag21aa`) não encontra violações `serious` nem `critical` em `/`, numa página de projeto e na 404. Isso vale para desktop e para mobile.

**CA-08 Teclado.** Com Tab a partir do topo, o primeiro elemento focado é o link "Pular para o conteúdo". Ativá-lo move o foco para `#conteudo`.

**CA-09 Movimento reduzido.** Com `reducedMotion: "reduce"`, todos os cards de projeto ficam visíveis (opacidade 1) sem precisar rolar.

**CA-10 Sem erros no console.** Carregar `/` e uma página de projeto não gera `console.error` nem erro de página (`pageerror`).

**CA-11 Qualidade.** `npm run test:e2e` passa nos dois projetos. `npm run lint`, `npm run typecheck` e `npm run test` continuam passando.
