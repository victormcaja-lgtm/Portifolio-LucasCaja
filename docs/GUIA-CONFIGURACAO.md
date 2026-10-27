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

O e-mail **não é segredo**, mas também não precisa ir para o repositório: ele fica só no `.env` e na Vercel. Ele define quem recebe o papel **OWNER** (acesso total, inclusive gestão de colaboradores). O primeiro acesso (definição de senha) será explicado quando a TASK-05 estiver pronta.

### 2.3 Na Vercel
**Settings → Environment Variables → Add New**, uma variável por vez:

| Nome | Valor | Ambientes | Marcar como *Sensitive* |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | o segundo valor gerado | Production, Preview | **sim** |
| `BETTER_AUTH_URL` | a URL do site, ex.: `https://seu-projeto.vercel.app` (depois, o domínio próprio) | Production | não |
| `SEED_OWNER_EMAIL` | o mesmo e-mail | Production, Preview | não |
| `SEED_OWNER_NAME` | o mesmo nome | Production, Preview | não |

Variáveis novas só valem a partir do **próximo deploy**: em **Deployments**, use **⋯ → Redeploy** no último deploy.

---

## 3. Cloudinary: conta e chaves

### 3.1 Criar a conta
1. Cadastre-se em <https://cloudinary.com> (plano **Free**).
2. Ative a verificação em duas etapas: **foto do perfil → Account Settings → Security / Two-Factor Authentication**. A conta guardará todo o acervo, então vale a proteção extra.

### 3.2 Encontrar as chaves
1. No Console, abra **Settings** (engrenagem) → **API Keys**.
2. Anote o **Cloud name** (aparece no topo da página e no Dashboard).
3. Use a chave existente ou clique em **Generate New API Key** e dê um nome a ela, por exemplo `portfolio-site`. Cada chave tem um **API Key** (público) e um **API Secret** (segredo; clique no ícone de olho para revelar).

Não é preciso criar *upload preset*: os uploads serão **assinados pelo servidor**, então o segredo nunca chega ao navegador.

### 3.3 No `.env` local
Descomente e preencha as linhas da Etapa 6:

```dotenv
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>
CLOUDINARY_UPLOAD_FOLDER=portfolio
```

Atenção: só o `CLOUD_NAME` leva o prefixo `NEXT_PUBLIC_`, que o expõe ao navegador. **Nunca** ponha esse prefixo no secret.

### 3.4 Na Vercel
| Nome | Ambientes | *Sensitive* |
|---|---|---|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Production, Preview | não |
| `CLOUDINARY_API_KEY` | Production, Preview | não |
| `CLOUDINARY_API_SECRET` | Production, Preview | **sim** |
| `CLOUDINARY_UPLOAD_FOLDER` | Production, Preview | não |

Se quiser separar o acervo de testes do real, use `CLOUDINARY_UPLOAD_FOLDER=portfolio-preview` só no ambiente **Preview**. Depois, faça **Redeploy**.

---

## 4. Conferência

- [ ] O projeto da Vercel publica o site de demonstração.
- [ ] `DATABASE_URL` e `DATABASE_URL_UNPOOLED` aparecem na Vercel (Production e Preview).
- [ ] O `.env` local tem as variáveis das etapas 5 e 6 preenchidas, e `git status` **não** lista o `.env`.
- [ ] Na Vercel, `BETTER_AUTH_SECRET` e `CLOUDINARY_API_SECRET` estão marcadas como *Sensitive*.
- [ ] Nenhum segredo foi colado em chat, issue ou commit.

Basta avisar "configurado" quando terminar. O Claude não precisa ver os valores: o código os lê de `process.env` e falha com uma mensagem que diz **qual** variável falta, nunca o valor dela.

## Se um segredo vazar

- **Better Auth:** gere um novo valor e troque-o no `.env` ou na Vercel. Todas as sessões abertas serão encerradas.
- **Cloudinary:** em **Settings → API Keys**, gere uma chave nova, atualize as variáveis e **desative a antiga**.
- **Banco:** no painel do Neon (Storage → seu banco → **Open in Neon**), redefina a senha do usuário. A integração atualiza as variáveis na Vercel; depois, faça **Redeploy**.
