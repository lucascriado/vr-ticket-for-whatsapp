# ticket2whatsapp

Consulte o saldo e extrato do seu **Ticket Restaurante** direto pelo WhatsApp — sem abrir app, sem esperar carregar, sem frescura.

Você manda uma mensagem, o bot responde em segundos.

---

## Como funciona

```
você → /ticket saldo   →  Saldo Ticket Restaurante: R$ 247,50
você → /ticket extrato →  🧾 Extrato com as últimas movimentações
```

Por baixo dos panos:

1. A mensagem chega via **Evolution API** (webhook)
2. O servidor autentica na API da Edenred usando um token OAuth2 do Azure B2C
3. Consulta o saldo ou extrato e devolve formatado no WhatsApp

A autenticação é totalmente automática — o bot renova o token silenciosamente a cada 30 minutos e faz o login completo (Puppeteer + MFA via Gmail) toda meia-noite, então quando você manda a mensagem o token já está pronto.

---

## Stack

- **Node.js** + Express
- **Evolution API** — integração com WhatsApp
- **Puppeteer** — login automático no portal Ticket (Azure B2C + MFA)
- **ImapFlow** — leitura do código de verificação direto do Gmail
- **node-cron** — renovação de token e reauth preventivo
- **PM2** — processo contínuo na VPS

---

## Configuração

### 1. Clone e instale

```bash
git clone https://github.com/lucascriado/ticket2zap.git
cd ticket2zap
npm install
```

### 2. Variáveis de ambiente

Copie o `.env.example` e preencha:

```bash
cp .env.example .env
```

| Variável | Descrição |
|---|---|
| `TICKET_EMAIL` | E-mail da conta Ticket Restaurante |
| `TICKET_PASSWORD` | Senha da conta Ticket Restaurante |
| `TICKET_CARD_ID` | ID do cartão ativo |
| `X_USER_ID` | ID do usuário na API Edenred |
| `GMAIL_APP_PASSWORD` | [Senha de app do Google](https://myaccount.google.com/apppasswords) (para ler o código MFA) |
| `B2C_TENANT` | Tenant do Azure B2C |
| `B2C_POLICY` | Policy do Azure B2C |
| `B2C_CLIENT_ID` | Client ID do Azure B2C |
| `EVOLUTION_URL` | URL da sua instância Evolution API |
| `EVOLUTION_API_KEY` | API key da Evolution |
| `EVOLUTION_INSTANCE` | Nome da instância WhatsApp |
| `WEBHOOK_URL` | URL pública deste servidor (ex: `https://seudominio.com/webhook`) |
| `PORT` | Porta do servidor (padrão: `3000`) |

> `TICKET_ACCESS_TOKEN`, `TICKET_TOKEN_EXPIRES_AT` e `B2C_SSO_COOKIE` são gerenciados automaticamente pelo servidor — não precisa preencher manualmente.

### 3. Rodando

**Desenvolvimento:**
```bash
npm run dev
```

**Produção (PM2):**
```bash
pm2 start src/index.js --name ticket2zap
pm2 save
```

---

## Autenticação automática

O servidor cuida do token sem intervenção manual:

| Job | Frequência | O que faz |
|---|---|---|
| `TokenRefreshJob` | A cada 30 min | Silent renewal via SSO cookie |
| `MidnightReauth` | Todo dia 00:00 | Login completo com Puppeteer + MFA |

Quando o `silentRenewal` falha com `interaction_required`, o `getAccessToken` aciona o reauth completo automaticamente, sem derrubar a requisição.

---

## Rotas

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/webhook` | Recebe eventos do WhatsApp (Evolution API) |
| `GET` | `/card/balance` | Retorna saldo em JSON (uso interno) |

---

## Comandos no WhatsApp

| Comando | Resposta |
|---|---|
| `/ticket saldo` | Saldo atual do cartão |
| `/ticket extrato` | Últimas 15 movimentações |
