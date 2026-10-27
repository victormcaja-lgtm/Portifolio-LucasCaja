# Guia de configuração: Vercel, autenticação e Cloudinary

Passo a passo do que **você** precisa fazer nas contas externas. Nenhum segredo deve ser enviado ao Claude, colado em issue ou commitado: os valores ficam só no seu `.env` local e nas variáveis de ambiente da Vercel.

> Antes de tudo, confirme que o `.env` está fora do Git: `git check-ignore .env` deve imprimir `.env`.

---

## 1. Vercel: projeto e banco de produção

### 1.1 Criar o projeto
1. Entre em <https://vercel.com> com sua conta do GitHub.
2. **Add New → Project**. Em *Import Git Repository*, autorize o acesso ao repositório `Portifolio-LucasCaja` e clique em **Import**.
3. O framework (Next.js) é detectado sozinho. Não mexa em *Build Command* nem em *Output Directory*: a Vercel usa sozinha o script `vercel-build` do `package.json`.
4. Clique em **Deploy**. A partir da TASK-04b, o deploy de **Production** exige o banco (`DATABASE_URL`) e falha sem ele, de propósito: produção nunca publica o conteúdo de demonstração por falta de configuração. Se o primeiro deploy falhar por isso, crie o banco (passo 1.2) e use **Redeploy**.
5. No log do primeiro deploy de **Production**, confira se aparece `prisma migrate deploy`. Se não aparecer, em **Settings → Build and Deployment**, defina o *Build Command* como `npm run vercel-build` e faça **Redeploy**.

### 1.2 Criar o Postgres
O "Vercel Postgres" hoje é o **Neon**, oferecido pelo Marketplace da Vercel.
1. No projeto, abra a aba **Storage → Create Database**.
2. Escolha **Neon (Serverless Postgres)** → **Continue**.
3. Região: a mais próxima do público (São Paulo, se aparecer na lista; senão, Washington D.C./`iad1`, que é a região padrão das funções da Vercel). Plano: **Free**.
4. Conecte o banco ao projeto marcando os ambientes **Production** e **Preview**. Deixe **Development** desmarcado: localmente continuamos usando o Postgres do Docker.
5. Em **Settings → Environment Variables**, confira que surgiram `DATABASE_URL` (conexão com pool) e `DATABASE_URL_UNPOOLED` (conexão direta, usada pelas migrações).

Não copie essas URLs para o `.env` local. As tabelas são criadas no deploy de **Production**: a Vercel executa `npm run vercel-build`, que roda `prisma migrate deploy` (pela `DATABASE_URL_UNPOOLED`) antes do `next build`. Deploys de **Preview** só fazem o build e nunca migram o banco: um preview que traga uma migração nova pode falhar até ela ser aplicada em produção. A alternativa é ativar no Neon os branches de banco por preview, para cada preview ter o próprio banco.

Em produção, o build exige `DATABASE_URL`: sem ela, ele falha em vez de publicar o conteúdo de demonstração. Com o banco migrado e vazio, o site publica com a mensagem "Nenhum trabalho publicado no momento.".

### 1.3 Carregar o conteúdo de demonstração no banco de produção
Opcional. O seed não roda automaticamente em produção. Para o site publicado mostrar os projetos de demonstração enquanto o painel não existe:

1. Faça um deploy de **Production** antes, para que as migrações criem as tabelas.
2. Na Vercel, abra **Storage → seu banco** (ou **Settings → Environment Variables**) e copie o valor de `DATABASE_URL_UNPOOLED` (a conexão direta, sem pooler).
3. Na pasta do projeto, no **PowerShell**, rode numa única linha (cole a URL entre as aspas):

   ```powershell
   $env:DATABASE_URL="<url>"; npm run db:seed; Remove-Item Env:DATABASE_URL
   ```

   No Git Bash, o equivalente é `DATABASE_URL="<url>" npm run db:seed`, que vale só para esse comando.

   O PowerShell grava no histórico (PSReadLine) as linhas digitadas, inclusive a URL. Para evitar isso, peça o valor sem colocá-lo na linha de comando:

   ```powershell
   $env:DATABASE_URL = Read-Host "URL do banco"; npm run db:seed; Remove-Item Env:DATABASE_URL
   ```

   e cole a URL quando o PowerShell pedir. O que é digitado no `Read-Host` não vai para o histórico.
4. A mensagem `Seed concluído: 4 categorias, 10 projetos, 30 mídias.` confirma a carga. Depois, faça **Redeploy** para o build gerar as páginas com os projetos.

A variável definida no terminal tem prioridade: o `prisma.config.ts` carrega o `.env` com `process.loadEnvFile`, que não sobrescreve variáveis já definidas, e o `prisma/seed.ts` lê `DATABASE_URL` de `process.env`. O seed é idempotente (pode rodar de novo) e marca todos os projetos como demonstração.

