export const TILE = 32;
export const VELOCIDADE = 160; // px/s

export type Ambiente = "foco" | "resenha";
export type Template = "sala" | "escritorio" | "terraco";
export const TEMPLATES: readonly Template[] = ["sala", "escritorio", "terraco"];
export const AMBIENTES: readonly Ambiente[] = ["foco", "resenha"];

export type Zona = { nome: string; tipo: "comum" | "reuniao" };
export type Porta = { destino: Template; chegada: { col: number; lin: number } };

/** Tipos de Móvel desenhados pelo web. Os que bloqueiam (ver `NAO_SOLIDOS`) viram 'M' no mapa. */
export type TipoMovel =
  | "estante" | "planta" | "arvore" | "sofa" | "poltrona" | "mesa-centro" | "mesa-lateral" | "tv" | "luminaria"
  | "bebedouro" | "bar" | "mesa-trabalho" | "cadeira" | "mesa-reuniao" | "mesa-piquenique" | "mesa-redonda" | "jardineira"
  | "puff" | "aparador" | "balcao" | "banqueta" | "banco" | "copiadora"
  | "tapete" | "deck" | "caminho" | "janela" | "quadro" | "relogio" | "lousa" | "luzinhas";

export type Movel = {
  tipo: TipoMovel;
  /** Canto superior esquerdo da pegada, em tiles. */
  col: number;
  lin: number;
  /** Tamanho da pegada em tiles. */
  larg: number;
  alt: number;
  /** Variação visual (cor, estilo); significado por tipo, só o web interpreta. */
  variante?: string;
};

/** Móveis que o Avatar atravessa: tapetes, chão, cadeiras, decoração de parede e luzinhas. */
export const NAO_SOLIDOS: ReadonlySet<TipoMovel> = new Set<TipoMovel>([
  "tapete", "deck", "caminho", "cadeira", "janela", "quadro", "relogio", "lousa", "luzinhas",
]);
/** Móveis pendurados na parede: a pegada fica sobre '#' (a face frontal da parede). */
export const TIPOS_PAREDE: ReadonlySet<TipoMovel> = new Set<TipoMovel>(["janela", "quadro", "relogio", "lousa"]);

export const movelSolido = (m: Movel) => !NAO_SOLIDOS.has(m.tipo);

const mv = (tipo: TipoMovel, col: number, lin: number, larg = 1, alt = 1, variante?: string): Movel => ({
  tipo, col, lin, larg, alt, ...(variante ? { variante } : {}),
});

export type TemplateLugar = {
  nome: string;
  /**
   * '#' parede, 'M' Móvel que bloqueia, '.' chão, '1'-'9' porta, 'a'-'z' chão de Zona.
   * Derivado de `moveis` (todo Móvel sólido vira 'M'), então colisão e desenho vêm da mesma fonte.
   */
  mapa: readonly string[];
  /** Móveis e decoração (o web desenha cada um; só os sólidos entram na colisão). */
  moveis: readonly Movel[];
  portas: Readonly<Record<string, Porta>>;
  zonas: Readonly<Record<string, Zona>>;
  ambientePadrao: Ambiente;
  spawn: { col: number; lin: number };
  /** Lugar aberto: mostra o Clima direto (uso futuro). */
  aberto: boolean;
};

type Retangulo = [col0: number, lin0: number, col1: number, lin1: number];

/** Monta o mapa ASCII: borda de parede, portas, retângulos de Zona e 'M' nas pegadas dos Móveis sólidos. */
function montarMapa(
  cols: number,
  lins: number,
  portas: Record<string, [number, number]>,
  zonas: Record<string, Retangulo>,
  moveis: readonly Movel[],
): string[] {
  const g: string[][] = Array.from({ length: lins }, (_, l) =>
    Array.from({ length: cols }, (_, c) => (l === 0 || c === 0 || l === lins - 1 || c === cols - 1 ? "#" : ".")),
  );
  for (const [letra, [c0, l0, c1, l1]] of Object.entries(zonas))
    for (let l = l0; l <= l1; l++) for (let c = c0; c <= c1; c++) g[l][c] = letra;
  for (const m of moveis) {
    if (!movelSolido(m)) continue;
    for (let l = m.lin; l < m.lin + m.alt; l++) for (let c = m.col; c < m.col + m.larg; c++) g[l][c] = "M";
  }
  for (const [d, [c, l]] of Object.entries(portas)) g[l][c] = d;
  return g.map((l) => l.join(""));
}

