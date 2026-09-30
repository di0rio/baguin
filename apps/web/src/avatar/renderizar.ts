import { CATALOGO, type Direcao, type Pecas } from "@baguin/shared";

/** Tamanho lógico de um quadro (px). O spritesheet é uma grade estrita, sem margem. */
export const FRAME_L = 24;
export const FRAME_A = 32;
export const QUADROS_POR_DIRECAO = 3;
/** Linhas do spritesheet, de cima para baixo. */
export const ORDEM_DIRECOES: readonly Direcao[] = ["baixo", "esquerda", "direita", "cima"];
/** Quadros de cada linha: 0 parado, 1 passo A, 2 passo B. */
export const QUADRO_PARADO = 0;
/** Índice do quadro no spritesheet (linha × 3 + coluna), para `textures.addSpriteSheet`. */
export const quadro = (dir: Direcao, frame: number) => ORDEM_DIRECOES.indexOf(dir) * QUADROS_POR_DIRECAO + frame;

// ---------------------------------------------------------------- paletas

const PELE = ["#fde3cf", "#f3c9a0", "#dca173", "#b97b4f", "#8d5735", "#5e3a24"] as const;
const CABELO = ["#2a2430", "#5b3a29", "#9a6b3c", "#e6bb5e", "#c4452d", "#cfd2de", "#4a86f0", "#f26fb2"] as const;
const ROUPA = [
  "#e8433f",
  "#ff8a3d",
  "#f2c94c",
  "#4cc26b",
  "#2fb7a6",
  "#4a90e2",
  "#7a5cf0",
  "#e85aa6",
  "#f4f1ea",
  "#3d4252",
] as const;
const CALCA = ["#3b5a9d", "#2b2a3d", "#6a6c7c", "#7a5a3c", "#c9b78d", "#2f5d45", "#7b2d3b", "#e9e6df"] as const;

// Garante que o catálogo do shared e as paletas continuam do mesmo tamanho.
if (
  PELE.length !== CATALOGO.pele ||
  CABELO.length !== CATALOGO.cabeloCores ||
  ROUPA.length !== CATALOGO.roupaCores ||
  CALCA.length !== CATALOGO.calcaCores
) {
  throw new Error("Paletas do avatar fora de sincronia com CATALOGO");
}

export const PALETAS = { pele: PELE, cabelo: CABELO, roupa: ROUPA, calca: CALCA } as const;

// ---------------------------------------------------------------- cores

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
const mix = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return `#${hex2(r1 + (r2 - r1) * t)}${hex2(g1 + (g2 - g1) * t)}${hex2(b1 + (b2 - b1) * t)}`;
};
const sombra = (c: string) => mix(c, "#2a1445", 0.3);
const luz = (c: string) => mix(c, "#fff4d6", 0.3);
const escuro = (c: string) => mix(c, "#170d29", 0.6);

type Tom = { c: string; s: string; l: string; d: string };
const tom = (c: string): Tom => ({ c, s: sombra(c), l: luz(c), d: escuro(c) });

/** Contorno ameixa-azulado (não preto): cada borda mistura a cor da peça com este tom. */
const TINTA = "#352757";
const OLHO = "#231a30";
const IRIS = "#3f3160";
const BRANCO = "#f6f3ec";
const SOLA = "#bdb9cf";
const PALHA = "#e0bb6a";

// ---------------------------------------------------------------- grade de pixels

type Grade = (string | null)[];
const nova = (): Grade => new Array<string | null>(FRAME_L * FRAME_A).fill(null);

/** Caneta que desenha deslocada (dx, dy) — usada para o balanço do corpo na caminhada. */
type Caneta = { p(x: number, y: number, c: string): void; r(x0: number, y0: number, x1: number, y1: number, c: string): void; h(y: number, x0: number, x1: number, c: string): void };
function caneta(g: Grade, dx = 0, dy = 0): Caneta {
  const p = (x: number, y: number, c: string) => {
    x += dx;
    y += dy;
    if (x >= 0 && x < FRAME_L && y >= 0 && y < FRAME_A) g[y * FRAME_L + x] = c;
  };
  const r = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) p(x, y, c);
  };
  return { p, r, h: (y, x0, x1, c) => r(x0, y, x1, y, c) };
}

const espelhar = (g: Grade): Grade => {
  const o = nova();
  for (let y = 0; y < FRAME_A; y++) for (let x = 0; x < FRAME_L; x++) o[y * FRAME_L + (FRAME_L - 1 - x)] = g[y * FRAME_L + x];
  return o;
};

/** Contorno de 1px: cada pixel vazio vizinho de um pixel pintado ganha a cor dele bem escurecida. */
function contornar(g: Grade) {
  const out: (string | null)[] = [];
  for (let y = 0; y < FRAME_A; y++) {
    for (let x = 0; x < FRAME_L; x++) {
      const i = y * FRAME_L + x;
      if (g[i]) continue;
      let viz: string | null = null;
      let forca = 0;
      // luz vem de cima à esquerda: bordas de cima/esquerda mais suaves, de baixo/direita mais firmes
      for (const [ax, ay, f] of [[0, 1, 0.66], [-1, 0, 0.8], [1, 0, 0.66], [0, -1, 0.84]] as const) {
        const nx = x + ax;
        const ny = y + ay;
        if (nx < 0 || ny < 0 || nx >= FRAME_L || ny >= FRAME_A) continue;
        const v = g[ny * FRAME_L + nx];
        if (v) {
          viz = v;
          forca = f;
          break;
        }
      }
      if (viz) out[i] = mix(viz, TINTA, forca);
    }
  }
  out.forEach((c, i) => {
    if (c) g[i] = c;
  });
}

