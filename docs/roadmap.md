# Roadmap

Fatias em ordem de construção. Cada uma é usável sozinha pela galera. Termos seguem o [CONTEXT.md](../CONTEXT.md).

1. **Chegar e conversar** — Conta, Avatar (catálogo básico de Peças), Espaço, Convite, Lugares com portas, voz por Alcance e Zona, Balão, Indicador de atividade, Não perturbe.
2. **Moderação** — Papéis (Dono, Moderador), Silenciar, Remover, Banir, Bloquear.
3. **Ver junto** — Câmera, Transmissão, Telão, Grade (Zona de reunião + botão manual).
4. **Ouvir junto** — Rádio, Faixa (YouTube), busca/importação via Spotify.
5. **Morar** — Quarto, Móveis, Mural (do Espaço e do Quarto), edição de Lugares comuns por Moderador.
6. **Progredir** — Nível, Conquista, Inventário, Gestos, Interações, Títulos.
7. **Mundo real** — Clima, Selo de clima, Presença, Integrações (Cursor/VS Code, Spotify).

## Repaginada visual

Entra antes da fatia 3, para Câmera, Telão e Grade não serem desenhados duas vezes. Direção em [design.md](design.md) e [ADR 0005](adr/0005-arte-cartoon-tinta-e-papel.md).

1. **Interface** — tokens da marca cd, Ubuntu, cd/ui, HUD mínima.
2. **Avatar e mundo cartoon** — Avatar cabeçudo em tinta e papel, Preenchimento, rosto como Peça, mapa e Móveis em tons de papel.
3. **Expressão**.
4. **Período, Luz e Deixa**.

## Restrições

- **Orçamento zero.** Toda infra precisa caber em plano gratuito ou hospedagem própria. LiveKit Cloud free (5.000 min de conexão/mês, 50GB) não comporta uso diário do grupo — serve só para desenvolvimento.

## Fora de escopo

- Jogos.
- Plataforma aberta (qualquer um cria Espaço) — futuro; o modelo já suporta (ADR 0001).
- App desktop (ADR 0002).
- Reprodução pelo Spotify na Rádio (ADR 0003).
- Avatar expressivo por rastreamento facial.