// ---- Sala: estar acolhedor (madeira clara), sofá + TV no centro, cantinhos nas laterais ----
const movelSala: Movel[] = [
  // parede do fundo
  mv("estante", 2, 1, 3), mv("planta", 5, 1, 1, 1, "monstera"), mv("luminaria", 6, 1),
  mv("janela", 8, 0, 2), mv("quadro", 11, 0, 1, 1, "a"), mv("relogio", 12, 0), mv("quadro", 19, 0, 1, 1, "b"),
  mv("janela", 21, 0, 2), mv("planta", 23, 1, 1, 1, "ficus"), mv("estante", 25, 1, 3), mv("planta", 28, 1, 1, 1, "palmeira"),
  // sala de TV (Zona "Sofá")
  mv("tapete", 8, 4, 12, 6, "lavanda"),
  mv("planta", 8, 4, 1, 1, "ficus"), mv("tv", 12, 4, 4), mv("luminaria", 19, 4),
  mv("poltrona", 9, 7, 1, 1, "dir"), mv("mesa-centro", 13, 7, 3), mv("poltrona", 18, 7, 1, 1, "esq"),
  mv("sofa", 11, 9, 5, 1, "costas"),
  // cantinho de leitura (esquerda)
  mv("tapete", 2, 9, 5, 4, "pessego"),
  mv("planta", 1, 8, 1, 1, "palmeira"), mv("poltrona", 3, 10, 1, 1, "dir"), mv("mesa-lateral", 4, 10), mv("poltrona", 5, 10, 1, 1, "esq"),
  mv("puff", 3, 12, 1, 1, "rosa"), mv("puff", 5, 12, 1, 1, "menta"), mv("luminaria", 1, 13),
  // bar (direita)
  mv("bar", 22, 4, 5), mv("banqueta", 23, 5), mv("banqueta", 25, 5), mv("bebedouro", 28, 4),
  // cantinho do sofá (direita, embaixo)
  mv("tapete", 21, 12, 7, 4, "verde"),
  mv("sofa", 22, 12, 4, 1, "frente"), mv("mesa-centro", 23, 14, 2), mv("poltrona", 22, 14, 1, 1, "dir"), mv("planta", 27, 13, 1, 1, "ficus"),
  // mesas redondas no meio-baixo
  mv("mesa-redonda", 10, 13, 2, 2), mv("mesa-redonda", 17, 13, 2, 2),
  // parte de baixo
  mv("aparador", 7, 17, 4), mv("aparador", 19, 17, 4), mv("planta", 5, 17, 1, 1, "samambaia"), mv("planta", 24, 17, 1, 1, "monstera"),
  mv("planta", 1, 5, 1, 1, "ficus"), mv("planta", 28, 8, 1, 1, "monstera"), mv("luminaria", 28, 15), mv("planta", 14, 17, 1, 1, "vaso"),
];

// ---- Escritório: piso cinza-claro, carpete lavanda nas Zonas ----
const CORES_CADEIRA = ["azul", "coral", "menta", "amarelo"];
/** Cadeiras de escritório viradas para a mesa, na fileira abaixo dela (vistas de costas). */
const cadeirasSul = (col: number, lin: number, n: number): Movel[] =>
  Array.from({ length: n }, (_, i) => mv("cadeira", col + i, lin, 1, 1, `costas-${CORES_CADEIRA[i % CORES_CADEIRA.length]}`));