**Cuidado:** essa URL contém a senha do banco. Cole-a **somente** no próprio terminal: nunca no `.env`, em chat, issue, commit ou print de tela. Feche o terminal ao terminar (o `Remove-Item` já apaga a variável da sessão).

---

## 2. Autenticação (Better Auth): segredo e primeiro administrador

### 2.1 Gerar o segredo
Num terminal (Git Bash ou PowerShell com Node), rode **um** dos comandos:

```bash
openssl rand -base64 32
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Gere **dois** valores diferentes: um para o seu computador e outro para a Vercel. Assim, um vazamento local não compromete a produção.

### 2.2 No `.env` local
Descomente e preencha as linhas da Etapa 5:

```dotenv
BETTER_AUTH_SECRET=<valor gerado para uso local>
BETTER_AUTH_URL=http://localhost:3000
SEED_OWNER_EMAIL=<e-mail do administrador principal>
SEED_OWNER_NAME=<nome que aparecerá no painel>
```

O e-mail **não é segredo**, mas também não precisa ir para o repositório: ele fica só no `.env`. Ele define quem recebe o papel **OWNER** (acesso total, inclusive gestão de colaboradores). O primeiro acesso (definição de senha) está na seção 3.

`BETTER_AUTH_URL` é o endereço em que o site roda, sem barra no final:
- **local:** `http://localhost:3000` (o `npm run dev`);
- **produção:** `https://portifolio-lucas-caja.vercel.app` (depois, o domínio próprio);
- **preview da Vercel:** deixe **sem valor**. O código usa então `https://<VERCEL_URL>`, a URL de cada deployment, que a Vercel define sozinha.

### 2.3 Na Vercel
**Settings → Environment Variables → Add New**, uma variável por vez:

| Nome | Valor | Ambientes | Marcar como *Sensitive* |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | o segundo valor gerado | Production, Preview | **sim** |
| `BETTER_AUTH_URL` | `https://portifolio-lucas-caja.vercel.app` (depois, o domínio próprio) | **só** Production | não |

`SEED_OWNER_EMAIL` e `SEED_OWNER_NAME` **não** precisam ir para a Vercel: só o script do primeiro acesso as usa, e ele roda no seu computador (seção 3).

O site público não depende dessas variáveis: sem elas, o build e as páginas públicas funcionam, e só o `/admin` fica indisponível.

Variáveis novas só valem a partir do **próximo deploy**: em **Deployments**, use **⋯ → Redeploy** no último deploy.

---

## 3. Primeiro acesso do administrador

Não existe cadastro pelo site. O primeiro **OWNER** é criado pelo script `npm run auth:owner`, que:
- cria o usuário de `SEED_OWNER_EMAIL` com o papel **OWNER** (se ele já existir, só garante o papel OWNER e o desbloqueio; nenhum outro usuário é alterado);
- imprime **um link** `<BETTER_AUTH_URL>/admin/definir-senha?token=…`, de **uso único**, que **expira em 60 minutos**.

Você abre o link no navegador e define a senha lá (mínimo de 12 caracteres). Ninguém digita senha no terminal. Rodar o script de novo gera um link novo e invalida o anterior, se ainda não tiver sido usado.

**O link é uma credencial até ser usado:** não o envie por chat, e-mail, issue ou print de tela, e não o cole em nenhum lugar além da barra de endereços do navegador.

