# TASK-04c: status 404 real na Vercel

**Tem tela:** não (a página 404 não muda)
**Depende de:** TASK-04b
**Fora de escopo:** qualquer mudança visual.

## Problema (observado em produção, 27/10/2026)

Em `https://portifolio-lucas-caja.vercel.app`, `/trabalhos/nao-existe` (e `/trabalhos/__vazio__`) mostra a página "Erro 404" com **HTTP 200**, um *soft 404* que prejudica SEO. Localmente (`next start`), o mesmo endereço responde 404.

Causa provável: o proxy reescreve para `/404`. Na Vercel, esse caminho corresponde ao arquivo estático `404.html` gerado no build e é servido como uma rota comum, com status 200.

## Mudança

Em `src/proxy.ts`, para um slug desconhecido:
- reescrever para um caminho **sem rota e sem arquivo estático correspondente**: exatamente `/_nao-encontrado`, definido numa constante com comentário explicando o motivo;
- passar `{ status: 404 }` no `init` do `NextResponse.rewrite` (tipo `MiddlewareResponseInit`), como garantia extra.

Os testes do proxy passam a verificar o novo destino e o status 404 na resposta do rewrite.

## Critérios de aceite

1. Os testes unitários do proxy verificam o destino sem rota e `status === 404`.
2. Local (`next start`): `/trabalhos/nao-existe` e `/trabalhos/__vazio__` respondem **404** com o HTML da página 404 renderizado no servidor; `/trabalhos/estudo-i` continua 200 (com seed).
3. E2E continua verde.
4. **Produção (após o deploy):** os mesmos endereços respondem 404 na Vercel. O orquestrador verifica isso depois do push.
