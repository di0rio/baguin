# Design

Referência: cd/ui (cd-ui.vercel.app) e o site da cd (cauadiorio.vercel.app). Interface em tinta e papel, com um único acento amarelo, sobre Tailwind v4 e Base UI. Pixel art só no mundo e nos Avatares; a interface nunca usa fonte pixelada.

## Direção nova (decidida em 2026-10-07)

A interface (etapa 1 da ordem de entrega) está no código e descrita nas seções de baixo. Esta seção guarda só o que ainda **não** foi implementado; cada parte sai daqui e substitui a seção correspondente quando a entrega entrar. Motivo e alternativas da arte na [ADR 0005](adr/0005-arte-cartoon-tinta-e-papel.md). Termos novos no [CONTEXT.md](../CONTEXT.md): Preenchimento, Expressão, Período, Luz, Deixa.

### Marca

- O logo do Baguin ainda é a carinha atual, só em tinta e papel. Falta redesenhá-lo no traço da cd (em aberto).
- Referências vivas: cd-ui.vercel.app e cauadiorio.vercel.app. O kit da marca (guia, SVGs, favicon) fica fora do repo.

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
- Zona onde você está ganha o amarelo (um dos quatro casos da regra do amarelo, ver Tema).
- Balão, etiqueta de nome e rótulo de Zona (desenhados em canvas, `mundo/rotulos.ts`) ainda têm a pílula translúcida com sombra suave. Passam para a língua da HUD (sólido, contorno, sem sombra suave) junto com o mapa cartoon. A fonte deles já é Ubuntu.

### Movimento

- Deixa: entra com opacidade e escala de 0,96 a 1 em 160 ms, ease-out forte, a partir do lado do Móvel. Sai em 120 ms.
- O capricho fica no mundo: a Luz pisca uma vez e firma em menos de 200 ms, e os Avatares do Lugar arregalam o olho por meio segundo.

### Ordem de entrega

Antes da fatia 3 do roadmap.

1. ~~Interface: tokens, Ubuntu, cd/ui e HUD mínima.~~ Entregue.
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
- **cd/ui** (Base UI + `cva` + lucide), registry shadcn em `https://cd-ui.vercel.app/r/<nome>.json`. Os arquivos ficam copiados em `apps/web/src/components/ui/`, com os imports reescritos para relativos (o projeto não tem alias `@`: `@/registry/cd/lib/utils` vira `../../lib/utils` e `@/registry/cd/ui/x` vira `./x`). Para atualizar um componente, baixe o JSON de novo e repita essa troca. Em uso: Alert, Avatar, Badge, Button (e `button-variants`), Dialog, DropdownMenu, Field, Form (valida com `zod/v4/core`, por isso o `zod` está no web), Input, Kbd, Logo, RadioGroup, Separator, Skeleton, Spinner, Tabs, Toast, Tooltip. Use esses antes de inventar markup; `cn()` em `src/lib/utils.ts`.
- Ajustes locais em arquivos do cd: o viewport do Toast sobe no celular (`max-sm:bottom-24`, para não cobrir a HUD) e o indicador do Tabs não desliza com movimento reduzido.
- Faltam no cd/ui e ficam como versão local (coss ui sobre Base UI, com os tokens do cd e um comentário no topo do arquivo): `sheet`, `alert-dialog`, `empty` e `toggle`. Devem nascer no cd/ui e migrar para lá.
- Saíram: Toolbar, ToggleGroup, ScrollArea, InputGroup, Textarea e o Menu do coss (virou DropdownMenu).
- `toastManager` (disparar toast fora de componente) em `src/lib/toast.ts`, passado ao `ToastProvider` em `main.tsx`.
- Peças próprias do Baguin em `src/components/`: `cabecalho` (cabeçalho, rodapé, `Pagina`, `Topo`, `BotaoTema`), `marca` (logo, `Marca`, `Assinatura`), `avatar-mini`, `capa-espaco`, `estado-pagina`, `erro`, `carregando`.
- `bunfig.toml` usa `linker = "hoisted"`: uma cópia só do `@colyseus/core`. Duas cópias quebram o matchmaking ("seat reservation expired").

## Tema