function sombraNoChao(g: Grade) {
  const c = "#3a2f5b40";
  const linhas: [number, number, number][] = [
    [30, 5, 18],
    [31, 7, 16],
  ];
  for (const [y, x0, x1] of linhas) for (let x = x0; x <= x1; x++) if (!g[y * FRAME_L + x]) g[y * FRAME_L + x] = c;
}

// ---------------------------------------------------------------- contexto de desenho

type Paleta = { pele: Tom; cabelo: Tom; roupa: Tom; calca: Tom; boca: string; blush: string };
type Ctx = {
  pe: Paleta;
  pecas: Pecas;
  /** fase da caminhada: 0 parado, 1 passo A, -1 passo B */
  fase: number;
  /** corpo desce 1px nos passos */
  oy: number;
  /** cabeça coberta (boné/chapéu): estilos volumosos viram cabelo curto */
  coberto: boolean;
};

const paleta = (p: Pecas): Paleta => {
  const pele = tom(PELE[p.pele]);
  return {
    pele,
    cabelo: tom(CABELO[p.cabelo.cor]),
    roupa: tom(ROUPA[p.roupa.cor]),
    calca: tom(CALCA[p.calca]),
    boca: mix(pele.c, "#5a1f2e", 0.6),
    blush: mix(pele.c, "#ff6f86", 0.38),
  };
};

// ---------------------------------------------------------------- pernas e sapatos

function pernasFrente(g: Grade, { pe, fase, oy }: Ctx) {
  const f = caneta(g);
  for (const lado of ["E", "D"] as const) {
    const levantada = fase !== 0 && ((fase === 1 && lado === "D") || (fase === -1 && lado === "E"));
    const x0 = lado === "E" ? 8 : 12;
    const topo = 24 + oy;
    const fundoCalca = levantada ? 26 : 27;
    f.r(x0, topo, x0 + 3, fundoCalca, pe.calca.c);
    // linha de sombra entre as pernas
    const xi = lado === "E" ? x0 + 3 : x0;
    f.r(xi, topo + 1, xi, fundoCalca, pe.calca.s);
    const sy = fundoCalca + 1;
    const sx0 = lado === "E" ? 7 : 12;
    // tênis: cabedal branco com detalhe na cor da camisa e sola clara
    f.r(sx0, sy, sx0 + 4, sy, BRANCO);
    f.r(sx0, sy + 1, sx0 + 4, sy + 1, SOLA);
    f.p(lado === "E" ? sx0 : sx0 + 4, sy, mix(BRANCO, SOLA, 0.5));
    f.p(sx0 + 2, sy, pe.roupa.c);
    f.p(lado === "E" ? sx0 + 1 : sx0 + 3, sy, mix(BRANCO, "#ffffff", 0.6));
  }
}

function pernasLado(g: Grade, { pe, fase, oy }: Ctx) {
  const f = caneta(g);
  // perna de perto (clara) e de longe (sombra); passo: uma vai à frente (esquerda), outra atrás
  const perna = (dx: number, levantada: boolean, longe: boolean) => {
    const cor = longe ? pe.calca.s : pe.calca.c;
    const x0 = 10 + dx;
    const topo = 24 + oy;
    const fundo = levantada ? 26 : 27;
    f.r(x0, topo, x0 + 2, fundo, cor);
    const sy = fundo + 1;
    const solaC = longe ? mix(SOLA, "#2a1445", 0.2) : SOLA;
    const topoC = longe ? mix(BRANCO, "#2a1445", 0.2) : BRANCO;
    f.r(x0 - 2, sy, x0 + 2, sy, topoC);
    f.r(x0 - 2, sy + 1, x0 + 2, sy + 1, solaC);
    f.p(x0 + 1, sy, longe ? mix(pe.roupa.s, "#2a1445", 0.2) : pe.roupa.c); // detalhe na cor da camisa
    f.p(x0 - 2, sy, longe ? topoC : mix(BRANCO, SOLA, 0.45)); // biqueira
  };
  if (fase === 0) {
    perna(1, false, true);
    perna(0, false, false);
  } else {
    // longe primeiro (fica atrás)
    perna(fase === 1 ? 2 : -2, fase === 1, true); // nota: a perna que vai atrás levanta o pé
    perna(fase === 1 ? -2 : 2, fase === -1, false);
  }
}

// ---------------------------------------------------------------- cabeça

function cabecaFrente(t: Caneta, { pe }: Ctx) {
  const s = pe.pele;
  t.h(3, 8, 15, s.c);
  t.h(4, 7, 16, s.c);
  t.r(6, 5, 17, 14, s.c);
  t.h(15, 7, 16, s.c);
  // orelhas
  t.r(5, 10, 5, 12, s.c);
  t.r(18, 10, 18, 12, s.c);
  t.p(5, 11, s.s);
  t.p(18, 11, s.s);
  // sombra do queixo
  t.h(15, 8, 15, s.s);
}

