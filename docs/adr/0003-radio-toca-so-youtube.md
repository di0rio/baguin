# 0003 — Rádio toca sempre pelo YouTube; Spotify só busca e importa

## Status

Aceito — 2026-09-30

## Contexto

A Rádio de um Lugar precisa tocar a mesma Faixa, sincronizada, para todos os presentes. O Spotify só permite reprodução via web para contas Premium, e seus termos de API têm restrições de uso.

## Decisão

Toda Faixa é reproduzida a partir do YouTube. O Spotify entra como Integração para buscar músicas e importar playlists; ao adicionar, a Faixa é convertida para o equivalente no YouTube.

## Alternativas consideradas

- **Reproduzir pelo Spotify para quem tem Premium, YouTube para o resto**: melhor qualidade para alguns, mas duas fontes dessincronizam e às vezes tocam versões diferentes.
- **Só Spotify**: exclui quem não tem Premium e depende de termos restritivos.

## Consequências

- Sincronia simples: uma fonte, um relógio.
- Ninguém precisa de assinatura para participar.
- Quem tem Premium não usa a qualidade do Spotify dentro da Rádio. Reprodução híbrida pode vir depois se houver demanda.
