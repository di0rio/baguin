# Design

Referência: o site do blog (Tailwind v4 + coss ui sobre Base UI). Interface limpa, neutra e moderna, com um único acento índigo. Pixel art só no mundo e nos Avatares; a interface nunca usa fonte pixelada.

## Direção nova (decidida em 2026-10-07, ainda não implementada)

O restante deste documento descreve o que está no código hoje. Esta seção registra a repaginada combinada; cada parte substitui a seção correspondente quando a entrega entrar. Motivo e alternativas da arte na [ADR 0005](adr/0005-arte-cartoon-tinta-e-papel.md). Termos novos no [CONTEXT.md](../CONTEXT.md): Preenchimento, Expressão, Período, Luz, Deixa.

### Marca

- Baguin é marca endossada pela cd: nome e logo próprios, redesenhados no traço da cd, com a assinatura "feito por cd" no rodapé e na tela de entrar. O boneco da cd só aparece na assinatura.
- Referências vivas: cd-ui.vercel.app e cauadiorio.vercel.app. O kit da marca (guia, SVGs, favicon) fica fora do repo.
- Tokens: tinta `#000000`, papel `#FFFFFF`, fundo `#1C1C1C`, amarelo `#FFD23F`. Papel creme `#F6F4EE` e cartão `#FBFAF6` / `#222220`, como nos sites.
- Tipografia: Ubuntu na interface e nos textos do mundo (saem Geist e Inter), Ubuntu Mono em teclas. Títulos em minúsculas.
- Amarelo só em quatro casos: ação principal, estado ativo (microfone ligado, falando), Móvel alcançável e Zona onde você está.

### Avatar