function rostoFrente(t: Caneta, { pe }: Ctx) {
  for (const x of [8, 14]) {
    t.r(x, 10, x + 1, 12, OLHO);
    t.r(x, 12, x + 1, 12, IRIS);
    t.p(x, 10, "#f8f5ff"); // brilho
  }
  t.p(7, 13, pe.blush);
  t.p(16, 13, pe.blush);
  t.h(13, 11, 12, pe.boca);
}

function cabecaLado(t: Caneta, { pe }: Ctx) {
  const s = pe.pele;
  t.h(3, 8, 15, s.c);
  t.h(4, 7, 16, s.c);
  t.r(6, 5, 17, 14, s.c);
  t.h(15, 7, 16, s.c);
  // nariz
  t.r(5, 11, 5, 12, s.c);
  t.p(5, 12, s.s);
  // orelha
  t.r(12, 10, 13, 11, s.s);
  t.p(13, 10, escuro(s.c));
  t.h(15, 8, 15, s.s);
}

function rostoLado(t: Caneta, { pe }: Ctx) {
  t.r(7, 10, 8, 12, OLHO);
  t.r(7, 12, 8, 12, IRIS);
  t.p(7, 10, "#f8f5ff");
  t.p(7, 13, pe.blush);
  t.r(6, 14, 6, 14, pe.boca);
}

function cabecaCosta(t: Caneta, { pe }: Ctx) {
  const s = pe.pele;
  t.h(3, 8, 15, s.c);
  t.h(4, 7, 16, s.c);
  t.r(6, 5, 17, 14, s.c);
  t.h(15, 8, 15, s.c);
  t.r(5, 10, 5, 12, s.c);
  t.r(18, 10, 18, 12, s.c);
  t.p(5, 11, s.s);
  t.p(18, 11, s.s);
  t.h(15, 8, 15, s.s);
}

// ---------------------------------------------------------------- cabelo

/** Cúpula comum (topo + laterais) usada por curto/longo/rabo. `f` = frente. */
function cupulaFrente(t: Caneta, h: Tom) {
  t.h(2, 8, 15, h.c);
  t.h(3, 6, 17, h.c);
  t.r(5, 4, 18, 6, h.c);
  t.h(7, 5, 7, h.c);
  t.h(7, 10, 12, h.c);
  t.h(7, 16, 18, h.c);
  t.r(5, 8, 6, 9, h.c);
  t.r(17, 8, 18, 9, h.c);
  // luz e sombra
  t.h(3, 8, 11, h.l);
  t.h(4, 7, 8, h.l);
  t.h(3, 9, 10, mix(h.l, "#ffffff", 0.55));
  t.r(18, 4, 18, 9, h.s);
  t.h(6, 13, 17, h.s);
  t.p(11, 7, h.s);
}

function cabeloFrente(t: Caneta, ctx: Ctx, camada: "atras" | "frente") {
  const { pe, pecas } = ctx;
  const h = pe.cabelo;
  let estilo = pecas.cabelo.estilo;
  if (ctx.coberto && (estilo === "moicano" || estilo === "blackpower")) estilo = "curto";
  if (camada === "atras") return;
  switch (estilo) {
    case "careca":
      t.h(4, 10, 12, pe.pele.l);
      break;
    case "curto":
      cupulaFrente(t, h);
      break;
    case "moicano": {
      // laterais raspadas
      const raspado = mix(pe.pele.c, h.c, 0.4);
      t.h(3, 6, 8, raspado);
      t.h(3, 15, 17, raspado);
      t.h(4, 6, 7, raspado);
      t.h(4, 16, 17, raspado);
      t.h(5, 6, 6, raspado);
      t.h(5, 17, 17, raspado);
      t.h(1, 11, 12, h.c);
      t.h(2, 10, 13, h.c);
      t.r(9, 3, 14, 5, h.c);
      t.h(6, 10, 13, h.c);
      t.h(7, 11, 12, h.c);
      t.r(10, 1, 10, 4, h.l);
      t.r(14, 3, 14, 5, h.s);
      t.h(6, 13, 13, h.s);
      break;
    }
    case "longo": {
      cupulaFrente(t, h);
      t.h(7, 5, 6, h.c);
      // cortinas sobre os ombros
      t.r(5, 10, 7, 20, h.c);
      t.r(16, 10, 18, 20, h.c);
      t.r(5, 8, 5, 20, h.c);
      t.r(18, 8, 18, 20, h.s);
      t.r(7, 10, 7, 19, h.s);
      t.r(16, 10, 16, 19, h.l);
      t.h(21, 6, 7, h.s);
      t.h(21, 16, 17, h.s);
      t.p(5, 20, h.s);
      break;
    }
    case "rabo": {
      cupulaFrente(t, h);
      // rabo aparece de lado, preso alto
      t.r(19, 4, 20, 5, h.c);
      t.r(19, 6, 21, 11, h.c);
      t.r(20, 12, 21, 14, h.c);
      t.h(15, 20, 20, h.s);
      t.r(21, 6, 21, 13, h.s);
      t.r(19, 5, 20, 5, ROUPA[pecas.roupa.cor]);
      break;
    }
    case "blackpower": {
      // volume redondo
      t.h(0 + 1, 8, 15, h.c);
      t.h(2, 6, 17, h.c);
      t.h(3, 4, 19, h.c);
      t.r(3, 4, 20, 8, h.c);
      t.r(3, 9, 5, 12, h.c);
      t.r(18, 9, 20, 12, h.c);
      t.h(9, 6, 8, h.c);
      t.h(9, 15, 17, h.c);
      t.h(8, 9, 14, h.c);
      t.h(7, 9, 14, h.c);
      // testa aparece abaixo da linha do cabelo
      t.h(9, 9, 14, pe.pele.c);
      t.h(8, 9, 14, h.c);
      t.h(3, 9, 12, h.l);
      t.h(4, 6, 8, h.l);
      t.r(20, 4, 20, 12, h.s);
      t.h(8, 15, 19, h.s);
      // cachos
      for (const [x, y] of [[6, 4], [10, 5], [14, 4], [17, 6], [5, 8], [12, 7], [8, 7], [19, 9], [4, 11]] as const) t.p(x, y, mix(h.c, h.s, 0.7));
      for (const [x, y] of [[8, 5], [13, 6], [16, 4], [5, 6], [19, 7]] as const) t.p(x, y, mix(h.c, h.l, 0.6));
      break;
    }
  }
}

