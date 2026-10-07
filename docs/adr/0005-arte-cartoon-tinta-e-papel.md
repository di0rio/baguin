# 0005 — Arte em cartoon de tinta e papel, desenhada por código

## Status

Aceito — 2026-10-07

## Contexto

O Baguin nasceu em pixel art (Avatar de 24×32 px, mapa e Móveis pintados pixel a pixel por código) com uma interface neutra de acento índigo. O dono do projeto tem uma marca pessoal, a cd: um boneco de contorno preto grosso e recheio branco, amarelo `#FFD23F` só como destaque, fonte Ubuntu. Ele quer que o Baguin tenha a cara dessa marca, com Avatares cabeçudos no espírito de Don't Starve Together. Não há artista nem orçamento para assets, e toda a arte atual já é gerada por código.

## Decisão

Avatar, mapa e Móveis passam a ser cartoon vetorial de traço grosso, desenhados por código (`Path2D`), em duas tintas: papel (branco) e tinta (preto). O mundo ganha profundidade com tons de papel, não com cor nem hachura. Amarelo fica reservado para o que está ativo ou dá para usar. O Baguin mantém nome e logo próprios e herda o sistema visual da cd (marca endossada, "feito por cd").

- Cada Peça tem forma e Preenchimento (papel, tinta ou estampa). O rosto é sempre papel. Não existe mais cor de pele, cabelo ou roupa.
- No escuro (noite ou Luz apagada) só o cenário escurece. Avatares e Móveis mantêm o Preenchimento e ganham contorno externo de papel, como a versão invertida da logo.

## Alternativas consideradas

- **Cor chapada em tudo, com contorno grosso**: mantém o catálogo de cores, mas vira cartoon genérico e a marca sobra só no traço.
- **Mundo neutro com Avatares em cor**: gente salta da tela e o tom de pele continua existindo. Recusado porque limitar o boneco a duas tintas é o que mais aproxima da marca.
- **Negativo total no escuro**: mais simples, mas o Preenchimento é a identidade do Avatar ("a de cabelo preto") e não pode depender de quem olha.
- **Manter pixel art e trocar só a interface**: barato, mas a marca é o personagem, e ele não cabe em 24×32 px.
- **Assets desenhados à mão**: não há quem desenhe, e Peças combináveis em várias vistas multiplicam o trabalho.

## Consequências

- Reescrita de `renderizar.ts`, `mapa.ts` e `moveis.ts` (cerca de 2500 linhas de desenho). Colisão, tiles, Zonas e protocolo não mudam.
- O esquema de Peças perde os índices de cor e ganha Preenchimento e rosto. Avatares salvos precisam de migração.
- Sem cor, Avatares se distinguem por forma, Preenchimento e estampa: o catálogo de formas precisa crescer.
- Tom de pele deixa de ser representado. É uma perda assumida.
- Estados que hoje usam cor (bolinha verde, amarela e vermelha, emoji colorido) passam para a Expressão e para ícones de traço.
- O canvas deixa de usar `image-rendering: pixelated` e zoom inteiro.