- Escuro por padrão, sem seguir o sistema. Botão no cabeçalho (e na tela de entrar) alterna a classe `.dark` em `<html>`; escolha em `localStorage["baguin-tema"]` (com try/catch; só `"light"` desliga o escuro). O `index.html` aplica a classe antes da primeira pintura, sem flash. A troca desliga transições por dois quadros (`data-trocando-tema`). O mundo não segue o tema: segue (no futuro) Período e Luz.
- Tokens do cd (`theme.json` do cd/ui): `background`, `foreground`, `card`, `popover`, `muted`, `accent`, `border`, `input`, `ring`, `destructive`, `success` e a trinca `brand` (amarelo `#FFD23F`), `brand-foreground` (texto amarelo legível no tema) e `brand-contrast` (tinta sobre o amarelo). Claro: fundo creme `#F6F4EE`, cartão `#FBFAF6`. Escuro: fundo `#1C1C1C`, cartão `#222220`. Não existem `primary`, `secondary`, `warning` nem `info`.
- Tinta `#000` e papel `#FFF` puros em `tinta` e `papel` (`bg-papel`, `border-tinta`): usados pela HUD em adesivo.
- **Amarelo só em quatro casos**: ação principal (`Button variant="brand"`, uma por tela), estado ativo (microfone ligado, falando), Móvel alcançável e Zona onde você está (os dois últimos chegam com o mundo cartoon). Qualquer outro "ativo" (aba, toggle, tile escolhido) usa tinta cheia (`foreground`).
- Raio base `0.75rem` (`--radius`); botões e campos `--radius-button` / `--radius-field`, cards e diálogos `rounded-2xl`, HUD em pílula.
- Tipografia: **Ubuntu** (400, 500, 700) na interface e nos textos do Phaser, **Ubuntu Mono** (400, 700) em teclas (`Kbd`). Não existe peso 600: use `font-bold`. Títulos em minúsculas, escritos assim na cópia (não por `text-transform`, porque nome de Espaço e de Membro vem da pessoa e não pode ser alterado). Descrições em `text-muted-foreground`.
- Tom da interface fora do mundo: **alto na chegada** (Entrar, Convite, estados vazios e cards de Espaço) com a utilidade `tom-alto` (contorno de 2px em tinta, ou papel no escuro, e sombra dura amarela `4px 4px 0`), **baixo em formulário e lista** (borda fina, sem sombra).
- Marca: Baguin endossado pela cd. Assinatura "feito por" + boneco da cd (`Logo variant="mark"` do cd/ui) no rodapé das páginas e na tela de entrar (`Assinatura`); o boneco da cd só aparece ali.

## Páginas

- Cabeçalho: `sticky top-0 z-20 border-b bg-background` (sólido, sem blur), altura `h-16`, marca à esquerda, tema e menu da conta (Avatar + nome, `DropdownMenu`) à direita. Rodapé com a assinatura. Largura única `CONTENEDOR` (`max-w-6xl px-4 sm:px-6`).
- `Topo`: só tipografia (título em minúsculas, descrição e ação), sem brilho nem gradiente. Versão `compacto` no editor.
- Cards de Espaço (tom alto): `tom-alto` em volta da capa (`CapaEspaco`: mini cômodo em 3/4 tingido por um matiz estável do id, com três Avatares de exemplo) e do texto; sobem 2px no hover e afundam no clique.
- Entrar (tom alto): painel com a marca, o título e os Avatares de vitrine à esquerda (desktop); formulário num cartão `tom-alto` à direita, com `Tabs` para cadastrar/entrar e a assinatura no pé.
- Convite: cartão `tom-alto` com a capa do Espaço. Estados vazios e de erro de página usam `Empty` em `tom-alto` (`EstadoPagina` para a página inteira); erros inline usam `Erro` (Alert em linha de log: `[erro] mensagem`).
- Formulários: `Form` do cd (sem `schema` aqui): `onSubmit` recebe os valores já validados, não o evento.
- **Editor de Avatar** (a parte favorita, preservada): prévia grande pixelada num palco `bg-muted` com sombra chapada no chão; direção num `RadioGroup` do cd/ui; Girar/Andar em `Toggle` (ligado = tinta cheia); categorias com miniaturas renderizadas pelo próprio renderizador como tiles de `RadioGroup`, amostras de cor também em `RadioGroup` com anel na ativa, escolha atual ao lado do título; Aleatório e Salvar (amarelo) sempre à vista (barra fixa no celular, prévia fixa no topo). O `Radio` do cd é só a bolinha, então tile, amostra e aba usam o primitivo `Radio` do Base UI dentro do `RadioGroup` do cd (`Opcao` em `EditorAvatar.tsx`).

