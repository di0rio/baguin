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
  /** Recorte da base sólida, em px a partir de cada borda da pegada; sobrescreve `RECORTE_SOLIDO` do tipo. */
  recorte?: Recorte;
};

/** Folga em px dentro da pegada: [esquerda, cima, direita, baixo]. */
export type Recorte = readonly [esq: number, cima: number, dir: number, baixo: number];
/** Retângulo em px do Lugar (coordenadas de mundo). */
export type Rect = { x: number; y: number; larg: number; alt: number };

/** Móveis que o Avatar atravessa: tapetes, chão, cadeiras, decoração de parede e luzinhas. */
export const NAO_SOLIDOS: ReadonlySet<TipoMovel> = new Set<TipoMovel>([
  "tapete", "deck", "caminho", "cadeira", "janela", "quadro", "relogio", "lousa", "luzinhas",
]);
/** Móveis pendurados na parede: a pegada fica sobre '#' (a face frontal da parede). */
export const TIPOS_PAREDE: ReadonlySet<TipoMovel> = new Set<TipoMovel>(["janela", "quadro", "relogio", "lousa"]);

export const movelSolido = (m: Movel) => !NAO_SOLIDOS.has(m.tipo);

/**
 * Na visão 3/4 o que bloqueia é o contato do Móvel com o chão (a base), não o desenho inteiro: o
 * Avatar anda atrás da parte alta (encosto de sofá, copa de árvore, topo de estante). A chave é
 * `tipo:variante` ou só `tipo`; sem entrada vale `RECORTE_PADRAO`. Os valores acompanham o desenho em
 * `web/mundo/moveis.ts` (medidos no bounding box opaco de cada sprite): o desenho acaba uns 2px antes
 * do fim da pegada, o resto é sombra.
 */
export const RECORTE_PADRAO: Recorte = [0, 0, 0, 2];
export const RECORTE_SOLIDO: Readonly<Record<string, Recorte>> = {
  planta: [9, 14, 9, 3], // só o vaso; a folhagem fica por cima do Avatar
  "planta:arbusto": [3, 6, 3, 6], // moita larga e baixa
  arvore: [11, 16, 10, 3], // só o tronco; a copa fica por cima
  luminaria: [10, 20, 9, 1], // só o pé
  bebedouro: [8, 6, 8, 2],
  poltrona: [3, 2, 3, 1],
  "mesa-centro": [2, 3, 2, 3],
  "mesa-lateral": [6, 14, 6, 1],
  "mesa-redonda": [4, 6, 4, 4], // tampo e banquinhos; o poste fica no meio
  banqueta: [8, 10, 8, 4],
  puff: [4, 10, 3, 2],
  copiadora: [4, 4, 4, 2],
  banco: [0, 0, 0, 4],
  tv: [0, 0, 0, 1],
  estante: [0, 0, 0, 0],
  "mesa-trabalho": [0, 0, 0, 0],
  "mesa-reuniao": [0, 4, 0, 0],
  "mesa-piquenique": [1, 4, 1, 4],
};


/** Base sólida do Móvel em px (já recortada). */
export function baseSolida(m: Movel): Rect {
  const [e, c, d, b] = m.recorte ?? RECORTE_SOLIDO[`${m.tipo}:${m.variante}`] ?? RECORTE_SOLIDO[m.tipo] ?? RECORTE_PADRAO;
  return {
    x: m.col * TILE + e,
    y: m.lin * TILE + c,
    larg: m.larg * TILE - e - d,
    alt: m.alt * TILE - c - b,
  };
}

const mv = (tipo: TipoMovel, col: number, lin: number, larg = 1, alt = 1, variante?: string): Movel => ({
  tipo, col, lin, larg, alt, ...(variante ? { variante } : {}),
});

