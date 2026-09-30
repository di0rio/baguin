# Baguin

Ambiente virtual 2D para um grupo conversar, ver e ouvir coisas junto. Glossário em `CONTEXT.md` (use exatamente esses termos no código), decisões em `docs/adr/`, stack em `docs/stack.md`, spec atual em `docs/spec-fatias-1-2.md`.

- Monorepo pnpm: `apps/server`, `apps/web`, `packages/shared`.
- `pnpm dev` sobe tudo; `pnpm typecheck` e `pnpm test` precisam passar.
- Termos de domínio em português sem acento nos identificadores (`Espaco`, `Lugar`, `Membro`); termos técnicos em inglês.
- Local não depende de serviço externo: PGlite, login de dev e `livekit-server --dev`. Produção só troca env.
- Estado em tempo real vive na memória das rooms, nunca no banco.
