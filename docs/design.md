# Design

Referência principal: Gather (gather.town/pt/virtual-office). Visual agradável, moderno, claro e aconchegante — pixel art só no mundo e nos Avatares; a interface é limpa, sem fonte pixelada.

## Tipografia

- **Inter** (Google Fonts, 400/500/600/700) em toda a interface e nos textos desenhados no Phaser (etiquetas de nome, Balões, rótulos de Zona). Nada de Pixelify Sans / Press Start.
- Tracking por tamanho: títulos ≥ 24px `-0.02em`, display ≥ 40px `-0.03em`, corpo `0`, rótulos pequenos (≤ 12px, caixa alta) `+0.02em`.
- Leading: títulos 1.1, corpo 1.5. Hierarquia por peso + tamanho, não só tamanho.

## Cores

Páginas (tema claro, padrão):

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#F7F5F4` | fundo quente off-white |
| `--superficie` | `#FFFFFF` | cards, painéis |
| `--texto` | `#292D4C` | texto principal (azul-marinho) |
| `--texto-2` | `#6B6F8E` | texto secundário |
| `--borda` | `#E8E4E1` | bordas sutis |
| `--primaria` | `#4A55E6` | botões, links, foco |
| `--primaria-hover` | `#3E48D2` | |
| `--sucesso` | `#2FB67C` | online, ok |
| `--aviso` | `#F5A524` | ausente |
| `--perigo` | `#E5484D` | remover, banir, Não perturbe |

Chrome dentro do mundo (flutua sobre o mapa): fundo `rgba(28, 30, 44, 0.78)` + `backdrop-filter: blur(16px) saturate(160%)`, texto branco, borda `1px rgba(255,255,255,0.08)`, sombra `0 8px 24px rgba(20,20,40,0.18)`. Com `prefers-reduced-transparency`, fundo sólido `#1C1E2C`.

## Forma

- Raio: botões e inputs 10px, cards 16px, pílulas 999px, painéis laterais 16px.
- Inputs e botões com altura 44px. Foco visível: anel `0 0 0 3px rgba(74,85,230,0.25)`.
- Ícones: `lucide-react`, 18–20px, traço 2. Sem emoji como ícone de interface (emoji só em conteúdo: Balão, Indicador sobre o Avatar se fizer sentido).

## Movimento

- Curvas: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`. Nunca `ease-in`, nunca `transition: all`.
- Durações: pressionar 120ms, hover/cor 150ms, popover/menu 180ms, painel lateral 240ms (entra e sai pela direita), modal 220ms, toast 240ms.
- Botões: `:active { transform: scale(0.97) }`. Hover só com `@media (hover: hover) and (pointer: fine)`.
- Entrada nunca de `scale(0)`: `scale(0.96)` + opacidade. Popover escala a partir do gatilho; modal fica centralizado.
- Sem animação em ação de teclado (abrir o campo de Balão com Enter é instantâneo).
- Só `transform` e `opacity`. Transições CSS (interrompíveis) em vez de keyframes para UI que abre/fecha rápido.
- `prefers-reduced-motion`: trocar deslocamento por fade curto.

## Mundo (Phaser)

- Perspectiva 3/4 como o Gather: paredes com face frontal de 1 tile (topo escuro + face clara + rodapé), piso com textura sutil, sombras suaves sob móveis.
- Paleta pastel e clara: madeira clara, piso cinza-claro, carpete lavanda, grama viva. Nada de marrom escuro chapado.
- Móveis desenhados de verdade (sofá, mesa de centro, TV, estante, plantas, mesas com monitor e cadeira, mesa de reunião, bebedouro, luminária, mesa de piquenique, luzinhas).
- Etiqueta de nome **acima** do Avatar: pílula escura translúcida, Inter 600, bolinha de status (verde online, amarelo ausente, vermelho Não perturbe). Indicador de atividade integrado à pílula.
- Balão: bolha branca com cauda, sombra suave, Inter 500, texto `#292D4C`.
- Rótulo de Zona: pílula translúcida clara sobre o chão da Zona.