function cupulaLado(t: Caneta, h: Tom) {
  t.h(2, 8, 15, h.c);
  t.h(3, 6, 17, h.c);
  t.r(6, 4, 18, 5, h.c);
  t.h(6, 6, 9, h.c);
  t.r(10, 6, 18, 9, h.c);
  t.h(7, 6, 7, h.c);
  t.r(14, 10, 18, 12, h.c);
  t.h(13, 15, 17, h.c);
  t.h(3, 8, 11, h.l);
  t.h(4, 7, 9, h.l);
  t.h(3, 9, 10, mix(h.l, "#ffffff", 0.55));
  t.r(18, 4, 18, 12, h.s);
  t.h(13, 15, 17, h.s);
  t.h(9, 14, 17, h.s);
}

function cabeloLado(t: Caneta, ctx: Ctx, camada: "atras" | "frente") {
  const { pe, pecas } = ctx;
  const h = pe.cabelo;
  let estilo = pecas.cabelo.estilo;
  if (ctx.coberto && (estilo === "moicano" || estilo === "blackpower")) estilo = "curto";
  if (camada === "atras") {
    if (estilo === "longo") {
      // cai atrás das costas
      t.r(13, 13, 18, 21, h.c);
      t.r(18, 13, 18, 21, h.s);
      t.h(22, 14, 17, h.s);
      t.h(21, 13, 13, h.s);
    }
    return;
  }
  switch (estilo) {
    case "careca":
      break;
    case "curto":
      cupulaLado(t, h);
      break;
    case "moicano": {
      const raspado = mix(pe.pele.c, h.c, 0.4);
      t.h(4, 11, 15, raspado);
      t.r(10, 5, 16, 6, raspado);
      t.r(14, 7, 17, 11, raspado);
      t.h(1, 10, 13, h.c);
      t.h(2, 9, 15, h.c);
      t.r(8, 3, 16, 4, h.c);
      t.r(9, 5, 17, 5, h.c);
      t.h(6, 9, 11, h.c);
      t.r(15, 6, 18, 9, h.c);
      t.r(17, 10, 18, 12, h.c);
      t.h(2, 10, 12, h.l);
      t.r(18, 5, 18, 12, h.s);
      t.h(5, 13, 16, h.s);
      break;
    }
    case "longo":
      cupulaLado(t, h);
      t.r(14, 10, 18, 14, h.c);
      t.h(15, 15, 17, h.c);
      t.r(18, 10, 18, 14, h.s);
      break;
    case "rabo":
      cupulaLado(t, h);
      t.r(19, 4, 20, 5, ROUPA[pecas.roupa.cor]);
      t.r(19, 6, 22, 11, h.c);
      t.r(19, 12, 21, 15, h.c);
      t.r(20, 16, 20, 16, h.c);
      t.r(22, 6, 22, 11, h.s);
      t.r(21, 12, 21, 15, h.s);
      t.h(7, 19, 20, h.l);
      break;
    case "blackpower": {
      t.h(1, 8, 15, h.c);
      t.h(2, 6, 17, h.c);
      t.r(4, 3, 20, 8, h.c);
      t.r(11, 9, 20, 12, h.c);
      t.r(5, 8, 7, 8, h.c);
      t.h(13, 14, 19, h.c);
      t.h(4, 6, 12, h.l);
      t.h(3, 8, 11, h.l);
      t.r(20, 4, 20, 13, h.s);
      t.h(13, 15, 19, h.s);
      t.h(9, 10, 19, h.s);
      for (const [x, y] of [[6, 4], [10, 5], [14, 4], [17, 6], [15, 9], [12, 7], [8, 7], [19, 9], [16, 11]] as const) t.p(x, y, mix(h.c, h.s, 0.7));
      for (const [x, y] of [[8, 5], [13, 6], [16, 4], [11, 3]] as const) t.p(x, y, mix(h.c, h.l, 0.6));
      break;
    }
  }
}

