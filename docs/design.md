# Design

Referência: cd/ui (cd-ui.vercel.app) e o site da cd (cauadiorio.vercel.app). Interface em tinta e papel, com um único acento amarelo, sobre Tailwind v4 e Base UI. Os Avatares são vetoriais, em duas tintas; a interface nunca usa fonte pixelada.

## Direção nova (decidida em 2026-10-07)

A interface (etapa 1 da ordem de entrega) e o Avatar (parte da etapa 2) estão no código e descritos nas seções de baixo. Esta seção guarda só o que ainda **não** foi implementado; cada parte sai daqui e substitui a seção correspondente quando a entrega entrar. Motivo e alternativas da arte na [ADR 0005](adr/0005-arte-cartoon-tinta-e-papel.md). Termos novos no [CONTEXT.md](../CONTEXT.md): Preenchimento, Expressão, Período, Luz, Deixa.

### Marca

- O logo do Baguin ainda é a carinha atual, só em tinta e papel. Falta redesenhá-lo no traço da cd (em aberto).
- Referências vivas: cd-ui.vercel.app e cauadiorio.vercel.app. O kit da marca (guia, SVGs, favicon) fica fora do repo.

### Mundo

- Período (dia, tarde, noite) em ciclo próprio, igual para todos, derivado do relógio do servidor. Padrão: 60 min (30 / 10 / 20), com transição lenta.
- Luz por Lugar: acesa deixa o Lugar claro como de dia; apagada segue o Período. Qualquer Membro mexe no interruptor (Móvel de parede), com trava de 2 s entre trocas. Lugar vazio volta para acesa, e o estado vive só na memória da room. Lugar aberto não tem interruptor: as `luzinhas` acendem sozinhas à noite.
- No escuro só o cenário muda (`#1C1C1C` e vizinhos), trocando a paleta única do mundo (`mundo/paleta.ts`, `usarPaleta`) e refazendo as texturas. Avatares e Móveis mantêm o Preenchimento, com contorno externo de papel.
- Deixa: só a tecla (`e`), sem texto, junto do Móvel alcançável, que ganha contorno amarelo. Um Móvel, um uso. No toque, o próprio Móvel é o alvo. O contorno amarelo já existe como gancho (`LugarScene.destacarMovel`); falta a noção de Móvel alcançável e a tecla.

### Movimento

- Deixa: entra com opacidade e escala de 0,96 a 1 em 160 ms, ease-out forte, a partir do lado do Móvel. Sai em 120 ms.
- O capricho fica no mundo: a Luz pisca uma vez e firma em menos de 200 ms, e os Avatares do Lugar arregalam o olho por meio segundo.

### Ordem de entrega

Antes da fatia 3 do roadmap.

1. ~~Interface: tokens, Ubuntu, cd/ui e HUD mínima.~~ Entregue.
2. Avatar e mundo cartoon juntos, com o Editor de Avatar novo e a migração das Peças. Avatar, Editor, migração e mundo entregues.
3. Expressão.
4. Período, Luz e Deixa.

### Em aberto

- Logo do Baguin no traço da cd.
- Diferença de Altura entre baixo e alto: no código é a do rascunho (pernas 28 / 36 / 46 e tronco 54 / 60 / 66 unidades), pequena.
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
- **Amarelo só em quatro casos**: ação principal (`Button variant="brand"`, uma por tela), estado ativo (microfone ligado, falando), Móvel alcançável (contorno amarelo no Móvel; só o gancho existe, a Deixa vem na etapa 4) e Zona onde você está (contorno e rótulo amarelos, já no mundo). Qualquer outro "ativo" (aba, toggle, tile escolhido) usa tinta cheia (`foreground`).
- Raio base `0.75rem` (`--radius`); botões e campos `--radius-button` / `--radius-field`, cards e diálogos `rounded-2xl`, HUD em pílula.
- Tipografia: **Ubuntu** (400, 500, 700) na interface e nos textos do Phaser, **Ubuntu Mono** (400, 700) em teclas (`Kbd`). Não existe peso 600: use `font-bold`. Títulos em minúsculas, escritos assim na cópia (não por `text-transform`, porque nome de Espaço e de Membro vem da pessoa e não pode ser alterado). Descrições em `text-muted-foreground`.
- Tom da interface fora do mundo: **alto na chegada** (Entrar, Convite, estados vazios e cards de Espaço) com a utilidade `tom-alto` (contorno de 2px em tinta, ou papel no escuro, e sombra dura amarela `4px 4px 0`), **baixo em formulário e lista** (borda fina, sem sombra).
- Marca: Baguin endossado pela cd. Assinatura "feito por" + boneco da cd (`Logo variant="mark"` do cd/ui) no rodapé das páginas e na tela de entrar (`Assinatura`); o boneco da cd só aparece ali.