- Cartoon cabeçudo (referência: Don't Starve Together): boneco de recorte em pé, com animação de marionete no lugar dos três quadros. Da referência ficam a proporção e o recorte; não ficam o traço rabiscado, a paleta sépia nem o clima sombrio.
- Duas tintas. Cabelo, roupa e calça escolhem o Preenchimento: papel, tinta ou estampa (listra, bolinha). O rosto é sempre papel.
- O rosto é Peça (olhos e boca), com a cara de sono da marca como padrão, e reage ao estado (Expressão): a boca mexe ao falar, o Avatar dorme quando ausente e fica de zíper na boca enquanto sofre Silenciar. O Indicador de atividade em ícone fica só para digitando, Transmissão, Rádio e Não perturbe.
- O Editor de Avatar troca as amostras de cor por forma, Preenchimento e estampa, e ganha a categoria rosto.

Base aprovada no rascunho interativo [rascunhos/avatar.html](rascunhos/avatar.html). É referência de proporção e traço, não arte final.

- Cabeça de tamanho único para todos. Só a Altura muda (baixo, médio, alto), mexendo em tronco, pernas e braços.
- Tronco é um bloco arredondado único com o Preenchimento da roupa, sem camisa por cima nem manga.
- Perna é um tubo arredondado, sem pé nem sapato.
- Braço é igual à perna: mesmo tubo, mesma grossura e mesmo comprimento. Cai reto, colado ao tronco, sem mão separada e sem dedo. No rascunho é sempre papel.
- Marionete: parado respira, andando alterna as pernas e balança os braços, e o Gesto de dançar inclina o tronco e levanta os braços.
- Acessório depende do cabelo. Boné e touca trocam o cabelo por uma versão de baixo do chapéu (tufos de lado, volume estufado, cabelo caindo) e escondem coque e moicano. O arco do fone acompanha a altura do cabelo e vira tubo claro sobre cabelo em tinta. A cor do acessório é sempre o contrário da do cabelo.
- No tamanho do mundo o traço é desenhado mais grosso em proporção (45% no rascunho), senão olheira e boca somem.
- Estampas do rascunho: listra, bolinha e xadrez. Bolinha e xadrez ainda viram ruído em tamanho pequeno.

### Mundo

- Mapa e Móveis no mesmo traço, em tons de papel: parede mais clara, chão creme, sombra chapada mais escura. Marca de material em traço fino e rara (três riscos de tábua, não o piso inteiro). Hachura só em uso pontual.
- Período (dia, tarde, noite) em ciclo próprio, igual para todos, derivado do relógio do servidor. Padrão: 60 min (30 / 10 / 20), com transição lenta.
- Luz por Lugar: acesa deixa o Lugar claro como de dia; apagada segue o Período. Qualquer Membro mexe no interruptor (Móvel de parede), com trava de 2 s entre trocas. Lugar vazio volta para acesa, e o estado vive só na memória da room. Lugar aberto não tem interruptor: as `luzinhas` acendem sozinhas à noite.
- No escuro só o cenário muda (`#1C1C1C` e vizinhos). Avatares e Móveis mantêm o Preenchimento, com contorno externo de papel.
- Deixa: só a tecla (`e`), sem texto, junto do Móvel alcançável, que ganha contorno amarelo. Um Móvel, um uso. No toque, o próprio Móvel é o alvo.

### Interface

- Componentes: cd/ui no lugar de coss ui, páginas de entrada incluídas. Faltam no cd/ui e nascem lá: `sheet`, `alert-dialog`, `empty` e `toggle`. `toolbar`, `toggle-group`, `scroll-area` e `input-group` deixam de ser necessários (HUD mínima, Radio Group no editor, markup simples).
- Tema claro ou escuro é escolha da pessoa, com escuro como padrão. O mundo não segue o tema: segue Período e Luz.
- HUD mínima: fixos só o microfone e a pílula de local. Não perturbe, Membros e Convites ficam num menu ao lado do microfone, com atalho. O Balão abre com Enter, sem botão.
- A HUD segue o tema: no escuro, sólido escuro com borda clara de 1,5 px; no claro, adesivo (papel com contorno de tinta). Sem vidro, blur ou sombra suave. Balão, etiqueta de nome e rótulo de Zona na mesma língua.
- Fora do mundo: tom alto na chegada (Entrar, Convite, estados vazios e cards de Espaço, com contorno grosso e sombra dura amarela) e baixo em formulário e lista.

### Movimento

- Deixa: entra com opacidade e escala de 0,96 a 1 em 160 ms, ease-out forte, a partir do lado do Móvel. Sai em 120 ms.
- Tecla apertada: efeito imediato, sem animação de interface. A tecla afunda (escala 0,97, 100 ms).
- O capricho fica no mundo: a Luz pisca uma vez e firma em menos de 200 ms, e os Avatares do Lugar arregalam o olho por meio segundo.
- Durações nos tokens do cd/ui (80, 120, 160 e 240 ms). Só `transform` e `opacity`. Movimento reduzido cai para opacidade.

### Ordem de entrega

Antes da fatia 3 do roadmap.

1. Interface: tokens, Ubuntu, cd/ui e HUD mínima.
2. Avatar e mundo cartoon juntos, com o Editor de Avatar novo e a migração das Peças.
3. Expressão.
4. Período, Luz e Deixa.

### Em aberto

- Logo do Baguin no traço da cd.
- Catálogo final de formas, estampas e rostos. O rascunho tem 8 cabelos, 6 rostos e 4 acessórios.
- Braço sempre papel, como no rascunho, ou seguindo o Preenchimento da roupa.
- Quantas vistas o Avatar tem (frente, costas, lado espelhado). O rascunho só tem a de frente.
- Diferença de Altura entre baixo e alto, pequena no rascunho.
- Duração final do ciclo do Período.

## Stack visual

- **Tailwind v4** (`@tailwindcss/vite`), tokens em `apps/web/src/globais.css`.
- **coss ui** (Base UI + `cva`): componentes copiados em `apps/web/src/components/ui/` (Button, Input, InputGroup, Field, Form, Tabs, Toggle, ToggleGroup, Toolbar, Tooltip, Menu, Dialog, AlertDialog, Sheet, Toast, Empty, Avatar, Badge, Kbd, Alert, Skeleton, Spinner, Separator, ScrollArea). Use esses antes de inventar markup; `cn()` em `src/lib/utils.ts`.
- Peças próprias do Baguin em `src/components/`: `cabecalho` (cabeçalho, `Pagina`, `Topo`, `BotaoTema`), `marca`, `avatar-mini`, `capa-espaco`, `estado-pagina`, `erro`, `carregando`.
- `bunfig.toml` usa `linker = "hoisted"`: uma cópia só do `@colyseus/core`. Duas cópias quebram o matchmaking ("seat reservation expired").

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
