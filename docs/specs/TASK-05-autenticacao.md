# TASK-05: autenticação (Better Auth), primeiro acesso do OWNER e proteção do `/admin`

**Tem tela:** sim (`/admin/entrar`, `/admin/definir-senha`, `/admin`). Requer validação de UI/UX.
**Depende de:** TASK-04b
**Fora de escopo:**
- CRUD de projetos (TASK-07);
- convites e gestão de colaboradores (TASK-08). O fluxo de "definir senha por link" criado aqui será reutilizado nos convites;
- envio de e-mail, login social e 2FA.

## Objetivo

Login por e-mail e senha para a área administrativa, com estas regras:
- **sem cadastro público**;
- o primeiro OWNER é criado por script, que gera um **link de uso único** para ele definir a própria senha. Ninguém digita a senha no terminal e ela nunca passa pelo Claude;
- sessões em banco, cookies `httpOnly`;
- papéis OWNER > ADMIN > EDITOR verificados no servidor;
- `/admin/*` protegido no proxy (checagem otimista) **e** no servidor (checagem real).

## Dependências (o orquestrador instala)

`better-auth@1.7.14`. Antes de implementar, consulte a documentação do pacote instalado (`node_modules/better-auth`: README, tipos e `dist`) e, se precisar, <https://www.better-auth.com/docs>, para confirmar os nomes de API desta versão:
- adapter Prisma;
- `toNextJsHandler`;
- `getSessionCookie`;
- `requestPasswordReset` / `resetPassword`;
- `rateLimit` com `storage: "database"`;
- `databaseHooks`;
- `user.additionalFields`;
- `createAuthClient`.

O CLI (`npx @better-auth/cli generate`) pode ser usado **só como referência** do schema; o schema final é escrito à mão no `schema.prisma`.

## Banco

Migração nova (`prisma migrate dev --name auth`) adicionando os modelos exigidos pelo Better Auth, compatíveis com o `User` existente:
- `Session`: `token` único, `expiresAt`, `ipAddress?`, `userAgent?`, `userId` → User (Cascade).
- `Account`: `accountId`, `providerId`, `password?` (hash), tokens opcionais, `userId` → User (Cascade).
- `Verification`: `identifier`, `value`, `expiresAt`.
- `RateLimit`: o modelo que o `rateLimit` com `storage: "database"` exige.

`User` já tem `name`, `email`, `emailVerified`, `image`, `role`, `banned`, `createdAt` e `updatedAt`. Ajuste o que o Better Auth exigir e justifique em comentário. A migração precisa rodar sobre o banco com seed sem perder dados.

## Servidor

### `src/server/auth-env.ts`
```ts
export function getAuthEnv(env?: NodeJS.ProcessEnv): { secret: string; baseURL: string; trustedOrigins: string[] };
```
- `BETTER_AUTH_SECRET` é obrigatória, com ≥ 32 caracteres.
- `baseURL`: `BETTER_AUTH_URL`; na falta dela, `https://${VERCEL_URL}` (previews da Vercel); na falta das duas, erro.
- `trustedOrigins`: `baseURL`, mais `https://${VERCEL_URL}` quando existir.
- As mensagens de erro citam o nome da variável, **nunca** o valor. Separado de `getServerEnv`: o build e as páginas públicas **não** exigem variáveis de autenticação.

### `src/server/auth.ts`: `getAuth()` (singleton preguiçoso, `server-only`)
- `prismaAdapter(getDb(), { provider: "postgresql" })`.
- `emailAndPassword`: `enabled: true`, `disableSignUp: true`, `minPasswordLength: 12`, `maxPasswordLength: 128`, `autoSignIn: false`.
- `sendResetPassword` delega a um *sink* injetável (`setResetLinkSink`), usado pelo script do OWNER. Sem um sink registrado, lança erro "envio de e-mail não configurado" e não registra o link em log.
- `user.additionalFields`: `role` e `banned` com `input: false`, para o usuário não poder alterá-los.
- **Usuário banido não entra:** um `databaseHooks.session.create.before` recusa a sessão com erro genérico.
- `rateLimit`: `enabled: true`, `storage: "database"`, regra mais rígida para `/sign-in/email` (5 tentativas por 60 s) e para `/reset-password`.
- `session`: expiração de 7 dias, renovação diária.