## Páginas

- Cabeçalho: `sticky top-0 z-20 border-b bg-background` (sólido, sem blur), altura `h-16`, marca à esquerda, tema e menu da conta (Avatar + nome, `DropdownMenu`) à direita. Rodapé com a assinatura. Largura única `CONTENEDOR` (`max-w-6xl px-4 sm:px-6`).
- `Topo`: só tipografia (título em minúsculas, descrição e ação), sem brilho nem gradiente. Versão `compacto` no editor.
- Cards de Espaço (tom alto): `tom-alto` em volta da capa (`CapaEspaco`: mini cômodo em 3/4 em SVG, no traço do mundo (tinta e papel, sem matiz), com contorno de 2px em tinta e três Avatares de exemplo; o id só escolhe o espelhamento e o tapete) e do texto; sobem 2px no hover e afundam no clique.
- Entrar (tom alto): painel com a marca, o título e os Avatares de vitrine à esquerda (desktop); formulário num cartão `tom-alto` à direita, com `Tabs` para cadastrar/entrar e a assinatura no pé.
- Convite: cartão `tom-alto` com a capa do Espaço. Estados vazios e de erro de página usam `Empty` em `tom-alto` (`EstadoPagina` para a página inteira); erros inline usam `Erro` (Alert em linha de log: `[erro] mensagem`).
- Formulários: `Form` do cd (sem `schema` aqui): `onSubmit` recebe os valores já validados, não o evento.
- **Editor de Avatar** (a parte favorita, preservada): prévia grande e nítida (sem pixelar) num palco de papel `#F6F4EE` nos dois temas, com a sombra no próprio canvas; direção num `RadioGroup` do cd/ui; Girar/Andar em `Toggle` (ligado = tinta cheia); categorias (altura, cabelo, rosto, roupa, calça, acessório) com miniaturas renderizadas pelo próprio renderizador como tiles de `RadioGroup`, formas e Preenchimentos no mesmo tile, escolha atual ao lado do título; Aleatório e Salvar (amarelo) sempre à vista (barra fixa no celular, prévia fixa no topo). O `Radio` do cd é só a bolinha, então tile e aba usam o primitivo `Radio` do Base UI dentro do `RadioGroup` do cd (`Opcao` em `EditorAvatar.tsx`).

## Avatar