const movelEscritorio: Movel[] = [
  // parede do fundo
  mv("janela", 3, 0, 2), mv("janela", 6, 0, 2), mv("quadro", 10, 0, 1, 1, "b"), mv("janela", 12, 0, 2), mv("janela", 15, 0, 2),
  mv("quadro", 19, 0, 1, 1, "a"), mv("lousa", 22, 0, 4), mv("planta", 1, 1, 1, 1, "ficus"), mv("planta", 10, 1, 1, 1, "samambaia"),
  mv("planta", 19, 1, 1, 1, "monstera"), mv("planta", 28, 1, 1, 1, "palmeira"),
  // Mesa 1
  mv("tapete", 3, 2, 6, 4, "lavanda"), mv("mesa-trabalho", 4, 3, 4, 2, "a"),
  mv("cadeira", 5, 2, 1, 1, "frente-azul"), mv("cadeira", 6, 2, 1, 1, "frente-coral"),
  ...cadeirasSul(4, 5, 4),
  // Mesa 2
  mv("tapete", 12, 2, 6, 4, "lavanda"), mv("mesa-trabalho", 13, 3, 4, 2, "b"),
  mv("cadeira", 14, 2, 1, 1, "frente-menta"), mv("cadeira", 15, 2, 1, 1, "frente-azul"),
  ...cadeirasSul(13, 5, 4),
  // Reunião
  mv("tapete", 21, 2, 7, 4, "lilas"), mv("mesa-reuniao", 22, 3, 5, 2),
  ...[22, 23, 24, 25, 26].map((c) => mv("cadeira", c, 2, 1, 1, "frente-azul")),
  ...[22, 23, 24, 25, 26].map((c) => mv("cadeira", c, 5, 1, 1, `costas-${CORES_CADEIRA[c % 4]}`)),
  // copa e arquivo
  mv("balcao", 2, 8, 4), mv("bebedouro", 6, 8), mv("estante", 25, 8, 4),
  // lounge (direita)
  mv("tapete", 19, 12, 9, 4, "rosa"), mv("sofa", 20, 12, 4, 1, "frente"), mv("mesa-centro", 21, 14, 2),
  mv("poltrona", 19, 14, 1, 1, "dir"), mv("poltrona", 24, 14, 1, 1, "esq"), mv("planta", 27, 12, 1, 1, "monstera"),
  // cantinho de puffs (esquerda)
  mv("tapete", 2, 12, 6, 5, "menta"), mv("puff", 3, 13, 1, 1, "azul"), mv("puff", 6, 13, 1, 1, "amarelo"),
  mv("puff", 4, 15, 1, 1, "rosa"), mv("mesa-lateral", 4, 13),
  // cantinho do café (centro)
  mv("tapete", 9, 9, 10, 4, "pessego"), mv("mesa-redonda", 10, 10, 2, 2), mv("mesa-redonda", 16, 10, 2, 2),
  mv("planta", 13, 9, 1, 1, "ficus"), mv("planta", 14, 12, 1, 1, "monstera"),
  // cantos
  mv("planta", 1, 17, 1, 1, "ficus"), mv("planta", 28, 17, 1, 1, "palmeira"), mv("copiadora", 25, 17),
  mv("planta", 11, 17, 1, 1, "vaso"), mv("planta", 17, 17, 1, 1, "vaso"), mv("planta", 8, 8, 1, 1, "samambaia"), mv("planta", 10, 6, 1, 1, "vaso"),
];

// ---- Terraço: grama, deck de madeira, árvores, luzinhas ----
const movelTerraco: Movel[] = [
  mv("caminho", 1, 10, 10, 1), mv("deck", 11, 6, 9, 9),
  mv("arvore", 3, 2), mv("arvore", 26, 2), mv("arvore", 27, 16), mv("arvore", 2, 16),
  mv("luzinhas", 3, 3, 24),
  mv("planta", 8, 2, 1, 1, "arbusto"), mv("planta", 21, 2, 1, 1, "arbusto"),
  mv("banco", 11, 4, 2), mv("banco", 18, 4, 2),
  mv("mesa-piquenique", 14, 9, 3, 3),
  mv("mesa-redonda", 5, 12, 2, 2), mv("mesa-redonda", 23, 12, 2, 2),
  mv("jardineira", 7, 16, 3), mv("jardineira", 20, 16, 3),
  mv("planta", 12, 16, 1, 1, "vaso"), mv("planta", 17, 16, 1, 1, "vaso"),
  // tapete da Roda e luminárias nos cantos do deck
  mv("tapete", 13, 8, 5, 5, "pessego"),
  mv("luminaria", 11, 6), mv("luminaria", 19, 6), mv("luminaria", 11, 14), mv("luminaria", 19, 14),
  // bordas do jardim
  mv("arvore", 9, 7), mv("arvore", 23, 8), mv("arvore", 9, 13), mv("arvore", 28, 11),
  mv("planta", 1, 5, 1, 1, "arbusto"), mv("planta", 1, 14, 1, 1, "arbusto"), mv("planta", 28, 6, 1, 1, "arbusto"),
  mv("planta", 13, 2, 1, 1, "arbusto"), mv("planta", 16, 2, 1, 1, "arbusto"), mv("planta", 25, 14, 1, 1, "arbusto"),
  mv("jardineira", 24, 5, 3), mv("jardineira", 4, 5, 3),
];

export const TEMPLATES_LUGAR: Readonly<Record<Template, TemplateLugar>> = {
  sala: {
    nome: "Sala",
    moveis: movelSala,
    mapa: montarMapa(30, 20, { "1": [14, 0], "2": [29, 10] }, { a: [8, 5, 19, 9] }, movelSala),
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
    moveis: movelEscritorio,
    mapa: montarMapa(30, 20, { "1": [14, 19] }, { a: [3, 2, 8, 5], b: [12, 2, 17, 5], r: [21, 2, 27, 5] }, movelEscritorio),
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
    moveis: movelTerraco,
    mapa: montarMapa(30, 20, { "1": [0, 10] }, { a: [13, 8, 17, 12] }, movelTerraco),
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