### 3.1 Local
1. Banco no ar e migrado: `npm run db:up` e `npm run db:deploy`.
2. No `.env`, preencha as variáveis da seção 2.2 (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3000`, `SEED_OWNER_EMAIL`, `SEED_OWNER_NAME`). O script em si não usa o `BETTER_AUTH_SECRET`, mas o site local precisa dele para o login.
3. Rode `npm run auth:owner` e, com `npm run dev` no ar, abra o link impresso.
4. Defina a senha e entre em <http://localhost:3000/admin/entrar>.

### 3.2 Produção
Pré-requisitos: um deploy de **Production** feito depois desta etapa (ele aplica a migração que cria as tabelas de autenticação) e as variáveis da seção 2.3 já configuradas na Vercel.

1. Na Vercel, copie o valor de `DATABASE_URL_UNPOOLED` (como na seção 1.3).
2. Na pasta do projeto, no **PowerShell**:

   ```powershell
   $env:DATABASE_URL = Read-Host "URL do banco"
   $env:BETTER_AUTH_URL = "https://portifolio-lucas-caja.vercel.app"
   $env:SEED_OWNER_EMAIL = "<e-mail do administrador principal>"
   $env:SEED_OWNER_NAME = "<nome que aparecerá no painel>"
   npm run auth:owner
   Remove-Item Env:DATABASE_URL, Env:BETTER_AUTH_URL, Env:SEED_OWNER_EMAIL, Env:SEED_OWNER_NAME
   ```

   Cole a URL do banco quando o PowerShell pedir (o que é digitado no `Read-Host` não vai para o histórico).
3. Confira se o link impresso começa com `https://portifolio-lucas-caja.vercel.app/admin/definir-senha`. Se começar com `http://localhost`, a variável `BETTER_AUTH_URL` não foi definida na sessão e o script usou a do `.env`: rode de novo os passos acima.
4. Abra o link, defina a senha e entre em `https://portifolio-lucas-caja.vercel.app/admin/entrar`.

**Por que o `BETTER_AUTH_SECRET` não é necessário aqui?** O script não usa o `BETTER_AUTH_SECRET`: o token do link é aleatório, fica gravado no banco (tabela `Verification`) e é conferido lá quando você define a senha. O segredo de produção assina os cookies de sessão do site, e o script não cria sessão. Assim, o segredo de produção nunca precisa sair da Vercel para o seu computador.

As variáveis definidas na sessão têm prioridade sobre o `.env` (o script carrega o `.env` com `process.loadEnvFile`, que não sobrescreve variáveis já definidas). O `Remove-Item` do fim apaga todas da sessão; feche o terminal ao terminar.

Se o link expirar ou se perder, rode o script de novo: ele não cria um segundo usuário.

---

## 4. Cloudinary: conta e chaves

### 4.1 Criar a conta
1. Cadastre-se em <https://cloudinary.com> (plano **Free**).
2. Ative a verificação em duas etapas: **foto do perfil → Account Settings → Security / Two-Factor Authentication**. A conta guardará todo o acervo, então vale a proteção extra.

### 4.2 Encontrar as chaves
1. No Console, abra **Settings** (engrenagem) → **API Keys**.
2. Anote o **Cloud name** (aparece no topo da página e no Dashboard).
3. Use a chave existente ou clique em **Generate New API Key** e dê um nome a ela, por exemplo `portfolio-site`. Cada chave tem um **API Key** (público) e um **API Secret** (segredo; clique no ícone de olho para revelar).

Não é preciso criar *upload preset*: os uploads serão **assinados pelo servidor**, então o segredo nunca chega ao navegador.

### 4.3 No `.env` local
Descomente e preencha as linhas da Etapa 6:

```dotenv
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>
CLOUDINARY_UPLOAD_FOLDER=portfolio
```

Atenção: só o `CLOUD_NAME` leva o prefixo `NEXT_PUBLIC_`, que o expõe ao navegador. **Nunca** ponha esse prefixo no secret.

### 4.4 Na Vercel
| Nome | Ambientes | *Sensitive* |
|---|---|---|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Production, Preview | não |
| `CLOUDINARY_API_KEY` | Production, Preview | não |
| `CLOUDINARY_API_SECRET` | Production, Preview | **sim** |
| `CLOUDINARY_UPLOAD_FOLDER` | Production, Preview | não |

Se quiser separar o acervo de testes do real, use `CLOUDINARY_UPLOAD_FOLDER=portfolio-preview` só no ambiente **Preview**. Depois, faça **Redeploy**.

---

## 5. Conferência

- [ ] O projeto da Vercel publica o site de demonstração.
- [ ] `DATABASE_URL` e `DATABASE_URL_UNPOOLED` aparecem na Vercel (Production e Preview).
- [ ] O `.env` local tem as variáveis das etapas 5 e 6 preenchidas, e `git status` **não** lista o `.env`.
- [ ] Na Vercel, `BETTER_AUTH_SECRET` e `CLOUDINARY_API_SECRET` estão marcadas como *Sensitive*.
- [ ] O link do `npm run auth:owner` foi usado para definir a senha do OWNER, e o login em `/admin/entrar` funciona.
- [ ] Nenhum segredo foi colado em chat, issue ou commit.

Basta avisar "configurado" quando terminar. O Claude não precisa ver os valores: o código os lê de `process.env` e falha com uma mensagem que diz **qual** variável falta, nunca o valor dela.

## Se um segredo vazar

- **Better Auth:** gere um novo valor e troque-o no `.env` ou na Vercel. Todas as sessões abertas serão encerradas.
- **Cloudinary:** em **Settings → API Keys**, gere uma chave nova, atualize as variáveis e **desative a antiga**.
- **Banco:** no painel do Neon (Storage → seu banco → **Open in Neon**), redefina a senha do usuário. A integração atualiza as variáveis na Vercel; depois, faça **Redeploy**.
