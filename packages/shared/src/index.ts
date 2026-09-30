export const TILE = 32;
export const VELOCIDADE = 160; // px/s
export const PORTA_SERVIDOR = 2567;

// Mapa provisório da sala até os Lugares virem do Tiled.
// '#' parede, 'M' móvel que bloqueia, '.' chão
const SALA = [
  "##############################",
  "#............................#",
  "#..MMM..................MMM..#",
  "#..MMM..................MMM..#",
  "#............................#",
  "#............................#",
  "#.........MMMMMMMMM..........#",
  "#.........MMMMMMMMM..........#",
  "#............................#",
  "#............................#",
  "#............................#",
  "#............................#",
  "#..M......................M..#",
  "#..M......................M..#",
  "#..M......................M..#",
  "#............................#",
  "#............................#",
  "#......MMMM........MMMM......#",
  "#............................#",
  "##############################",
];

export const MAPA = SALA;
export const LARGURA = SALA[0].length * TILE;
export const ALTURA = SALA.length * TILE;
export const SPAWN = { x: 15 * TILE, y: 10 * TILE };

// Caixa de colisão nos pés do Avatar, relativa ao ponto (x, y).
const MEIA_CAIXA = 10;

function tileBloqueia(col: number, lin: number): boolean {
  const c = SALA[lin]?.[col];
  return c === undefined || c === "#" || c === "M";
}

export function bloqueado(x: number, y: number): boolean {
  const cantos = [
    [x - MEIA_CAIXA, y - MEIA_CAIXA],
    [x + MEIA_CAIXA, y - MEIA_CAIXA],
    [x - MEIA_CAIXA, y + MEIA_CAIXA],
    [x + MEIA_CAIXA, y + MEIA_CAIXA],
  ];
  return cantos.some(([cx, cy]) => tileBloqueia(Math.floor(cx / TILE), Math.floor(cy / TILE)));
}

export const DIRECOES = ["cima", "baixo", "esquerda", "direita"] as const;
export type Direcao = (typeof DIRECOES)[number];

export type MoverMsg = { x: number; y: number; dir: Direcao };
export type CorrigirMsg = { x: number; y: number };
export type EntrarOpcoes = { nome: string };
