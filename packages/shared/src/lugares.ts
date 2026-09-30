export const TILE = 32;
export const VELOCIDADE = 160; // px/s

export type Ambiente = "foco" | "resenha";
export type Template = "sala" | "escritorio" | "terraco";
export const TEMPLATES: readonly Template[] = ["sala", "escritorio", "terraco"];
export const AMBIENTES: readonly Ambiente[] = ["foco", "resenha"];

export type Zona = { nome: string; tipo: "comum" | "reuniao" };
export type Porta = { destino: Template; chegada: { col: number; lin: number } };

export type TemplateLugar = {
  nome: string;
  /** '#' parede, 'M' Móvel que bloqueia, '.' chão, '1'-'9' porta, 'a'-'z' chão de Zona */
  mapa: readonly string[];
  portas: Readonly<Record<string, Porta>>;
  zonas: Readonly<Record<string, Zona>>;
  ambientePadrao: Ambiente;
  spawn: { col: number; lin: number };
  /** Lugar aberto: mostra o Clima direto (uso futuro). */
  aberto: boolean;
};

export const TEMPLATES_LUGAR: Readonly<Record<Template, TemplateLugar>> = {
  sala: {
    nome: "Sala",
    mapa: [
      "##############1###############",
      "#............................#",
      "#..MMM..................MMM..#",
      "#..MMM..................MMM..#",
      "#............................#",
      "#........MMMMMMMMMM..........#",
      "#........aaaaaaaaaa..........#",
      "#........aaaaaaaaaa..........#",
      "#............................#",
      "#............................#",
      "#............................2",
      "#............................#",
      "#............................#",
      "#..M......................M..#",
      "#..M......................M..#",
      "#............................#",
      "#............................#",
      "#......MMMM........MMMM......#",
      "#............................#",
      "##############################",
    ],
    portas: {
      "1": { destino: "escritorio", chegada: { col: 14, lin: 18 } },
      "2": { destino: "terraco", chegada: { col: 1, lin: 10 } },
    },
    zonas: { a: { nome: "Sofá", tipo: "comum" } },
    ambientePadrao: "resenha",
    spawn: { col: 14, lin: 12 },
    aberto: false,
  },
  escritorio: {
    nome: "Escritório",
    mapa: [
      "##############################",
      "#............................#",
      "#..aaaaaa...bbbbbb...rrrrrrr.#",
      "#..aMMMMa...bMMMMb...rMMMMMr.#",
      "#..aMMMMa...bMMMMb...rMMMMMr.#",
      "#..aaaaaa...bbbbbb...rrrrrrr.#",
      "#............................#",
      "#............................#",
      "#.MMMM..................MMMM.#",
      "#............................#",
      "#............................#",
      "#............................#",
      "#............................#",
      "#............................#",
      "#............................#",
      "#............................#",
      "#............................#",
      "#............................#",
      "#............................#",
      "##############1###############",
    ],
    portas: {
      "1": { destino: "sala", chegada: { col: 14, lin: 1 } },
    },
    zonas: {
      a: { nome: "Mesa 1", tipo: "comum" },
      b: { nome: "Mesa 2", tipo: "comum" },
      r: { nome: "Reunião", tipo: "reuniao" },
    },
    ambientePadrao: "foco",
    spawn: { col: 14, lin: 16 },
    aberto: false,
  },
  terraco: {
    nome: "Terraço",
    mapa: [
      "##############################",
      "#............................#",
      "#..MM..................MM....#",
      "#............................#",
      "#............................#",
      "#............................#",
      "#............................#",
      "#............................#",
      "#............aaaaa...........#",
      "#............aMMMa...........#",
      "1............aMMMa...........#",
      "#............aMMMa...........#",
      "#............aaaaa...........#",
      "#............................#",
      "#............................#",
      "#............................#",
      "#..MM..................MM....#",
      "#............................#",
      "#............................#",
      "##############################",
    ],
    portas: {
      "1": { destino: "sala", chegada: { col: 28, lin: 10 } },
    },
    zonas: { a: { nome: "Roda", tipo: "comum" } },
    ambientePadrao: "resenha",
    spawn: { col: 3, lin: 10 },
    aberto: true,
  },
};

export function ehTemplate(v: unknown): v is Template {
  return typeof v === "string" && v in TEMPLATES_LUGAR;
}

/** Centro do tile em px. */
export const centroTile = (col: number, lin: number) => ({
  x: col * TILE + TILE / 2,
  y: lin * TILE + TILE / 2,
});

const charEm = (t: Template, col: number, lin: number): string | undefined =>
  TEMPLATES_LUGAR[t].mapa[lin]?.[col];

// Caixa de colisão nos pés do Avatar, relativa ao ponto (x, y).
const MEIA_CAIXA = 10;

function tileBloqueia(t: Template, col: number, lin: number): boolean {
  const c = charEm(t, col, lin);
  return c === undefined || c === "#" || c === "M";
}

export function bloqueado(t: Template, x: number, y: number): boolean {
  const cantos = [
    [x - MEIA_CAIXA, y - MEIA_CAIXA],
    [x + MEIA_CAIXA, y - MEIA_CAIXA],
    [x - MEIA_CAIXA, y + MEIA_CAIXA],
    [x + MEIA_CAIXA, y + MEIA_CAIXA],
  ];
  return cantos.some(([cx, cy]) => tileBloqueia(t, Math.floor(cx / TILE), Math.floor(cy / TILE)));
}

/** Letra da Zona sob o ponto, ou null. */
export function zonaEm(t: Template, x: number, y: number): string | null {
  const c = charEm(t, Math.floor(x / TILE), Math.floor(y / TILE));
  return c !== undefined && c >= "a" && c <= "z" ? c : null;
}

/** Porta sob o ponto (dígito + destino), ou null. */
export function portaEm(t: Template, x: number, y: number): (Porta & { digito: string }) | null {
  const c = charEm(t, Math.floor(x / TILE), Math.floor(y / TILE));
  if (c === undefined || c < "1" || c > "9") return null;
  const porta = TEMPLATES_LUGAR[t].portas[c];
  return porta ? { ...porta, digito: c } : null;
}