function cabeloCosta(t: Caneta, ctx: Ctx, camada: "atras" | "frente") {
  const { pe, pecas } = ctx;
  const h = pe.cabelo;
  let estilo = pecas.cabelo.estilo;
  if (ctx.coberto && (estilo === "moicano" || estilo === "blackpower")) estilo = "curto";
  if (camada === "atras") return;
  const cupula = (fundo: number) => {
    t.h(2, 8, 15, h.c);
    t.h(3, 6, 17, h.c);
    t.r(5, 4, 18, fundo - 1, h.c);
    t.h(fundo, 7, 16, h.c);
    t.h(3, 8, 11, h.l);
    t.h(4, 7, 9, h.l);
    t.h(3, 9, 10, mix(h.l, "#ffffff", 0.55));
    t.r(18, 4, 18, fundo - 1, h.s);
    t.h(fundo, 7, 16, h.s);
    t.h(fundo - 1, 6, 17, h.c);
  };
  switch (estilo) {
    case "careca":
      break;
    case "curto":
      cupula(14);
      t.h(14, 8, 15, h.s);
      break;
    case "moicano": {
      const raspado = mix(pe.pele.c, h.c, 0.4);
      t.r(6, 4, 7, 12, raspado);
      t.r(16, 4, 17, 12, raspado);
      t.h(5, 6, 17, raspado);
      t.h(13, 8, 15, raspado);
      t.h(1, 11, 12, h.c);
      t.h(2, 10, 13, h.c);
      t.r(9, 3, 14, 13, h.c);
      t.r(10, 1, 10, 6, h.l);
      t.r(14, 3, 14, 13, h.s);
      t.h(14, 10, 13, h.s);
      break;
    }
    case "longo":
      cupula(14);
      t.r(6, 14, 17, 20, h.c);
      t.r(7, 21, 16, 21, h.c);
      t.r(6, 14, 7, 20, h.s);
      t.r(16, 14, 17, 20, h.s);
      t.h(22, 8, 9, h.s);
      t.h(22, 14, 15, h.s);
      t.h(21, 7, 16, h.s);
      t.r(11, 14, 12, 19, h.l);
      break;
    case "rabo": {
      cupula(13);
      t.h(14, 8, 15, h.s);
      // presilha + rabo pendurado
      t.r(10, 3, 13, 4, ROUPA[pecas.roupa.cor]);
      t.r(10, 5, 13, 15, h.c);
      t.r(10, 16, 13, 17, h.c);
      t.r(11, 18, 12, 19, h.c);
      t.r(10, 5, 10, 15, h.l);
      t.r(13, 5, 13, 17, h.s);
      t.r(12, 18, 12, 19, h.s);
      break;
    }
    case "blackpower": {
      t.h(1, 8, 15, h.c);
      t.h(2, 6, 17, h.c);
      t.r(3, 3, 20, 12, h.c);
      t.r(4, 13, 19, 13, h.c);
      t.h(14, 7, 16, h.c);
      t.h(3, 8, 11, h.l);
      t.h(4, 6, 8, h.l);
      t.r(20, 4, 20, 12, h.s);
      t.h(14, 7, 16, h.s);
      t.h(13, 4, 19, h.s);
      for (const [x, y] of [[6, 4], [10, 5], [14, 4], [17, 6], [5, 8], [12, 8], [8, 7], [19, 9], [4, 11], [10, 11], [15, 11]] as const) t.p(x, y, mix(h.c, h.s, 0.7));
      for (const [x, y] of [[8, 5], [13, 6], [16, 4], [5, 6], [19, 7], [8, 10], [13, 10]] as const) t.p(x, y, mix(h.c, h.l, 0.6));
      break;
    }
  }
}

// ---------------------------------------------------------------- roupa e braços

type Braco = { dy: number };

function bracosFrente(g: Grade, ctx: Ctx, { oy }: { oy: number }) {
  const { pe, pecas, fase } = ctx;
  const estilo = pecas.roupa.estilo;
  const r = pe.roupa;
  const pele = pe.pele;
  const pares: [number, number, Braco][] = [
    [6, -1, { dy: fase === 1 ? -1 : fase === -1 ? 1 : 0 }],
    [16, 1, { dy: fase === 1 ? 1 : fase === -1 ? -1 : 0 }],
  ];
  for (const [x0, lado, b] of pares) {
    const t = caneta(g, 0, oy + b.dy);
    const xs = lado === -1 ? [x0, x0 + 1] : [x0, x0 + 1];
    void xs;
    if (estilo === "regata") {
      t.r(x0, 17, x0 + 1, 22, pele.c);
      t.r(lado === -1 ? x0 : x0 + 1, 17, lado === -1 ? x0 : x0 + 1, 22, pele.s);
      t.p(lado === -1 ? x0 : x0 + 1, 17, pele.c);
    } else if (estilo === "moletom") {
      t.r(x0, 17, x0 + 1, 21, r.c);
      t.r(lado === -1 ? x0 : x0 + 1, 17, lado === -1 ? x0 : x0 + 1, 21, r.s);
      t.r(x0, 21, x0 + 1, 22, r.s);
      t.r(x0, 23, x0 + 1, 23, pele.c);
    } else {
      t.r(x0, 17, x0 + 1, 19, r.c);
      t.r(x0, 19, x0 + 1, 19, r.s);
      t.r(lado === -1 ? x0 : x0 + 1, 17, lado === -1 ? x0 : x0 + 1, 18, r.s);
      t.r(x0, 20, x0 + 1, 22, pele.c);
      t.r(lado === -1 ? x0 : x0 + 1, 20, lado === -1 ? x0 : x0 + 1, 22, pele.s);
    }
  }
}

