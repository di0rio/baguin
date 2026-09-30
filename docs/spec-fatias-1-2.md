# Spec — Fatias 1 (Chegar e conversar) e 2 (Moderação)

Fonte de verdade para implementação. Vocabulário: [CONTEXT.md](../CONTEXT.md). Stack: [stack.md](stack.md).

## Objetivo

Rodar tudo **local, sem nenhuma conta em serviço externo**, e virar produção só trocando variáveis de ambiente:

| Serviço | Local (padrão) | Produção (só env) |
|---|---|---|
| Banco | PGlite em `apps/server/.data/pglite` | `DATABASE_URL` (Neon) → driver `postgres` (postgres-js) |
| Login | Login de desenvolvimento (e-mail + senha) quando `AUTH_DEV_LOGIN=true` | `DISCORD_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET` |
| Voz | `livekit-server --dev` em `ws://localhost:7880`, chaves `devkey`/`secret` | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |

Provedores sociais só aparecem na tela de login se as credenciais existirem (`GET /api/config`).

## Convenções

- TypeScript estrito em tudo. `typescript@^5.9`.
- **Termos de domínio em português, exatamente como no CONTEXT.md** (`Espaco`, `Lugar`, `Membro`, `Convite`, `Zona`, `Alcance`, `Balao`, `NaoPerturbe`, `Papel`...). Termos técnicos em inglês (`handler`, `token`, `schema`). Sem acento em identificadores.
- Código simples, sem abstração especulativa. Comentário só onde o porquê não é óbvio.
- Validação de entrada da API com `zod`.
- Não gravar estado em tempo real (posição, atividade) no banco.

## Estrutura

```
apps/server     Node: Colyseus 0.18 (defineServer) + Express (hook `express`) + Better Auth + Drizzle
apps/web        Vite + React 19 + react-router + Phaser 4 + @colyseus/sdk + livekit-client
packages/shared Tipos, catálogo de Peças, templates de Lugar, regras de conversa (puro TS, sem DOM, sem Node)
scripts/        livekit-dev.sh (baixa livekit-server para tools/ se faltar e roda --dev)
```

Dev: `pnpm dev` na raiz sobe server (:2567) e web (:5173). Vite faz proxy de `/api` → `http://localhost:2567` (cookies de sessão ficam same-origin). O cliente Colyseus conecta direto em `VITE_COLYSEUS_URL` (padrão `http://localhost:2567`) e se autentica por **ingresso** (token), não por cookie.

## Modelo de dados (Drizzle)

Tabelas do Better Auth (`user`, `session`, `account`, `verification`) — `user` é a **Conta**. Mais:

- `avatar` — `contaId` (PK, FK user), `pecas` (jsonb, tipo `Pecas` do shared), `atualizadoEm`
- `espaco` — `id`, `nome`, `criadoEm`
- `lugar` — `id`, `espacoId`, `template` (`sala` | `escritorio` | `terraco`), `nome`, `ambiente` (`foco` | `resenha`). Ao criar um Espaço, cria os 3 Lugares padrão.
- `membro` — PK (`espacoId`, `contaId`), `papel` (`dono` | `moderador` | null), `silenciadoAte` (timestamp null), `banido` (bool), `entrouEm`
- `convite` — `codigo` (PK, aleatório url-safe 10 chars), `espacoId`, `criadoPor`, `expiraEm`, `usosMax`, `usos`, `revogado`
- `bloqueio` — PK (`contaId`, `bloqueadoId`), `criadoEm`. Efeito sempre simétrico.

Migrações geradas com drizzle-kit e aplicadas no boot do servidor (migrator do pglite ou do postgres-js conforme o driver).

## API (`/api`, JSON, sessão Better Auth por cookie)

