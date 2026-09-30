# 0002 — Cliente só web; Presença por Integrações, sem app desktop

## Status

Aceito — 2026-09-30

## Contexto

A Presença mostra o que a pessoa faz fora do Baguin (ex.: "codando no Cursor", "ouvindo Spotify"). O jeito mais automático de capturar isso — como o Discord faz — é um app desktop lendo a janela ativa do sistema.

## Decisão

O Baguin roda só no navegador. A Presença vem de duas fontes: escolha manual e Integrações opt-in por app (extensão para Cursor/VS Code, API do Spotify, depois Steam etc.). Por padrão exibe só o nome do app; nome de projeto/arquivo apenas se a Conta ativar.

## Alternativas consideradas

- **App desktop lendo a janela ativa**: detecta qualquer programa, mas exige cliente por sistema operacional, instalação, atualização e acesso invasivo à máquina.
- **Só manual**: trivial, mas a Presença fica desatualizada e perde a graça.

## Consequências

- Entrar no Baguin é abrir um link — zero instalação.
- Só aparecem apps que têm Integração; cada nova Integração é trabalho separado.
- Um cliente desktop pode ser adicionado no futuro sem mudar o conceito de Presença.