function torsoFrente(t: Caneta, { pe, pecas }: Ctx) {
  const r = pe.roupa;
  const pele = pe.pele;
  const estilo = pecas.roupa.estilo;
  t.r(8, 16, 15, 23, r.c);
  t.r(15, 17, 15, 23, r.s);
  t.h(23, 8, 15, r.s);
  t.r(9, 18, 10, 19, r.l);
  if (estilo === "camiseta") {
    t.h(16, 10, 13, pele.s);
    t.h(17, 11, 12, pele.c);
    t.h(16, 9, 9, r.l);
    t.h(16, 14, 14, r.l);
    // dobras do tecido na barriga
    t.p(12, 20, r.s);
    t.p(11, 21, r.s);
    t.p(13, 22, r.s);
    t.p(9, 21, r.l);
  } else if (estilo === "moletom") {
    // capuz: borda grossa em U em volta do pescoço
    const capuz = mix(r.c, "#ffffff", 0.12);
    t.h(16, 8, 15, capuz);
    t.r(8, 17, 9, 17, capuz);
    t.r(14, 17, 15, 17, capuz);
    t.h(16, 10, 13, pele.s);
    t.h(17, 10, 13, r.s);
    t.h(17, 11, 12, pele.s);
    // cordinhas
    t.r(10, 18, 10, 20, BRANCO);
    t.r(13, 18, 13, 20, BRANCO);
    t.p(10, 21, SOLA);
    t.p(13, 21, SOLA);
    // bolso canguru
    t.r(9, 21, 14, 22, r.s);
    t.h(21, 9, 14, mix(r.s, "#000000", 0.15));
  } else {
    // regata: alças + decote
    t.r(8, 16, 15, 16, pele.c);
    t.r(9, 16, 10, 16, r.c);
    t.r(13, 16, 14, 16, r.c);
    t.r(11, 17, 12, 18, pele.c);
    t.h(17, 8, 8, pele.c);
    t.h(17, 15, 15, pele.c);
    t.h(18, 11, 12, pele.c);
    t.h(19, 11, 12, r.c);
    t.h(19, 12, 12, r.c);
    t.p(11, 18, pele.s);
    t.p(12, 18, pele.s);
  }
}

function torsoCosta(t: Caneta, { pe, pecas }: Ctx) {
  const r = pe.roupa;
  const pele = pe.pele;
  const estilo = pecas.roupa.estilo;
  t.r(8, 16, 15, 23, r.c);
  t.r(15, 17, 15, 23, r.s);
  t.h(23, 8, 15, r.s);
  t.r(9, 19, 10, 20, r.l);
  if (estilo === "moletom") {
    const capuz = mix(r.c, "#ffffff", 0.12);
    t.r(9, 16, 14, 19, capuz);
    t.h(20, 10, 13, capuz);
    t.h(20, 9, 9, r.s);
    t.h(20, 14, 14, r.s);
    t.r(9, 19, 14, 19, r.s);
    t.h(16, 9, 14, mix(capuz, "#ffffff", 0.1));
  } else if (estilo === "camiseta") {
    t.h(16, 10, 13, r.s);
  } else {
    t.r(8, 16, 15, 16, pele.c);
    t.r(9, 16, 10, 17, r.c);
    t.r(13, 16, 14, 17, r.c);
    t.r(8, 17, 8, 17, pele.c);
    t.r(15, 17, 15, 17, pele.c);
    t.r(11, 17, 12, 17, pele.c);
    t.r(11, 18, 12, 18, pele.s);
    t.r(8, 18, 10, 18, r.c);
    t.r(13, 18, 15, 18, r.c);
  }
}

function bracosCosta(g: Grade, ctx: Ctx, oy: { oy: number }) {
  bracosFrente(g, ctx, oy);
}

function bracoLado(g: Grade, ctx: Ctx, longe: boolean) {
  const { pe, pecas, fase, oy } = ctx;
  const estilo = pecas.roupa.estilo;
  const r = pe.roupa;
  const pele = pe.pele;
  // desloca a parte de baixo do braço para frente/trás; longe faz o oposto
  const sinal = (fase === 1 ? 1 : fase === -1 ? -1 : 0) * (longe ? 1 : -1);
  const t = caneta(g, 0, oy);
  const cM = longe ? r.s : r.c;
  const cS = longe ? mix(r.s, "#000000", 0.15) : r.s;
  const cP = longe ? pele.s : pele.c;
  // linhas do braço: y, deslocamento x
  const off = (y: number) => (y <= 18 ? 0 : y <= 20 ? sinal : sinal * 2);
  const desenha = (y: number, cor: string) => {
    t.r(11 + off(y), y, 12 + off(y), y, cor);
    if (!longe) t.p(12 + off(y), y, mix(cor, "#2a1445", 0.16)); // borda de trás do braço
  };
  if (estilo === "regata") {
    for (let y = 17; y <= 22; y++) desenha(y, cP);
  } else if (estilo === "moletom") {
    for (let y = 17; y <= 20; y++) desenha(y, cM);
    desenha(21, cS);
    desenha(22, cS);
    t.r(11 + off(23), 23, 12 + off(23), 23, cP);
  } else {
    for (let y = 17; y <= 18; y++) desenha(y, cM);
    desenha(19, cS);
    for (let y = 20; y <= 22; y++) desenha(y, cP);
  }
}