- `GET /api/config` → `{ provedores: ("discord"|"google")[], devLogin: boolean, livekitUrl: string }`
- `/api/auth/*` → Better Auth
- `GET /api/eu` → `{ conta: {id, nome, imagem}, avatar: Pecas | null }`
- `PUT /api/eu/avatar` body `Pecas` (validado contra o catálogo) → 204
- `GET /api/espacos` → Espaços dos quais a Conta é Membro (não banido)
- `POST /api/espacos` `{nome}` → cria Espaço + 3 Lugares; criador vira Membro com Papel `dono`
- `GET /api/espacos/:id` → `{ espaco, lugares, eu: {papel}, membros: [{contaId, nome, papel, silenciadoAte}] }` (só Membro)
- `POST /api/espacos/:id/convites` `{horas, usosMax}` (dono/moderador) → Convite
- `GET /api/espacos/:id/convites` (dono/moderador) → Convites ativos
- `DELETE /api/convites/:codigo` (dono/moderador) → revoga
- `GET /api/convites/:codigo` (público) → `{ espacoNome, valido }`
- `POST /api/convites/:codigo/aceitar` (logado) → vira Membro (erro se banido, expirado, revogado, esgotado); já Membro → ok idempotente
- `POST /api/espacos/:id/ingresso` → token de ingresso no Lugar `sala` no ponto de spawn
- `POST /api/espacos/:id/livekit-token` `{lugarId}` → `{ url, token }`; `canPublish=false` se silenciado
- Moderação (fatia 2):
  - `POST /api/espacos/:id/membros/:contaId/papel` `{papel: "moderador"|null}` (só dono)
  - `POST /api/espacos/:id/membros/:contaId/silenciar` `{minutos}` (dono/moderador; não pode em dono; moderador não silencia moderador)
  - `DELETE /api/espacos/:id/membros/:contaId` → Remover (mesma hierarquia)
  - `POST /api/espacos/:id/membros/:contaId/banir` (mesma hierarquia)
  - `POST /api/bloqueios/:contaId` / `DELETE /api/bloqueios/:contaId` → Bloquear/desbloquear (qualquer Conta)

Ações de moderação e bloqueio emitem eventos num bus em memória (`EventEmitter`) que as rooms do Colyseus escutam (processo único).

## Ingresso e passagem

Token HMAC (lib `jose`, segredo `BETTER_AUTH_SECRET`), validade 60 s, payload `{ contaId, espacoId, lugarId, x, y }`. Emitido pela API (entrada inicial) ou pela própria room ao usar uma porta (passagem). A room valida no `onAuth` e confere no banco que a Conta é Membro não banido.

## Lugares (packages/shared)

Templates como mapa de texto + metadados:

- Legenda: `#` parede, `M` Móvel que bloqueia, `.` chão, `1`–`9` porta (índice em `portas`), `a`–`z` chão pertencente a uma Zona.
- `portas: { [digito]: { destino: Template, chegada: {col, lin} } }` — chegada é um tile de chão livre ao lado da porta correspondente no destino.
- `zonas: { [letra]: { nome, tipo: "comum" | "reuniao" } }`
- `ambientePadrao`

Templates: `sala` (Resenha; sofá = Zona `a`; portas para escritório e terraço), `escritorio` (Foco; mesas = Zonas `a` e `b` comuns; `r` = Zona de reunião), `terraco` (Resenha, Lugar aberto; roda = Zona `a`). Mapas ~30×20 tiles, `TILE = 32`.

## Regras de conversa (packages/shared, usadas por cliente e servidor)

```
alcancePx(ambiente): foco = 3 tiles, resenha = 7 tiles
zonaEm(template, x, y): letra | null
podemSeOuvir(a, b, template, bloqueados):
  qualquer um em NaoPerturbe → false
  bloqueio em qualquer direção → false
  se algum está numa Zona → só se os dois estão na MESMA Zona
  senão → distância ≤ alcance
volume(a, b, template): mesma Zona → 1; senão 1 - dist/alcance (limitado a [0,1])
```

Sempre simétrico: `podemSeOuvir(a,b) === podemSeOuvir(b,a)`. Ter testes unitários (`vitest`) para isso.

## Room `lugar` (Colyseus)

- Uma room por (espacoId, lugarId). Clientes entram com `joinOrCreate("lugar", { ingresso })`; a room é filtrada por `lugarId` (use o mecanismo de filtro da 0.18 — confira na doc).
- Estado: `avatares: map<Avatar>`; `Avatar = { contaId, nome, pecas (string JSON), x, y, dir, movendo, atividade ("nenhuma"|"digitando"|"ausente"), naoPerturbe }`.
- Mesma Conta entrando de novo → derruba a conexão antiga.
- Mensagens cliente → servidor:
  - `mover {x, y, dir, movendo}` — servidor valida colisão e velocidade com orçamento de distância (acumula `VELOCIDADE*1.2*dt`, teto 0,5 s); rejeitado → envia `corrigir {x,y}` só pra esse cliente.
  - `porta` — se o Avatar está num tile de porta, responde `passagem { lugarId, ingresso }`.
  - `balao {texto}` (1–200 chars, trim) — entrega `balao {contaId, texto}` só para quem `podemSeOuvir` com o remetente (e o próprio). Silenciado → ignora.
  - `atividade {atividade}` e `naoPerturbe {ativo}`.
