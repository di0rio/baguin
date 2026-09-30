# 0004 — Construir do zero, sem fork de clone do Gather

## Status

Aceito — 2026-09-30

## Contexto

Existem clones abertos do Gather. WorkAdventure é maduro e ativo, mas grande, com licença não detectada pelo GitHub (a verificar; historicamente com restrição comercial) e modelo de domínio diferente do nosso. SkyOffice é pequeno e MIT, mas usa voz/vídeo P2P que não escala para 30 pessoas e tem manutenção esparsa.

## Decisão

Construir do zero em TypeScript, apoiado em bibliotecas maduras para as partes difíceis (engine 2D, servidor de mídia, sincronização em tempo real). SkyOffice serve apenas como referência de leitura.

## Alternativas consideradas

- **Fork do WorkAdventure**: muito pronto, mas conceitos como Ambiente, Rádio sincronizada, Quarto e Clima brigariam com a arquitetura; licença é risco para a futura plataforma aberta.
- **Fork do SkyOffice**: simples e MIT, mas a camada de mídia teria que ser trocada de cara.

## Consequências

- O modelo de domínio (CONTEXT.md) manda no código, sem adaptar conceitos alheios.
- Mais trabalho inicial para chegar no "Gather mínimo" (fatia 1).
- Sem dependência de licença de terceiros para o núcleo.