function torsoLado(t: Caneta, { pe, pecas }: Ctx) {
  const r = pe.roupa;
  const pele = pe.pele;
  const estilo = pecas.roupa.estilo;
  t.r(9, 16, 14, 23, r.c);
  t.r(14, 17, 14, 23, r.s);
  t.h(23, 9, 14, r.s);
  if (estilo === "camiseta") {
    t.h(16, 9, 10, pele.s);
    t.h(16, 11, 11, r.l);
  } else if (estilo === "moletom") {
    const capuz = mix(r.c, "#ffffff", 0.12);
    t.r(12, 16, 14, 18, capuz);
    t.r(9, 16, 11, 16, capuz);
    t.h(16, 9, 10, pele.s);
    t.r(10, 21, 13, 22, r.s);
    t.r(9, 18, 9, 19, BRANCO);
  } else {
    t.r(9, 16, 9, 18, pele.c);
    t.r(10, 16, 10, 17, pele.c);
    t.r(11, 16, 11, 17, r.c);
    t.r(12, 16, 12, 16, r.c);
    t.p(9, 18, pele.s);
    t.p(10, 18, r.c);
  }
}

// ---------------------------------------------------------------- acessórios

const ARO = "#e2b04a";

function acessorioFrente(t: Caneta, { pecas, pe }: Ctx) {
  const roupa = pe.roupa;
  switch (pecas.acessorio) {
    case "oculos":
      for (const x of [7, 13]) {
        t.r(x, 9, x + 3, 9, ARO);
        t.r(x, 13, x + 3, 13, ARO);
        t.r(x, 10, x, 12, ARO);
        t.r(x + 3, 10, x + 3, 12, ARO);
      }
      t.h(10, 11, 12, ARO);
      t.p(6, 10, ARO);
      t.p(17, 10, ARO);
      // brilho da lente
      break;
    case "bone": {
      const c = roupa.c;
      t.h(1, 8, 15, c);
      t.r(6, 2, 17, 4, c);
      t.r(5, 5, 18, 6, c);
      t.r(6, 4, 17, 4, c);
      t.h(2, 8, 11, roupa.l);
      t.h(3, 7, 9, roupa.l);
      t.r(17, 2, 17, 4, roupa.s);
      t.h(6, 5, 18, roupa.s);
      // aba
      t.h(7, 6, 17, roupa.d);
      t.h(8, 8, 15, roupa.d);
      t.p(11, 1, roupa.l);
      t.p(12, 1, roupa.l);
      t.h(5, 11, 12, roupa.l);
      break;
    }
    case "fone": {
      const b = "#5c5a82";
      t.h(1, 9, 14, b);
      t.h(2, 7, 8, b);
      t.h(2, 15, 16, b);
      t.h(3, 6, 6, b);
      t.h(3, 17, 17, b);
      t.r(5, 4, 5, 9, b);
      t.r(18, 4, 18, 9, b);
      t.r(4, 9, 6, 13, "#706d9c");
      t.r(17, 9, 19, 13, "#706d9c");
      t.r(4, 10, 4, 12, "#ff6f8e");
      t.r(19, 10, 19, 12, "#ff6f8e");
      t.h(9, 4, 6, "#918dc0");
      t.h(9, 17, 19, "#918dc0");
      t.h(13, 4, 6, "#45426b");
      t.h(13, 17, 19, "#45426b");
      t.h(1, 9, 11, "#8c88b8");
      break;
    }
    case "chapeu": {
      t.h(0 + 1, 9, 14, PALHA);
      t.r(7, 2, 16, 3, PALHA);
      t.r(7, 4, 16, 5, roupa.c);
      t.h(5, 7, 16, roupa.s);
      t.h(2, 9, 12, luz(PALHA));
      // aba larga
      t.h(6, 4, 19, PALHA);
      t.h(7, 2, 21, PALHA);
      t.h(8, 3, 20, sombra(PALHA));
      t.h(9, 5, 18, mix(PALHA, "#2a1445", 0.5));
      t.h(6, 5, 9, luz(PALHA));
      t.h(7, 3, 7, luz(PALHA));
      t.p(2, 7, sombra(PALHA));
      t.p(21, 7, sombra(PALHA));
      break;
    }
    case "nenhum":
      break;
  }
}

function acessorioLado(t: Caneta, { pecas, pe }: Ctx) {
  const roupa = pe.roupa;
  switch (pecas.acessorio) {
    case "oculos":
      t.r(6, 9, 9, 9, ARO);
      t.r(6, 13, 9, 13, ARO);
      t.r(6, 10, 6, 12, ARO);
      t.r(9, 10, 9, 12, ARO);
      t.h(10, 10, 12, ARO);
      break;
    case "bone": {
      const c = roupa.c;
      t.h(1, 9, 15, c);
      t.r(7, 2, 17, 4, c);
      t.r(6, 5, 18, 6, c);
      t.h(2, 9, 12, roupa.l);
      t.h(3, 8, 10, roupa.l);
      t.r(18, 4, 18, 6, roupa.s);
      t.h(6, 6, 18, roupa.s);
      // aba para a frente (esquerda)
      t.r(2, 6, 7, 7, roupa.d);
      t.h(6, 2, 7, roupa.s);
      t.h(7, 3, 6, roupa.d);
      t.p(12, 1, roupa.l);
      t.p(15, 5, roupa.s);
      break;
    }
    case "fone": {
      const b = "#5c5a82";
      t.h(1, 8, 13, b);
      t.r(12, 2, 13, 8, b);
      t.h(2, 10, 11, b);
      t.h(3, 11, 11, b);
      t.r(10, 8, 15, 13, "#706d9c");
      t.r(10, 8, 15, 8, "#918dc0");
      t.r(10, 13, 15, 13, "#45426b");
      t.r(12, 10, 13, 11, "#ff6f8e");
      break;
    }
    case "chapeu": {
      t.h(1, 9, 14, PALHA);
      t.r(7, 2, 16, 3, PALHA);
      t.r(7, 4, 16, 5, roupa.c);
      t.h(5, 7, 16, roupa.s);
      t.h(2, 9, 12, luz(PALHA));
      t.h(6, 4, 19, PALHA);
      t.h(7, 2, 21, PALHA);
      t.h(8, 3, 20, sombra(PALHA));
      t.h(9, 5, 18, mix(PALHA, "#2a1445", 0.5));
      t.h(6, 5, 9, luz(PALHA));
      t.h(7, 3, 7, luz(PALHA));
      break;
    }
    case "nenhum":
      break;
  }
}