- Servidor → cliente: `bloqueios {contaIds}` (todos com bloqueio em qualquer direção com este cliente; reenviado quando muda), `moderacao {tipo: "silenciado"|"removido"|"banido", ate?}`.
- Remover/Banir → a room avisa e desconecta o cliente.

## Web

Rotas:
- `/entrar` — botões dos provedores de `/api/config`; formulário de dev login (cadastro + login) se `devLogin`.
- `/avatar` — editor de Avatar com pré-visualização animada (4 direções). Obrigatório na primeira vez.
- `/` — lista de Espaços + criar Espaço.
- `/convite/:codigo` — mostra o Espaço; exige login (volta pra cá depois); aceita e entra.
- `/e/:espacoId` — o mundo.

Avatar sem assets externos: **renderizador procedural** em pixel art (canvas 2D) que monta o spritesheet a partir das `Pecas` — 4 direções × 3 quadros de caminhada, quadro ~24×32 px, desenhado com escala inteira e `imageSmoothing` desligado. O mesmo renderizador serve o editor (React) e o Phaser (`textures.addSpriteSheet` a partir do canvas). Catálogo em `packages/shared`:

- `pele`: 6 tons
- `cabelo`: estilo (`careca`, `curto`, `moicano`, `longo`, `rabo`, `blackpower`) × 8 cores
- `roupa`: estilo (`camiseta`, `moletom`, `regata`) × 10 cores
- `calca`: 8 cores
- `acessorio`: `nenhum`, `oculos`, `bone`, `fone`, `chapeu`

Mundo (`/e/:espacoId`):
- Phaser desenha o Lugar (tiles com cores simples; Zonas com piso levemente diferente; portas visíveis), Avatares ordenados por y, nome sob o Avatar, câmera segue o próprio Avatar. Setas/WASD. Predição local do próprio Avatar; os outros interpolam.
- Andar sobre uma porta → `porta` → `passagem` → sai da room atual e entra na nova.
- HUD em React por cima: nome do Espaço e do Lugar; botões mic (ligado/mudo), Não perturbe; campo de Balão (Enter abre/envia, Esc fecha; enquanto focado, atividade `digitando` e teclas não movem o Avatar); painel de Membros com ações conforme Papel (Moderador, Silenciar, Remover, Banir) e Bloquear para todos; painel de Convites (dono/moderador): gerar, copiar link, revogar.
- Indicador de atividade acima do Avatar: 💬 digitando, 🔊 falando, 💤 ausente (5 min sem input ou aba oculta), 🔕 Não perturbe, 🔇 silenciado.
- Balão aparece acima do Avatar por 6 s.

Voz (LiveKit):
- Uma sala LiveKit por Lugar (`${espacoId}:${lugarId}`), identity = contaId.
- **Conectar só quando existe alguém com quem `podemSeOuvir`**; desconectar 30 s depois de não haver ninguém. Reconecta ao mudar de Lugar.
- `autoSubscribe: false`; a cada ~200 ms recalcula: assina o áudio de quem `podemSeOuvir`, desassina o resto, ajusta volume com `volume()`.
- Mic publicado quando conectado e não mudo; Não perturbe despublica.
- Sem LiveKit disponível → o mundo funciona sem voz e o HUD mostra "voz indisponível".

## Fora destas fatias

Câmera, Transmissão, Telão, Grade, Rádio, Quarto, Mural, Nível, Clima, Presença.

## Critérios de pronto

1. `pnpm install && pnpm dev` sobe tudo sem nenhuma variável de ambiente além do `.env.example` copiado.
2. Duas abas (duas Contas de dev): cadastro → Avatar → criar Espaço → gerar Convite → segunda Conta aceita → os dois se veem andando no mesmo Lugar, trocam Balões, atravessam portas.
3. Balão respeita Alcance/Zona/Não perturbe/Bloqueio.
4. Moderação: silenciar corta Balão; remover e banir derrubam e impedem volta pelo mesmo Convite (banir).
5. `pnpm typecheck` e `pnpm test` passam.
