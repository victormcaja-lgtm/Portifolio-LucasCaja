# Processo de desenvolvimento e agentes

## Agentes (`.claude/agents/`)

| Agente | Responsabilidade única | Pode alterar | Ferramentas |
|---|---|---|---|
| `dev` | implementar a task segundo spec, plano e padrões | **somente** código de produção e configuração (`src/**` exceto testes, `public/**`, configs) — nunca testes | Read, Grep, Glob, Edit, Write, Bash |
| `teste` | escrever testes a partir dos critérios de aceite **antes** da implementação; depois validar suíte e cobertura | **somente** arquivos de teste (`**/*.test.ts(x)`, `src/test/**`, `tests/**`, `vitest.config.mts`) | Read, Grep, Glob, Edit, Write, Bash |
| `revisor` | revisar a entrega contra spec, plano e padrões; emitir **APROVADO** ou **REPROVADO** com itens bloqueantes | nada | Read, Grep, Glob, Bash (somente comandos de leitura: `git diff`, `npm run lint/typecheck/test`) |
| `ui-ux` | validar telas contra o design system (tokens, componentes, acessibilidade, responsividade); emitir **APROVADO** ou **REPROVADO** | nada | Read, Grep, Glob e ferramentas de navegador para captura de tela |

**Controle de escopo:** as ferramentas do Claude Code não permitem restringir escrita por caminho dentro de um subagente. Por isso, além das instruções de cada agente, o orquestrador executa `git status --porcelain` após cada etapa e **reprova automaticamente** qualquer alteração fora do escopo permitido (por exemplo, o `teste` modificando `src/components/Hero.tsx`, ou o `revisor` alterando qualquer arquivo).

## Fluxo por task

```
Spec (docs/specs/TASK-xx.md)
  │
  ├─► 1. teste   escreve testes a partir dos critérios de aceite (falham — "vermelho")
  ├─► 2. dev     implementa até os testes passarem
  ├─► 3. teste   valida: suíte completa + cobertura mínima + lint + typecheck
  ├─► 4. revisor APROVADO / REPROVADO
  └─► 5. ui-ux   (se a task tiver tela) APROVADO / REPROVADO
        │
        ├─ todos aprovaram → commit da task
        └─ alguma reprovação → volta ao dev com a lista de itens (máx. 3 ciclos de correção)
                                após o 3º ciclo reprovado → processo PARA e pede intervenção humana
```

## Definição de pronto

- Todos os critérios de aceite da spec atendidos e cobertos por testes.
- `npm run lint`, `npm run typecheck`, `npm run test:coverage` e `npm run build` passam.
- Cobertura mínima: **80%** de linhas, funções, ramos e instruções em `src/lib`, `src/components` e `src/content`.
- Revisor e (se houver tela) UI/UX aprovaram.
- Nenhuma funcionalidade não implementada é apresentada como pronta; conteúdo provisório está marcado como demonstração.

## Padrões de código

- TypeScript estrito; sem `any` implícito ou explícito sem justificativa.
- Server Components por padrão; `"use client"` apenas onde há estado, efeitos ou eventos.
- Funções de domínio puras em `src/lib`; componentes sem lógica de dados.
- Estilo somente com tokens do design system (`docs/DESIGN-SYSTEM.md`).
- Imagens sempre com `next/image`, `alt` e `sizes`.
- Nomes de componentes em PascalCase, um componente por arquivo; testes ao lado do arquivo testado (`Foo.test.tsx`).
- Textos de interface em português do Brasil.
- Commits pequenos, mensagem no imperativo, prefixo convencional (`feat:`, `test:`, `docs:`, `chore:`, `fix:`).
