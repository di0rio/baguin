# 0001 — Espaço como unidade central desde a v1

## Status

Aceito — 2026-09-30

## Contexto

A v1 atende um único grupo fechado (5–30 pessoas). No futuro a ideia é virar plataforma aberta, onde qualquer pessoa cria seu próprio Espaço e convida gente (modelo Gather).

## Decisão

Todo dado (mapas, membros, conteúdo, permissões) pertence a um Espaço desde o primeiro dia, mesmo existindo só um na v1. Não há estado "global" fora de um Espaço.

## Alternativas consideradas

- **App de grupo único, sem noção de Espaço**: mais simples agora, mas migrar depois para multi-Espaço exige reescrever modelo de dados, permissões e rotas.
- **Plataforma aberta já na v1**: multiplica o escopo (cadastro público, moderação, cobrança, custo de mídia) antes de validar se a experiência é divertida.

## Consequências

- Custo pequeno agora (um identificador de Espaço em tudo).
- Abrir para vários grupos vira questão de UI/onboarding, não de reescrita.