### `src/app/api/auth/[...all]/route.ts`
`toNextJsHandler`, com a instância criada na primeira requisição: o build sem variáveis de autenticação continua passando.

### `src/server/authz.ts`
```ts
export type Role = "OWNER" | "ADMIN" | "EDITOR";
export function hasRole(userRole: Role, required: Role): boolean;          // OWNER ≥ ADMIN ≥ EDITOR
export async function getCurrentUser(): Promise<{ id; name; email; role: Role } | null>;
export async function requireUser(nextPath?: string): Promise<...>;        // sem sessão → redirect("/admin/entrar?next=...")
export async function requireRole(required: Role): Promise<...>;           // papel insuficiente → página de acesso negado (403)
```
Para o 403, use `forbidden()` se a documentação do Next 16 o permitir com a configuração do projeto. Caso contrário, use uma página/estado "Acesso negado". Justifique a escolha.

### `src/lib/safe-redirect.ts`
```ts
export function safeAdminRedirect(next: string | null | undefined): string;
```
Aceita só caminhos relativos que começam com `/admin` (sem `//`, sem esquema, sem `\`, sem `/admin/entrar` e sem `/admin/definir-senha`); qualquer outro valor vira `/admin`. Isso previne *open redirect*.

## Proxy (`src/proxy.ts`)

O matcher passa a incluir `/admin/:path*`, mantendo `/trabalhos/:slug`.
- Em `/admin/*`, exceto `/admin/entrar` e `/admin/definir-senha`: sem o cookie de sessão (`getSessionCookie`) → redirect para `/admin/entrar?next=<caminho>`. A checagem é **otimista**: a validação real fica no servidor (`requireUser`).
- O comportamento de `/trabalhos/:slug` não muda.

## Telas

Seguem o design system: off-white, tipografia display nos títulos, sans nos rótulos, sem sombras nem cantos arredondados chamativos e foco visível. Todas com `robots: noindex, nofollow` e sem `SiteHeader`/`SiteFooter` públicos. Use um layout mínimo do admin, com o nome do site e o link "Ver site".

1. **`/admin/entrar`**
   - Formulário com e-mail e senha: `<label>` visível, `autocomplete="username"` e `"current-password"`, botão "Entrar".
   - Erro **genérico** "E-mail ou senha inválidos.", com `role="alert"`. O mesmo vale para usuário banido e para o rate limit, que diz "Muitas tentativas. Aguarde um minuto.".
   - O botão fica desabilitado durante o envio.
   - Depois do login, vai para `safeAdminRedirect(next)`.
   - Já logado → redirect para `/admin`.
2. **`/admin/definir-senha?token=…`**
   - Campos "Nova senha" e "Confirmar senha" (`autocomplete="new-password"`), mínimo de 12 caracteres, validação de igualdade no cliente.
   - Com sucesso: mensagem e link "Entrar".
   - Token ausente, inválido ou expirado: mensagem clara e nenhum formulário.
3. **`/admin`** (placeholder do painel)
   - "Olá, {nome}", o papel em português (Proprietário, Administrador, Editor) e o botão "Sair", que encerra a sessão e volta para `/admin/entrar`.
   - Um texto honesto: "O painel de projetos chega na próxima etapa." Não apresente nada como implementado.

Com Cache Components, leituras de sessão (`headers()`) são dinâmicas. Coloque-as dentro de `<Suspense>` ou da estrutura que a documentação do Next 16 indicar, sem erros de build nem avisos de console.

## Script do OWNER

`scripts/owner-invite.ts`, executado por `npm run auth:owner`.
- **Lê do ambiente:**
  - `SEED_OWNER_EMAIL` e `SEED_OWNER_NAME`, obrigatórias;
  - `DATABASE_URL`;
  - as variáveis de `getAuthEnv`.
- Cria o usuário com papel `OWNER` se ele não existir. Se existir, garante o papel `OWNER` e `banned = false`. Nunca rebaixa ninguém nem altera outros usuários.
- Gera, pelo fluxo de redefinição de senha do Better Auth com o sink do script, um link de uso único para `<baseURL>/admin/definir-senha?token=…`, válido por **60 minutos**, e **imprime só esse link** com um aviso: "não compartilhe; expira em 60 min; uso único".
- **Funciona também em produção:** o usuário roda localmente com as variáveis do ambiente de produção, como no seed. Documente isso no guia.
- A lógica fica numa função exportada e testável (`createOwnerInvite(db, env, sink)`). O `main` só roda como ponto de entrada.

## Variáveis e documentação

- `.env.example`: ative a seção da Etapa 5 e explique `BETTER_AUTH_URL` local, de produção e de preview.
- `docs/GUIA-CONFIGURACAO.md`: nova seção "Primeiro acesso do administrador", com o passo a passo local e o de produção (PowerShell, com `Read-Host` para a URL do banco, como no seed).
- README: explique o comando `auth:owner`.

## Testes esperados (agente teste)

- **Unitários:**
  - `auth-env`: obrigatórias, tamanho do segredo, fallback para `VERCEL_URL` e mensagens sem valores;
  - `hasRole`: matriz completa;
  - `safeAdminRedirect`: casos maliciosos, como `//evil.com`, `https://evil.com`, `/\evil`, `/admin/../x` e `/adminx`;
  - proxy em `/admin` com e sem cookie, com as exceções;
  - componentes das três telas, com mocks do `authClient` e do servidor: estados de erro, envio e sucesso.
- **Integração** (banco de teste):
  - a migração aplica;
  - `createOwnerInvite` cria o OWNER, é idempotente, promove sem afetar outros usuários e gera um token válido;
  - `resetPassword` com o token define a senha; o token não serve uma segunda vez;
  - login via `auth.api.signInEmail` funciona com a senha certa e falha com a errada;
  - usuário banido não consegue sessão;
  - `signUpEmail` é recusado (cadastro desativado).
- **E2E:** um *global setup* cria (ou atualiza) um usuário OWNER **de teste** (`e2e-owner@exemplo.test`) com uma senha conhecida, usando o hasher do Better Auth, no banco local. Depois, cobre estes cenários:
  - login com sucesso;
  - erro com senha errada;
  - `/admin` sem sessão redireciona para o login;
  - logout;
  - axe sem violações graves nas três telas.

  As variáveis para o servidor do E2E (`BETTER_AUTH_URL=http://localhost:3100` e um segredo só de teste quando ausente) ficam na configuração do Playwright, nunca reaproveitando segredos reais em artefatos.

## Critérios de aceite

1. Não existe caminho para criar conta sem o script do OWNER (TASK-08 trará convites).
2. `npm run auth:owner` imprime um link que funciona uma única vez e expira em 60 min; a senha definida permite o login.
3. `/admin` sem sessão → `/admin/entrar?next=/admin`; com sessão → o placeholder com nome e papel; "Sair" encerra a sessão.
4. Um usuário EDITOR não passa por `requireRole("ADMIN")` (403).
5. Usuário banido não entra; a mensagem não revela o motivo.
6. Rate limit ativo no login.
7. Build sem variáveis de autenticação passa; as páginas públicas não mudam.
8. Nenhum segredo, token ou hash em logs, mensagens de erro, commits ou artefatos de teste.
9. Lint, typecheck, unitários (≥ 80%), integração e E2E passam.
