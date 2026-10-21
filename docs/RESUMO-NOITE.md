# Resumo do trabalho autônomo — 20 e 21/10/2026

Todas as tasks passaram pelo fluxo **Teste → Dev → Teste → Revisor → UI/UX**, este último aplicado só às tasks com tela. Tudo foi commitado e enviado para `origin/main` no GitHub.

## Entregas

| Task | Resultado | Ciclos de correção |
|---|---|---|
| Plano | Arquitetura, design system, processo, specs e os 4 agentes em `.claude/agents/` | — |
| **TASK-01 Página inicial** | Hero em tela cheia, header discreto com menu mobile acessível, grade editorial assimétrica com filtro, revelação na rolagem e rodapé com créditos | 1 (prioridade da imagem do hero, contraste do header sobre a foto, foco escapando do menu) |
| **TASK-02 Página de projeto** | `/trabalhos/[slug]` estática (10 projetos) com capa, galeria assimétrica, navegação anterior/próximo e 404 real renderizada no servidor | 1 (erro de console por `params`; o véu do hero "ausente" era cache do servidor dev) |
| **TASK-03 E2E e acessibilidade** | Playwright em desktop e mobile, com axe sem violações graves; teste unitário do proxy | 0 (o defeito encontrado, foco do skip link, foi corrigido dentro do próprio fluxo) |
| **TASK-04 Banco de dados** | Postgres em Docker (porta 5434), schema Prisma 7, migração, seed idempotente e repositório com testes de integração | 0 |

Números finais:
- 292 testes unitários, com cobertura de cerca de 95%;
- 14 testes de integração contra o Postgres real;
- 33 testes E2E (desktop e mobile).

Lint, typecheck e build passam. O build continua funcionando sem banco.

## Como ver o resultado

```bash
npm install
npm run dev                 # http://localhost:3000
```

| Comando | Para quê |
|---|---|
| `npm run test:coverage` | testes unitários + cobertura |
| `npm run test:e2e` | E2E e acessibilidade (faz o build e sobe a porta 3100) |
| `npm run db:up` | sobe o Postgres local; depois `npm run db:migrate` e `npm run db:seed` |
| `npm run test:integration` | testes contra o banco (precisa do `db:up`) |
| `npm run db:studio` | visualizar os dados |

O contêiner `portfolio-lucascaja-db` ficou rodando. Para parar: `npm run db:down`.

## Decisões tomadas sem consultar você

Todas são fáceis de reverter:

1. **Imagens de demonstração:** Unsplash via Picsum, em preto e branco, com crédito de cada autor no rodapé. Todo texto provisório diz "Demonstração".
2. **Fontes:** Cormorant Garamond nos títulos e Inter Tight nos rótulos e no texto.
3. **Tema:** só claro, off-white `#F5F3EE`. O site não acompanha o modo escuro do sistema.
4. **404 com Cache Components:** `src/proxy.ts`, a solução recomendada pela documentação do Next 16.
5. **Prisma 7.10.1:** a tag `latest` do npm aponta para um RC da versão 8, que evitei.
6. **npm 11 `allowScripts`:** aprovei os scripts de instalação de `prisma`, `@prisma/engines`, `esbuild` e `unrs-resolver`.
7. **Ordem das categorias:** em dois projetos demo, a ordem passou a seguir a ordem canônica de `CATEGORIES`.

## Observações sobre o processo

- **Agentes:** os arquivos `.claude/agents/*.md` só são carregados quando o Claude Code reinicia. Nesta sessão, cada papel rodou como subagente genérico, seguindo literalmente o arquivo do agente. O escopo de cada um foi conferido com `git status` depois de cada passo, e nenhum agente alterou arquivos fora do seu papel. Numa sessão nova, os agentes `dev`, `teste`, `revisor` e `ui-ux` ficam disponíveis por nome, com as ferramentas restritas.
- **Interrupção:** houve uma pausa pelo limite de uso da conta durante a TASK-03. O trabalho foi retomado sem perda.

## Próximos passos (precisam de decisão sua)

1. **TASK-04b, páginas lendo do banco.** Escolha onde hospedar o Postgres em produção: Neon, Supabase ou o Postgres da Vercel (Neon). Também é preciso definir a estratégia de cache e a lista de slugs do proxy de 404.
2. **TASK-05, autenticação (Better Auth).** Defina o e-mail do primeiro usuário OWNER. O segredo `BETTER_AUTH_SECRET` deve ser gerado por você (`openssl rand -base64 32`) e colocado em `.env` e na Vercel; não precisa compartilhá-lo comigo.
3. **TASK-06, Cloudinary.** Crie a conta e configure `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` no `.env` e na Vercel.
4. **Conteúdo real.** Fotografias, textos, biografia e contato precisam vir do fotógrafo. Nada disso foi inventado.

Melhorias não bloqueantes registradas pelos revisores, para uma rodada futura:
- trocar `networkidle` nos E2E por esperas mais determinísticas;
- usar `"use cache"` no ano do rodapé, que hoje mostra o ano do build;
- teste garantindo que a ordem de categorias dos dados demo segue `CATEGORIES`;
- rodar o seed numa transação.