export type TemplateLugar = {
  nome: string;
  /**
   * '#' parede, 'M' tile tocado pela base de um Móvel que bloqueia (a colisão fina usa `solidos`), '.' chão, '1'-'9' porta, 'a'-'z' chão de Zona.
   * Derivado de `moveis`, então colisão e desenho vêm da mesma fonte.
   */
  mapa: readonly string[];
  /** Bases sólidas dos Móveis em px (derivadas de `moveis`; é o que `bloqueado` testa além das paredes). */
  solidos: readonly Rect[];
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

/** Bases sólidas de todos os Móveis que bloqueiam. */
export const solidosDe = (moveis: readonly Movel[]): Rect[] => moveis.filter(movelSolido).map(baseSolida);

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
  for (const r of solidosDe(moveis)) {
    for (let l = Math.floor(r.y / TILE); l < Math.ceil((r.y + r.alt) / TILE); l++)
      for (let c = Math.floor(r.x / TILE); c < Math.ceil((r.x + r.larg) / TILE); c++) g[l][c] = "M";
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
    solidos: solidosDe(movelSala),
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
    solidos: solidosDe(movelEscritorio),
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
    solidos: solidosDe(movelTerraco),
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

/**
 * Colisão do Avatar. O ponto (x, y) é o centro do corpo e o sprite pisa em y + PES (ver
 * `AvatarSprite`). Quem colide é só a faixa dos pés, `PE_MEIA_LARG` para cada lado e de
 * y + PE_TOPO até y + PES (sola), como em qualquer jogo 3/4: o corpo passa por trás de
 * Móveis altos e a sola para rente à base de Móveis e paredes. Servidor e cliente usam esta função.
 */
export const PES = 10;
export const PE_MEIA_LARG = 7;
export const PE_TOPO = 6;
/** Ponto de referência dos pés (meio da faixa): usado para Zona e Porta. */
const PE_CENTRO = (PE_TOPO + PES) / 2;

/** Faixa dos pés do Avatar em (x, y), em px do mundo. */
export const caixaPes = (x: number, y: number): Rect => ({
  x: x - PE_MEIA_LARG,
  y: y + PE_TOPO,
  larg: 2 * PE_MEIA_LARG,
  alt: PES - PE_TOPO,
});

const tileBloqueia = (t: Template, col: number, lin: number): boolean => {
  const c = charEm(t, col, lin);
  return c === undefined || c === "#";
};

export function bloqueado(t: Template, x: number, y: number): boolean {
  const b = caixaPes(x, y);
  const x1 = b.x + b.larg;
  const y1 = b.y + b.alt;
  for (let lin = Math.floor(b.y / TILE); lin < Math.ceil(y1 / TILE); lin++)
    for (let col = Math.floor(b.x / TILE); col < Math.ceil(x1 / TILE); col++) if (tileBloqueia(t, col, lin)) return true;
  return TEMPLATES_LUGAR[t].solidos.some((r) => b.x < r.x + r.larg && r.x < x1 && b.y < r.y + r.alt && r.y < y1);
}

/** Maior avanço por vez em `mover`: menor que qualquer faixa sólida, para não atravessar nada num quadro lento. */
const PASSO_MAX = 4;

/**
 * Anda (dx, dy) a partir de (x, y) sem entrar em nada: eixos separados (encostar desliza) e, quando o
 * passo não cabe, para rente ao obstáculo em vez de ficar a um passo dele.
 */
export function mover(t: Template, x: number, y: number, dx: number, dy: number): { x: number; y: number } {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / PASSO_MAX));
  for (let i = 0; i < n; i++) {
    x = avancar(t, x, y, dx / n, "x");
    y = avancar(t, x, y, dy / n, "y");
  }
  return { x, y };
}

/** Novo valor do eixo depois de andar `d`: inteiro se livre, senão o ponto livre mais perto do obstáculo. */
function avancar(t: Template, x: number, y: number, d: number, eixo: "x" | "y"): number {
  const de = eixo === "x" ? x : y;
  if (d === 0) return de;
  const livre = (v: number) => !(eixo === "x" ? bloqueado(t, v, y) : bloqueado(t, x, v));
  if (livre(de + d)) return de + d;
  let ok = 0;
  let ruim = 1;
  for (let i = 0; i < 8; i++) {
    const m = (ok + ruim) / 2;
    if (livre(de + d * m)) ok = m;
    else ruim = m;
  }
  return de + d * ok;
}

/** Zona sob os pés do Avatar. */
const charPes = (t: Template, x: number, y: number) => charEm(t, Math.floor(x / TILE), Math.floor((y + PE_CENTRO) / TILE));

/** Letra da Zona sob os pés, ou null. */
export function zonaEm(t: Template, x: number, y: number): string | null {
  const c = charPes(t, x, y);
  return c !== undefined && c >= "a" && c <= "z" ? c : null;
}

/** Porta sob os pés (dígito + destino), ou null. */
export function portaEm(t: Template, x: number, y: number): (Porta & { digito: string }) | null {
  const c = charPes(t, x, y);
  if (c === undefined || c < "1" || c > "9") return null;
  const porta = TEMPLATES_LUGAR[t].portas[c];
  return porta ? { ...porta, digito: c } : null;
}