Cartoon cabeçudo (referência: Don't Starve Together): boneco de recorte em pé, vetorial, desenhado por código com `Path2D` em `apps/web/src/avatar/renderizar.ts`. Da referência ficam a proporção e o recorte; não ficam o traço rabiscado, a paleta sépia nem o clima sombrio. Duas tintas, papel `#FFF` e tinta `#000`, traço grosso, `lineJoin` e `lineCap` redondos. Sem `image-rendering: pixelated` e sem zoom inteiro no desenho. Proporção e traço vêm do rascunho [rascunhos/avatar.html](rascunhos/avatar.html), que é referência, não arte final. Motivo e alternativas na [ADR 0005](adr/0005-arte-cartoon-tinta-e-papel.md).

### Peças

Esquema em `packages/shared/src/pecas.ts` (`pecasSchema`, `CATALOGO`, `PECAS_PADRAO`). Não existe mais cor de pele, cabelo ou roupa.

```ts
{ altura: "baixo" | "medio" | "alto",
  cabelo: { estilo: espetado | redondo | longo | chanel | tigela | coque | moicano | careca, preenchimento: "papel" | "tinta" },
  roupa:  { preenchimento: papel | tinta | listra | bolinha | xadrez },
  calca:  { preenchimento: "papel" | "tinta" },
  rosto: sono | feliz | bravo | sorrisao | desconfiado | fofo,
  acessorio: nenhum | oculos | bone | fone | touca }
```

- Catálogo: 8 cabelos, 6 rostos, 4 acessórios (mais "nenhum") e as estampas listra, bolinha e xadrez, só na roupa.
- Padrão (`PECAS_PADRAO`): cabelo espetado em tinta, roupa listrada, calça em tinta, altura média e a cara de sono da marca.
- Rosto: sempre papel, e é Peça (olhos e boca). Cada rosto é `{ olhos, boca }` (`ROSTOS`) e `montarAvatar` aceita um rosto de fora, então a Expressão (etapa 3) troca só a boca ou os olhos sem mexer no esquema.
- Altura: a cabeça tem tamanho único; muda tronco (54 / 60 / 66), pernas (28 / 36 / 46) e, junto, os braços. A parte de cima desce ou sobe para o quadril ficar sobre as pernas.
- Tronco: bloco arredondado único com o Preenchimento da roupa (estampa recortada no bloco). Perna: tubo arredondado sem pé. Braço: igual à perna, cai reto colado ao tronco, sem mão, sempre papel.
- Acessório depende do cabelo: boné e touca trocam o cabelo pela versão de baixo do chapéu e escondem coque e moicano. O arco do fone acompanha a altura do cabelo e vira tubo claro (contorno mais miolo de papel) sobre cabelo em tinta. A cor do acessório é sempre o contrário da do cabelo; careca e moicano, que não têm cabelo liso, usam tinta.
- Migração: avatares salvos no formato antigo (`{ pele, cabelo: { estilo, cor }, roupa: { estilo, cor }, calca, acessorio }`) viram o novo por `migrarPecas`, de forma determinística, na leitura (`GET /api/eu` e entrada na room). O banco não é reescrito: a linha antiga é convertida a cada leitura até a próxima vez que a pessoa salva. Altura vira médio e rosto vira sono. Cabelo: curto → tigela, rabo → coque, blackpower → redondo, os outros iguais. Acessório: chapéu → touca. Pele e estilo de roupa somem. As cores antigas viram papel (claras) ou tinta (escuras ou saturadas) por tabela fixa. Índice fora da paleta ou formato desconhecido: `null` (a conta cai no editor).

### Desenho, vistas e marionete

- Tudo é desenhado em unidades (a tela de 240 de largura do rascunho). O Avatar inteiro ocupa um quadro de 27 × 32 px do mundo (`UNIDADE = 10` unidades por px, `FRAME_L`, `FRAME_A`), com a sola em `SOLA_Y` e a cabeça mais alta em `TOPO_Y`. O `escala` do `AvatarCanvas` é px de tela por px do mundo.
- `montarAvatar(pecas, vista)` é puro (testável sem canvas): devolve as partes na ordem de desenho (sombra, pernas, cabelo de trás, braços, tronco, cabeça), cada uma com suas formas, caixa e eixo de giro. `pintarAvatar` (canvas do DOM) e `renderizarParte` (textura de uma parte para o Phaser) só pintam.
- Vistas: frente, costas e lado, o lado esquerdo desenhado e o direito espelhado (`vistaDe`: baixo é frente, cima é costas, esquerda e direita são o lado). De costas o rosto some e a cabeça fica da cor do cabelo. De lado o rosto encolhe e vai para a frente, só uma orelha aparece, o tronco afina, e o braço e a perna de longe ficam atrás do tronco.
- Marionete (`poseDe(movimento, ms, vista)`): parado respira (tronco sobe 3 unidades em 1,6 s); andando alterna as pernas (de frente levantam 7 unidades, de lado giram em torno do quadril) e balança os braços, a 0,3 s; dançando (Gesto, ainda sem gatilho no mundo) inclina o tronco 5 graus para cada lado e ergue os braços de 40 a 75 graus, a 0,42 s. Com `prefers-reduced-motion` o Avatar parado não respira.
- Traço: 7 unidades; `ESPESSURA_MUNDO = 1,45` (45% mais grosso, para olheira e boca não sumirem) no mundo e nas miniaturas.
- Fora do mundo (`AvatarCanvas`): canvas nítido na densidade da tela, com recortes `corte` (corpo, cabeça, torso, pernas) para miniaturas e bolhas. `animado` liga a respiração, a caminhada e a dança; sem ele mostra a pose inicial.
- No mundo (`mundo/AvatarSprite.ts`): uma textura por parte e vista (6 px de textura por px do mundo, filtro linear), montadas na primeira vez que a vista aparece, em contêineres que o Phaser move e gira a cada quadro. A direita é a vista de lado com `scaleX = -1`. As texturas são soltas quando as Peças mudam.

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

Cartoon vetorial de tinta e papel, desenhado por código em canvas 2D (decisão na [ADR 0005](adr/0005-arte-cartoon-tinta-e-papel.md)). Perspectiva 3/4: paredes com face frontal de 1 tile, bases sólidas e colisão como antes.

- **Paleta única** (`mundo/paleta.ts`, objeto `MUNDO`): tinta `#000`, papel `#FFF`, parede `#FDFCFA` (o tom mais claro), chão creme `#F6F4EE`, `meio` `#EAE6DB` (faces em sombra, tapetes) e sombra chapada `#D8D4C6` (sombra no chão e topo das paredes), `fora` (fundo além do mapa) e o amarelo `#FFD23F`. O mundo não segue o tema da interface. O modo escuro do Período é outra paleta com as mesmas chaves (`usarPaleta`); quem desenha só lê `MUNDO`.
- **Traço** (`mundo/traco.ts`): `Caneta` com caixa, elipse, polígono, forma livre, `nuvem` (copas e moitas, contorno só em volta da união e sombra chapada embaixo à direita), linha fina e mancha chapada. Contorno `TRACO = 2` unidades do mundo (o mesmo contorno grosso do Avatar), marca de material `FINO = 1`. Sem cor, sem degradê e sem hachura: só três riscos de tábua (piso da Sala e deck), cruzinhas de ladrilho a cada quatro tiles (Escritório) e tufos de três risquinhos (Terraço). Sem tinta cheia em peça de várias partes (vira um bloco preto); tinta cheia só em peças de forma única, telas, vãos de porta e folhas escuras.
- **Chão e paredes** (`mundo/mapa.ts`): um canvas só para chão, tapetes, deck, caminho, paredes, decoração de parede (janela, quadro, relógio, lousa) e portas. Sombra chapada sob a parede do fundo e a da esquerda. O limite entre parede e chão é uma linha grossa interrompida nas portas. A sebe do Terraço é uma massa clara com moitas de 16 px no limite. Tapetes variam de padrão (pontos, zigue-zague, franjas, cruzes, losangos, tracejado) em vez de cor. O contorno tracejado fino de cada Zona fica no chão.
- **Móveis** (`mundo/moveis.ts`): cada peça é um canvas próprio ordenado por y (profundidade pela base, como antes). As variantes de cor viram Preenchimento (papel, papel em sombra ou tinta). `luzinhas` seguem piscando (alpha) no novo traço.
- **Resolução**: sem `pixelArt` e sem `image-rendering: pixelated`. O canvas do Phaser tem a densidade de pixels da tela (`Mundo.tsx`: `Scale.NONE`, tamanho em px de CSS vezes a densidade, ajustado por um `ResizeObserver`, estilo em px de CSS). O zoom da câmera é contínuo (`min(largura, altura) / 300`, entre 1 e 3). O cenário é desenhado em `resolucaoMundo = ceil(zoom * densidade)` px por unidade do mundo (de 1 a 4) e as texturas são refeitas quando esse valor muda (as antigas são podadas). Os textos usam a própria resolução (`resolucaoTexto`).
- **Rótulos** (`mundo/rotulos.ts`): adesivo, na língua da HUD. Papel com contorno de tinta de 1,5 px, sem pílula translúcida, sombra suave nem blur, Ubuntu (a etiqueta e o rótulo de porta em 700, o Balão em 500), tamanho constante na tela (~13 px, `escalaTexto`). Etiqueta de nome em pílula, com a marca de status em tinta (online: bolinha cheia; ausente: anel; Não perturbe: anel riscado) e o Indicador de atividade em emoji (sai com a Expressão, etapa 3); a do próprio Avatar tem contorno um pouco mais grosso. Balão com cauda no mesmo contorno. Rótulo de Zona e de porta em pílula pequena. Os textos esperam `document.fonts.load` de 500 e 700 antes de iniciar a sala.
- **Amarelo no mundo**: a Zona onde você está (`zonaEm`) ganha o rótulo amarelo e um contorno amarelo sobre uma linha de tinta no chão. O contorno amarelo do Móvel alcançável (`destacarMovel`, silhueta engordada do sprite) existe como gancho, sem chamador até a Deixa.
