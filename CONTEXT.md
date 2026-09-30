# Baguin

Ambiente virtual 2D compartilhado onde um grupo de pessoas convive com avatares personalizados: conversa, compartilha tela, ouve música junto e se diverte. Foco em lazer, não só trabalho. O centro é a conversa — jogos estão fora de escopo.

## Language

**Espaço**:
O mundo virtual de um grupo — o conjunto de lugares onde os membros daquele grupo se encontram. Na v1 existe um só, mas o modelo sempre assume vários.
_Avoid_: Servidor, workspace, mundo, instância

**Conta**:
A identidade de uma pessoa na plataforma, criada no cadastro e usada no login. Existe independente de qualquer Espaço.
_Avoid_: Usuário, perfil, player

**Membro**:
O vínculo de uma Conta com um Espaço. Uma Conta pode ser Membro de vários Espaços.
_Avoid_: Usuário, convidado, participante

**Convite**:
Link criado por Dono ou Moderador que permite a uma Conta virar Membro do Espaço. Tem validade e limite de usos e pode ser revogado.
_Avoid_: Link de acesso, invite, código

**Papel**:
O nível de permissão de um Membro num Espaço: **Dono** (quem criou; mexe em tudo e atribui Papéis), **Moderador** (edita os Lugares comuns) ou nenhum (Membro comum, edita só o próprio Quarto).
_Avoid_: Cargo, role, admin, permissão

## Avatar

**Avatar**:
O boneco 2D (pixel art, visto de cima) que representa uma Conta. Cada Conta tem exatamente um Avatar, e ele é o mesmo em todos os Espaços.
_Avoid_: Personagem, boneco, skin, sprite

**Peça**:
Uma camada visual que compõe o Avatar — corpo, cabelo, roupa, acessório. Um Avatar é uma combinação de Peças.
_Avoid_: Item, cosmético, camada

## Estrutura do Espaço

**Lugar**:
Uma área do Espaço com mapa próprio (sala de estar, cinema, bar, escritório, quarto). Lugares se ligam por portas; o Avatar está sempre em exatamente um Lugar.
_Avoid_: Sala, mapa, cena, room

**Quarto**:
O Lugar pessoal de um Membro, que só ele decora. Como pertence ao Membro, uma Conta tem um Quarto separado em cada Espaço. Pode ter mídia própria (Rádio, Telão, pôsteres), recebe visitas e pode ser trancado.
_Avoid_: Casa, sala pessoal, perfil

**Móvel**:
Objeto colocado num Lugar para decorar ou ter função (sofá, pôster, luminária, Telão).
_Avoid_: Item, objeto, decoração, prop

**Ambiente**:
O propósito de um Lugar (ex.: Foco, Resenha), escolhido ao criá-lo. Define as regras de convivência ali — alcance da conversa, música, status, visual.
_Avoid_: Modo, vibe, tipo de sala

**Clima**:
O tempo real (sol, chuva, nublado, dia/noite) da cidade escolhida para o Espaço. É o mesmo para todos os Membros e aparece nos Lugares abertos e pelas janelas dos fechados.
_Avoid_: Tempo, weather, ambiente (que é outra coisa)

**Selo de clima**:
Indicador opcional sobre o Avatar mostrando o clima da cidade de quem o controla. Ativado pela própria Conta.
_Avoid_: Badge, status de clima

## Conversa

**Alcance**:
A distância dentro da qual um Avatar ouve outro fora de uma Zona; o volume cai conforme se afastam. Definido pelo Lugar (via Ambiente) e igual para todos ali.
_Avoid_: Raio, proximidade, bolha

**Zona**:
Área marcada dentro de um Lugar (mesa, sofá, cabine) onde quem está dentro conversa só entre si, com volume cheio e isolado de fora. Uma Zona de reunião abre a Grade automaticamente para quem entra.
_Avoid_: Região (confunde com localização geográfica do Clima), sala privada, bolha

**Não perturbe**:
Estado individual em que a pessoa sai do Alcance de todos e deixa de ouvi-los — sempre simétrico, ninguém ouve quem não pode ouvi-lo. Aparece como Indicador de atividade.
_Avoid_: Modo silencioso, invisível, mute

**Câmera**:
Vídeo opcional de um Membro, mostrado numa bolinha sobre o Avatar para quem o ouve (mesmo Alcance ou mesma Zona).
_Avoid_: Webcam, vídeo, cam

**Grade**:
Visão que troca o mapa por um mosaico com as Câmeras de todos que estão conversando juntos, estilo videochamada. Abre sozinha numa Zona de reunião ou manualmente em qualquer conversa.
_Avoid_: Grid, galeria, modo reunião

