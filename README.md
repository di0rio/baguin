# Baguin

Espaço virtual 2D pra galera: cada um com seu Avatar, andando pelos Lugares, conversando por voz de proximidade, trocando Balões. Vocabulário em [CONTEXT.md](CONTEXT.md), decisões em [docs/adr](docs/adr), stack em [docs/stack.md](docs/stack.md), roadmap em [docs/roadmap.md](docs/roadmap.md).

## Rodar local

Precisa de Node 22+ e pnpm 10. Nenhuma conta em serviço externo.

```bash
pnpm install
cp apps/server/.env.example apps/server/.env
pnpm dev
```

Abre http://localhost:5173. O `pnpm dev` sobe:

| Processo | Porta | O quê |
|---|---|---|
| web | 5173 | Vite + React + Phaser (faz proxy de `/api` pro server) |
| server | 2567 | API, login (Better Auth), rooms do Colyseus |
| livekit | 7880 | `livekit-server --dev`, baixado sozinho pra `tools/` na primeira vez |

Local, o banco é um PGlite em `apps/server/.data/` (apaga a pasta pra zerar) e o login é e-mail + senha de desenvolvimento.

Pra testar com duas pessoas: abre uma janela anônima, cadastra outra Conta, e aceita o Convite gerado no painel **Convites**.

## Trocar pras credenciais reais

Tudo é variável de ambiente em `apps/server/.env` (e `apps/web/.env` pro endereço do servidor de tempo real). Nenhuma troca exige mudar código.

| Serviço | Variáveis | Onde pegar |
|---|---|---|
| Banco (Neon) | `DATABASE_URL` | Painel do Neon → Connection string. As migrações rodam sozinhas no boot. |
| Discord | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | discord.com/developers → New Application → OAuth2. Redirect: `${BETTER_AUTH_URL}/api/auth/callback/discord` |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credenciais → ID do cliente OAuth (Web). Redirect: `${BETTER_AUTH_URL}/api/auth/callback/google` |
| LiveKit | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | LiveKit Cloud (dev) ou o teu `livekit-server` self-host na Oracle |
| Segredo | `BETTER_AUTH_SECRET` | Gera um: `openssl rand -base64 32` |
| Login de dev | `AUTH_DEV_LOGIN` | Deixa `false` em produção |
| Endereços | `BETTER_AUTH_URL`, `WEB_ORIGIN`, `VITE_COLYSEUS_URL` | URLs públicas do app web e do servidor |

Os botões de Discord e Google só aparecem na tela de entrada quando as duas variáveis do provedor existem.

## Produção

Web no Cloudflare Pages, servidor (API + Colyseus) numa VM da Oracle atrás de HTTPS.

- **Web (Cloudflare Pages)**: projeto com raiz em `apps/web`, build `pnpm --filter @baguin/web build`, saída `dist`. Defina a env `API_ORIGIN` (ex.: `https://api.exemplo.com`, a URL HTTPS do servidor): a Pages Function `apps/web/functions/api/[[path]].ts` repassa `/api/*` pra ela, então o navegador só enxerga a origem do Pages e os cookies de sessão ficam same-origin. O Pages já serve `index.html` nas rotas do app (sem `404.html`).
- **Servidor (Oracle VM)**: `pnpm --filter @baguin/server start` (já roda com `NODE_ENV=production`). Coloque atrás de HTTPS, por exemplo Caddy (`api.exemplo.com { reverse_proxy localhost:2567 }`), que também cobre o WebSocket do Colyseus.
- **`apps/server/.env`**:
  - `NODE_ENV=production` (o `start` já define; o servidor não sobe em produção com `BETTER_AUTH_SECRET` ausente, padrão ou com menos de 32 caracteres);
  - `BETTER_AUTH_SECRET`: gere com `openssl rand -base64 32`;
  - `AUTH_DEV_LOGIN=false`;
  - `BETTER_AUTH_URL` e `WEB_ORIGIN`: os dois iguais à origem do Pages (ex.: `https://baguin.pages.dev`). `WEB_ORIGIN` vira `trustedOrigins` do Better Auth e a checagem de `Origin` nas escritas em `/api` (outra origem leva 403);
  - `DATABASE_URL`: no Neon use a connection string **direta** (sem `-pooler`);
  - `LIVEKIT_*`: as chaves do teu LiveKit.
- **`VITE_COLYSEUS_URL`**: URL HTTPS do servidor (o SDK usa `wss`). É embutida no build do web: troque o valor e faça novo deploy.
- Callbacks sociais: `${BETTER_AUTH_URL}/api/auth/callback/<provedor>`, ou seja, no domínio do Pages.

## Comandos

```bash
pnpm dev          # tudo
pnpm typecheck    # tipos em todos os pacotes
pnpm test         # testes (regras de conversa, mapas, renderizador, voz)
pnpm livekit      # só o LiveKit local
pnpm --filter @baguin/server db:generate   # depois de mudar apps/server/src/db/schema.ts
pnpm --filter @baguin/server smoke         # smoke test das rooms (com o server rodando)
```

## Estrutura

```
apps/server      API, Better Auth, Drizzle, rooms do Colyseus (um Lugar = uma room)
apps/web         React (telas, HUD, editor de Avatar) + Phaser (mundo) + voz LiveKit
packages/shared  Catálogo de Peças, mapas dos Lugares, regras de conversa, protocolo
docs/            ADRs, stack, roadmap, spec
```