function acessorioCosta(t: Caneta, ctx: Ctx) {
  const { pecas, pe } = ctx;
  const roupa = pe.roupa;
  if (pecas.acessorio === "bone") {
    const c = roupa.c;
    t.h(1, 8, 15, c);
    t.r(6, 2, 17, 5, c);
    t.r(5, 5, 18, 8, c);
    t.h(2, 8, 11, roupa.l);
    t.h(3, 7, 9, roupa.l);
    t.r(17, 2, 17, 5, roupa.s);
    t.h(8, 5, 18, roupa.s);
    t.h(7, 10, 13, roupa.d);
    t.r(11, 1, 12, 2, roupa.l);
    t.r(11, 4, 12, 4, roupa.s);
  } else if (pecas.acessorio === "fone") {
    acessorioFrente(t, ctx);
  } else if (pecas.acessorio === "chapeu") {
    acessorioFrente(t, ctx);
  }
}

// ---------------------------------------------------------------- composição

function quadroFrente(g: Grade, ctx: Ctx) {
  const t = caneta(g, 0, ctx.oy);
  pernasFrente(g, ctx);
  torsoFrente(t, ctx);
  bracosFrente(g, ctx, ctx);
  cabecaFrente(t, ctx);
  rostoFrente(t, ctx);
  cabeloFrente(t, ctx, "frente");
  acessorioFrente(t, ctx);
}

function quadroLado(g: Grade, ctx: Ctx) {
  const t = caneta(g, 0, ctx.oy);
  cabeloLado(t, ctx, "atras");
  bracoLado(g, ctx, true);
  pernasLado(g, ctx);
  torsoLado(t, ctx);
  bracoLado(g, ctx, false);
  cabecaLado(t, ctx);
  rostoLado(t, ctx);
  cabeloLado(t, ctx, "frente");
  acessorioLado(t, ctx);
}

function quadroCosta(g: Grade, ctx: Ctx) {
  const t = caneta(g, 0, ctx.oy);
  pernasFrente(g, ctx);
  torsoCosta(t, ctx);
  bracosCosta(g, ctx, ctx);
  cabecaCosta(t, ctx);
  cabeloCosta(t, ctx, "frente");
  acessorioCosta(t, ctx);
}

const FASES = [0, 1, -1] as const;

/** Desenha um quadro como grade de cores (null = transparente). Puro, sem DOM. */
export function desenharQuadro(pecas: Pecas, dir: Direcao, frame: number, comContorno = true): (string | null)[] {
  const fase = FASES[frame] ?? 0;
  const ctx: Ctx = {
    pe: paleta(pecas),
    pecas,
    fase,
    oy: fase === 0 ? 0 : 1,
    coberto: pecas.acessorio === "bone" || pecas.acessorio === "chapeu",
  };
  let g = nova();
  if (dir === "baixo") quadroFrente(g, ctx);
  else if (dir === "cima") quadroCosta(g, ctx);
  else {
    quadroLado(g, ctx);
    if (dir === "direita") g = espelhar(g);
  }
  if (!comContorno) return g;
  contornar(g);
  sombraNoChao(g);
  return g;
}

/**
 * Spritesheet 72×128: 4 linhas (baixo, esquerda, direita, cima) × 3 colunas
 * (parado, passo A, passo B), quadros de FRAME_L×FRAME_A sem margem.
 */
export function renderizarSpritesheet(pecas: Pecas): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_L * QUADROS_POR_DIRECAO;
  canvas.height = FRAME_A * ORDEM_DIRECOES.length;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2D indisponível");
  ctx.imageSmoothingEnabled = false;
  ORDEM_DIRECOES.forEach((dir, linha) => {
    for (let frame = 0; frame < QUADROS_POR_DIRECAO; frame++) {
      const g = desenharQuadro(pecas, dir, frame);
      const ox = frame * FRAME_L;
      const oy = linha * FRAME_A;
      for (let y = 0; y < FRAME_A; y++) {
        for (let x = 0; x < FRAME_L; x++) {
          const c = g[y * FRAME_L + x];
          if (!c) continue;
          ctx.fillStyle = c;
          ctx.fillRect(ox + x, oy + y, 1, 1);
        }
      }
    }
  });
  return canvas;
}