**Indicador de atividade**:
Ícone sobre o Avatar mostrando o que a pessoa está fazendo agora — falando, compartilhando tela, ouvindo música, digitando, ausente.
_Avoid_: Status, badge

**Balão**:
Mensagem de texto que aparece por alguns segundos sobre o Avatar, vista só por quem o ouve (mesmo Alcance ou mesma Zona). Não fica guardada.
_Avoid_: Chat, mensagem, bolha

**Mural**:
Canal de texto persistente do Espaço para recados, links e memes, legível por qualquer Membro a qualquer hora. Um Quarto pode ter o seu.
_Avoid_: Chat, canal, feed, timeline

**Presença**:
O que a pessoa está fazendo fora do Baguin (codando numa IDE, jogando, ouvindo música), mostrado junto ao Avatar. Definida manualmente ou alimentada por uma Integração. Sempre opt-in; por padrão mostra só o nome do app.
_Avoid_: Rich presence, status externo, atividade (que é dentro do Baguin)

**Integração**:
Conexão ativada por uma Conta com um app externo (IDE, Spotify, Steam) que alimenta sua Presença automaticamente.
_Avoid_: Plugin, conector, extensão

## Música

**Rádio**:
A música compartilhada de um Lugar: uma fila coletiva de Faixas que todos ouvem sincronizadas, com volume individual e voto para pular. O Ambiente define se o Lugar tem Rádio.
_Avoid_: Player, DJ, playlist, jam

**Faixa**:
Uma música na fila da Rádio, adicionada por um Membro. Sempre toca a partir do YouTube; o Spotify serve para buscar e importar playlists, que viram Faixas do YouTube.
_Avoid_: Música, som, track

## Tela compartilhada

**Transmissão**:
A tela que um Membro compartilha. Por padrão é vista por quem o ouve (mesmo Alcance ou mesma Zona), numa janela flutuante.
_Avoid_: Screen share, compartilhamento, stream, live

**Telão**:
Objeto fixo no mapa de um Lugar (tela de cinema, monitor, TV) onde um Membro próximo projeta sua Transmissão para todo o Lugar ver.
_Avoid_: Tela, TV, projetor, monitor

## Progressão

**Conquista**:
Marco atingido por atividade (horas de resenha, Faixas na Rádio, presença num evento) que desbloqueia Peças ou Móveis especiais.
_Avoid_: Achievement, troféu, badge, medalha

**Nível**:
Medida de progresso de uma Conta (uma só, válida em todos os Espaços) que desbloqueia Peças e Móveis em patamares. Sobe só com atividade real — falar, pôr Faixa, estar em Zona com gente; ficar parado não conta.
_Avoid_: Level, rank, XP (XP é o que alimenta o Nível, não o Nível)

**Inventário**:
As Peças e Móveis que uma Conta possui além do catálogo básico.
_Avoid_: Mochila, coleção, bag

## Interação entre Avatares

**Gesto**:
Animação que um Avatar faz sozinho — dançar, acenar, sentar ou deitar num Móvel. Alguns são desbloqueados por Nível.
_Avoid_: Emote, animação, ação

**Interação**:
Animação entre dois ou mais Avatares (high five, abraço, brinde, dança sincronizada). Só acontece se todos os envolvidos aceitarem.
_Avoid_: Emote em dupla, ação social

**Título**:
Rótulo exibido junto ao Avatar. **Título de trabalho** (Developer, CEO) é escolhido pela própria pessoa e aparece em Lugares de Foco; **Título de resenha** (o mais resenhudo, DJ da galera) é ganho por estatística ou votação, é rotativo e aparece em Lugares de Resenha. A pessoa pode esconder qualquer Título. Não confere permissão — isso é Papel.
_Avoid_: Tag, cargo, badge, apelido

## Moderação

**Silenciar**:
Ação de Dono ou Moderador que corta mic e Balão de um Membro por tempo determinado.
_Avoid_: Mutar, castigo, timeout

**Remover**:
Ação de Dono ou Moderador que tira um Membro do Espaço; ele pode voltar com um novo Convite.
_Avoid_: Kick, expulsar

**Banir**:
Ação de Dono ou Moderador que impede uma Conta de voltar a ser Membro daquele Espaço.
_Avoid_: Ban permanente, bloquear (que é individual)

**Bloquear**:
Ação individual de um Membro contra outro: os dois deixam de se ouvir, ver os Balões e interagir. Sempre simétrico e sem envolver moderação.
_Avoid_: Ignorar, silenciar (que é de moderação), banir