## Mundo (HUD sobre o Phaser)

HUD mínima, em `src/mundo/hud/`. Fixos na tela só **o microfone e a pílula de local**.

- Superfície (`HUD` em `superficie.ts`): segue o tema. Claro: adesivo, papel com contorno de tinta de 1,5 px. Escuro: sólido `#1C1C1C` com borda clara de 1,5 px. Sem vidro, blur nem sombra suave. Painéis, menus e o campo de Balão usam a mesma superfície.
- Topo à esquerda: pílula com voltar, Espaço › Lugar e `Badge` do Ambiente.
- Embaixo ao centro: microfone e, ao lado, o botão de menu, numa pílula só. Microfone ligado fica amarelo (estado ativo); falando ganha um contorno amarelo em volta; o ponto verde mostra a voz conectada. Teclas apertadas afundam a 0,97 em 100 ms.
- Menu (`DropdownMenu`, abre também com a tecla **M**): Não perturbe (item marcável), Membros (com a contagem do Lugar) e Convites (só Dono e Moderador). Com Não perturbe ligado o botão de menu mostra um selo.
- O Balão abre com **Enter**, sem botão; Enter envia e Esc fecha. O campo é uma pílula acima dos controles, com a dica de teclas.
- Painéis (Membros, Convites): `Sheet` à direita, `modal={false}` e sem fundo escurecido, então o mundo continua clicável. Esc fecha o painel, menos quando o campo de Balão já tratou a tecla (o Base UI para a propagação do Esc, então a decisão está no `onOpenChange` do Sheet).
- Ações de Membro em `DropdownMenu`; remover e banir em `AlertDialog`; "Sem conexão" e "Outra aba" em `AlertDialog` sem saída por Esc.
- Avisos e conexão em `Toast`. No desktop ficam no canto inferior direito (padrão do cd); no celular sobem para não cobrir os controles.
- Atalhos do mundo: setas/WASD movem, Enter abre o Balão, M abre o menu, Esc fecha.

## Movimento

- Tokens do cd: `--cd-duration-instant/fast/base/slow` = 80 / 120 / 160 / 240 ms (utilidades `duration-instant`, `duration-fast`, `duration-base`, `duration-slow`) e `--cd-ease-out` `cubic-bezier(0.23, 1, 0.32, 1)` (`ease-out`, também o padrão de `transition`). Nunca `ease-in`, nunca `transition-all`: sempre propriedades específicas, e só `transform` e `opacity` nas animações de entrada e saída.
- Popups (menu, tooltip, diálogo, alert dialog) usam a utilidade `cd-popup`: entram de `scale(0.96)` + opacidade a partir do gatilho (`--transform-origin`) em 160 ms e saem em 120 ms; o tooltip parte de 0,75 e o seguinte aparece sem animação. Sheet entra por opacidade + deslocamento de 1rem. Interrompíveis (`data-starting-style` / `data-ending-style` do Base UI).
- Botões e opções: `active:scale-[0.98]` em 80 ms (Toggle e opções do editor 0,97); os controles da HUD afundam a 0,97 em 100 ms. Hover só dentro de `@media (hover: hover)` (o `hover:` do Tailwind v4 já faz isso).
- Entradas partem de `scale-96` ou de deslocamento curto + opacidade, nunca de `scale-0`.
- Ações de teclado não animam: o campo de Balão abre na hora com Enter.
- `prefers-reduced-motion`: `--cd-scale-enter` vira 1 e as durações caem para um fade curto (80 a 120 ms), então os popups só mudam de opacidade; o feedback de pressionar usa `motion-safe:` e some. Toast e indicador de Tabs não deslizam.

## Mundo (Phaser)

- Perspectiva 3/4: paredes com face frontal de 1 tile, piso com textura sutil, sombras suaves sob móveis, paleta pastel e clara.
- Etiqueta de nome acima do Avatar (pílula escura translúcida, Ubuntu 700, bolinha de status), Balão branco com cauda, rótulo de Zona em pílula clara. Os textos usam Ubuntu (`rotulos.ts`, que espera `document.fonts.load` de 500 e 700 antes de iniciar a sala).
