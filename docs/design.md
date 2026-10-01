# Design

Referência: o site do blog (Tailwind v4 + coss ui sobre Base UI). Interface limpa, neutra e moderna, com um único acento índigo. Pixel art só no mundo e nos Avatares; a interface nunca usa fonte pixelada.

## Stack visual

- **Tailwind v4** (`@tailwindcss/vite`), tokens em `apps/web/src/globais.css`.
- **coss ui** (Base UI + `cva`): componentes copiados em `apps/web/src/components/ui/` (Button, Input, InputGroup, Field, Form, Tabs, Toggle, ToggleGroup, Toolbar, Tooltip, Menu, Dialog, AlertDialog, Sheet, Toast, Empty, Avatar, Badge, Kbd, Alert, Skeleton, Spinner, Separator, ScrollArea). Use esses antes de inventar markup; `cn()` em `src/lib/utils.ts`.
- Peças próprias do Baguin em `src/components/`: `cabecalho` (cabeçalho, `Pagina`, `Topo`, `BotaoTema`), `marca`, `avatar-mini`, `capa-espaco`, `estado-pagina`, `erro`, `carregando`.
- `.pnpmfile.cjs` tira o `jiti` dos peers do vite: sem isso o pnpm duplica o `@colyseus/core` ao instalar o Tailwind e o matchmaking quebra.

## Tema

- Claro por padrão, sem seguir o sistema. Botão no cabeçalho (e na tela de entrar) alterna a classe `.dark` em `<html>`; escolha em `localStorage["baguin-tema"]` (com try/catch). O `index.html` aplica a classe antes da primeira pintura, sem flash. A troca desliga transições por dois quadros (`data-trocando-tema`).
- Tokens (mesma estrutura do blog): `background` neutral-100 / quase preto, `foreground`, `card` e `popover` (mistura com branco), `muted`, `accent` (preto/branco a 5-8%), `border` (8% / 7%), `input`, `ring`, `primary`, `destructive`, `success`, `warning`, `info`.
- Primário: índigo `oklch(0.585 0.2 277)` no claro, `oklch(0.63 0.2 277)` no escuro. Texto sobre ele é branco.
- Raio base `0.625rem` (`--radius`); controles `rounded-lg`, cards e diálogos `rounded-2xl`, capas `rounded-xl`, HUD em pílula.
- Tipografia: **Geist** (UI), títulos `font-semibold` com `tracking-[-0.03em]`, descrições em `text-muted-foreground`. **Inter** só é carregada para os textos do Phaser (`rotulos.ts`).

## Páginas

- Cabeçalho: `sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md`, altura `h-16`, marca à esquerda, tema e menu da conta (Avatar + nome) à direita. Largura única `CONTENEDOR` (`max-w-6xl px-4 sm:px-6`).
- `Topo`: brilho radial da cor primária (`color-mix` em `oklch`), título, descrição e ação. Versão `compacto` no editor.
- Cards de Espaço: a capa leva a moldura (`CapaEspaco`: mini cômodo em 3/4 tingido por um matiz estável do id, com três Avatares de exemplo) e o texto fica solto embaixo.
- Estados vazios e de erro usam `Empty` (`EstadoPagina` para a página inteira); erros inline usam `Erro` (Alert).
- **Editor de Avatar** (a parte favorita, preservada): prévia grande pixelada num palco pastel com sombra no chão, direção em `ToggleGroup`, Girar/Andar em `Toggle`; categorias com miniaturas renderizadas pelo próprio renderizador como tiles selecionáveis (`ToggleGroup`), amostras de cor com anel, escolha atual ao lado do título; Aleatório e Salvar sempre à vista (barra fixa no celular, prévia fixa no topo).

## Mundo (HUD sobre o Phaser)

Mesma linguagem, flutuando: `VIDRO` = `border bg-background/80 backdrop-blur-md shadow-lg shadow-black/10`, funciona nos dois temas.

- Topo à esquerda: pílula com voltar, Espaço › Lugar e `Badge` do Ambiente.
- Embaixo ao centro: `Toolbar` (microfone, Não perturbe | Balão, Membros, Convites) com `Tooltip` e `Kbd` para atalhos.
- Painéis (Membros, Convites): `Sheet` à direita, `modal={false}` e sem fundo escurecido, então o mundo continua clicável; Esc fecha só quando nenhum menu, diálogo ou o campo de Balão tratou a tecla.
- Ações de Membro em `Menu`; remover e banir em `AlertDialog`; "Sem conexão" e "Outra aba" em `AlertDialog` sem saída por Esc.
- Avisos e conexão em `Toast` (topo, centralizado). O campo de Balão é um `InputGroup` acima da barra.

## Movimento

- Curva padrão `cubic-bezier(0.23, 1, 0.32, 1)` (`ease-smooth`, também `--default-transition-timing-function`). Nunca `ease-in`, nunca `transition-all`: sempre propriedades específicas.
- Entrada e saída por `data-starting-style` / `data-ending-style` do Base UI (interrompíveis): diálogo e painel 200ms, popover, menu e tooltip 150ms, toast 250ms. Nada passa de 250ms na interface.
- Botões e toggles: `active:scale-[0.97]`. Hover só dentro de `@media (hover: hover)` (o `hover:` do Tailwind v4 já faz isso).
- Entradas partem de `scale-98` ou de deslocamento curto + opacidade, nunca de `scale-0`.
- Ações de teclado não animam: o campo de Balão abre na hora com Enter.
- `prefers-reduced-motion`: as transições de entrada/saída caem para ~0ms e o feedback de pressionar some.

## Mundo (Phaser)

- Perspectiva 3/4: paredes com face frontal de 1 tile, piso com textura sutil, sombras suaves sob móveis, paleta pastel e clara.
- Etiqueta de nome acima do Avatar (pílula escura translúcida, Inter 600, bolinha de status), Balão branco com cauda, rótulo de Zona em pílula clara.
