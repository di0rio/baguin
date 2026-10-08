import { TEMPLATES_LUGAR, TILE, TIPOS_PAREDE, baseSolida, movelSolido, type Movel, type Template } from "@baguin/shared";
import { desenharMovel } from "./moveis";
import { MUNDO } from "./paleta";
import { Caneta, FINO, TRACO, aleatorio, criarCanvas, hashTexto, type Ponto } from "./traco";

/**
 * Desenho do Lugar em cartoon de tinta e papel (visão 3/4): chão, paredes com face frontal, tapetes, decoração
 * de parede e portas vão num canvas só (camada do chão); cada Móvel vira um sprite ordenado por y (ver
 * `objetosDoMapa`), para o Avatar passar atrás/na frente deles. Contorno grosso de tinta, parede mais clara,
 * chão creme, sombra chapada mais escura. Marca de material só em traço fino e rara.
 */

type Tema = {
  clima: "interno" | "externo";
  piso: "tabua" | "ladrilho" | "grama";
};

const TEMAS: Record<Template, Tema> = {
  sala: { clima: "interno", piso: "tabua" },
  escritorio: { clima: "interno", piso: "ladrilho" },
  terraco: { clima: "externo", piso: "grama" },
};

export type Lado = "cima" | "baixo" | "esquerda" | "direita";
export type PortaMapa = { col: number; lin: number; texto: string; lado: Lado };
export type ZonaMapa = { letra: string; nome: string; tipo: "comum" | "reuniao"; col0: number; lin0: number; col1: number; lin1: number };
export type ObjetoMapa = {
  chave: string;
  canvas: HTMLCanvasElement;
  /** Pixels do canvas por unidade do mundo. */
  res: number;
  x: number;
  y: number;
  depth: number;
  /** Móvel que originou o sprite (a Deixa, etapa 4, usa para achar o alcançável). */
  movel?: Movel;
};

const isPorta = (c: string | undefined) => c !== undefined && c >= "1" && c <= "9";
const isZona = (c: string | undefined) => c !== undefined && c >= "a" && c <= "z";

/** Profundidade do chão e da decoração rasteira (sempre atrás de qualquer Avatar). */
export const PROF_CHAO = -10;

/** Pixels do canvas por unidade do mundo, conforme o zoom da câmera e a densidade da tela (cobre um zoom não inteiro). */
export const resolucaoMundo = (zoom: number, densidade = 1) => Math.min(4, Math.max(1, Math.ceil(zoom * densidade)));

// ---------------------------------------------------------------- pisos

/** Três riscos de tábua: três emendas paralelas de comprimentos diferentes. É a marca de material do piso e do deck. */
function tabuas(p: Caneta, x: number, y: number, len: number) {
  [1, 0.7, 0.88].forEach((k, i) => p.linha([[x, y + i * 7], [x + len * k, y + i * 7]]));
}

/** Alguns grupos de tábuas soltos pelo piso. */
function pisoTabua(p: Caneta, W: number, H: number, rnd: () => number) {
  for (let ty = 1; ty < H / TILE - 1; ty++) {
    for (let tx = 1; tx < W / TILE - 1; tx++) {
      if (rnd() > 0.04) continue;
      tabuas(p, tx * TILE + 2 + Math.floor(rnd() * 6), ty * TILE + 4 + Math.floor(rnd() * 6), 22 + Math.floor(rnd() * 8));
    }
  }
}

/** Cruzinhas nas quinas, a cada quatro tiles: dá a ideia do ladrilho sem desenhar o piso inteiro. */
function pisoLadrilho(p: Caneta, W: number, H: number) {
  for (let ty = 4; ty < H / TILE - 1; ty += 4) {
    for (let tx = 4; tx < W / TILE - 1; tx += 4) {
      const x = tx * TILE;
      const y = ty * TILE;
      p.linha([[x - 3, y], [x + 3, y]]);
      p.linha([[x, y - 3], [x, y + 3]]);
    }
  }
}

/** Tufos de três risquinhos espalhados. */
function pisoGrama(p: Caneta, W: number, H: number, rnd: () => number) {
  for (let i = 0; i < 90; i++) {
    const x = TILE + rnd() * (W - TILE * 2);
    const y = TILE + rnd() * (H - TILE * 2);
    p.linha([[x - 3, y], [x - 4.5, y - 4]]);
    p.linha([[x, y], [x, y - 5.5]]);
    p.linha([[x + 3, y], [x + 4.5, y - 4]]);
  }
}

// ---------------------------------------------------------------- tapetes, deck, caminho

/** Percorre a borda interna do tapete de `passo` em `passo` px. */
function emBorda(x: number, y: number, w: number, h: number, passo: number, f: (px: number, py: number, horizontal: boolean) => void) {
  for (let px = x + passo; px < x + w - passo / 2; px += passo) {
    f(px, y, true);
    f(px, y + h, true);
  }
  for (let py = y + passo; py < y + h - passo / 2; py += passo) {
    f(x, py, false);
    f(x + w, py, false);
  }
}

function tapete(p: Caneta, m: Movel) {
  const { meio: M } = MUNDO;
  const x = m.col * TILE + 2;
  const y = m.lin * TILE + 2;
  const w = m.larg * TILE - 4;
  const h = m.alt * TILE - 4;
  p.caixa(x, y, w, h, M, 7);
  const ix = x + 5;
  const iy = y + 5;
  const iw = w - 10;
  const ih = h - 10;
  const estilo = m.variante ?? "lavanda";
  if (estilo !== "menta") p.caixa(ix, iy, iw, ih, null, 4, FINO);
  else p.forma((c) => c.roundRect(ix, iy, iw, ih, 4), null, 0), p.tracejada([[ix + 4, iy], [ix + iw - 4, iy], [ix + iw, iy + 4], [ix + iw, iy + ih - 4], [ix + iw - 4, iy + ih], [ix + 4, iy + ih], [ix, iy + ih - 4], [ix, iy + 4], [ix + 4, iy]], [4, 3]);
  switch (estilo) {
    case "lavanda":
      emBorda(ix, iy, iw, ih, 14, (px, py) => p.ponto(px, py, 1.1));
      break;
    case "lilas":
      emBorda(ix + 3, iy + 3, iw - 6, ih - 6, 12, (px, py, hz) => p.linha(hz ? [[px - 3, py - 1.5], [px, py + 1.5], [px + 3, py - 1.5]] : [[px - 1.5, py - 3], [px + 1.5, py], [px - 1.5, py + 3]]));
      break;
    case "pessego":
      for (const px of [x - 3, x + w + 3]) for (let py = y + 8; py < y + h - 6; py += 8) p.linha([[px - 2.5, py], [px + 2.5, py]]);
      for (const px of [ix + 6, ix + iw - 6]) for (let i = 0; i < 3; i++) p.linha([[px + (px < x + w / 2 ? 1 : -1) * i * 3, iy + 5], [px + (px < x + w / 2 ? 1 : -1) * i * 3, iy + ih - 5]]);
      break;
    case "verde":
      emBorda(ix + 3, iy + 3, iw - 6, ih - 6, 18, (px, py) => {
        p.linha([[px - 2, py], [px + 2, py]]);
        p.linha([[px, py - 2], [px, py + 2]]);
      });
      break;
    case "rosa":
      emBorda(ix + 3, iy + 3, iw - 6, ih - 6, 16, (px, py) => p.poli([[px, py - 2.3], [px + 2.3, py], [px, py + 2.3], [px - 2.3, py]], null, FINO));
      break;
    default:
      break;
  }
}

function deck(p: Caneta, m: Movel, rnd: () => number) {
  const { papel: P, meio: M, sombra: S } = MUNDO;
  const x = m.col * TILE;
  const y = m.lin * TILE;
  const w = m.larg * TILE;
  const h = m.alt * TILE;
  p.chapa(x + 3, y + h - 2, w, 9, S, 3); // sombra no gramado
  p.caixa(x, y + h - 10, w, 10, M, 3); // face frontal
  for (let i = 12; i < w - 4; i += 16) p.linha([[x + i, y + h - 7], [x + i, y + h - 3]]);
  p.caixa(x, y, w, h - 7, P, 4);
  // três riscos de tábua em pontos soltos
  for (let k = 0; k < 5; k++) {
    const px = x + 10 + rnd() * (w - 50);
    const py = y + 10 + rnd() * (h - 40);
    tabuas(p, px, py, 26);
  }
}

function caminho(p: Caneta, m: Movel, rnd: () => number) {
  const { papel: P, sombra: S } = MUNDO;
  const x = m.col * TILE;
  const y = m.lin * TILE;
  for (let c = 0; c < m.larg; c++) {
    for (let l = 0; l < m.alt; l++) {
      const cx = x + c * TILE + 16;
      const cy = y + l * TILE + 16;
      for (const [dx, dy] of [[-8, -3], [9, 2], [-2, 10], [-3, -11]] as const) {
        const rx = 6 + Math.floor(rnd() * 3);
        const ry = 4.5 + Math.floor(rnd() * 2);
        p.chapaElipse(cx + dx + 1.5, cy + dy + 2, rx, ry, S);
        p.elipse(cx + dx, cy + dy, rx, ry, P, TRACO);
      }
    }
  }
}

// ---------------------------------------------------------------- Zonas

export type Segmento = readonly [x0: number, y0: number, x1: number, y1: number];

/** Folga do contorno da Zona para dentro da borda do tile. */
const DENTRO = 2;

/**
 * Segmentos (em px) do contorno de uma Zona: um por trecho reto contínuo de borda exposta, recuado
 * `DENTRO` px para dentro. Móvel dentro da Zona ('M') conta como parte dela.
 */
export function segmentosDaZona(mapa: readonly string[], letra: string): Segmento[] {
  const dentro = (col: number, lin: number) => {
    const c = mapa[lin]?.[col];
    return c === letra || c === "M";
  };
  const ehZona = (col: number, lin: number) => mapa[lin]?.[col] === letra;
  const saida: Segmento[] = [];
  const lins = mapa.length;
  const cols = mapa[0].length;
  // bordas horizontais (cima e baixo)
  for (const [dl, base] of [[-1, DENTRO], [1, TILE - DENTRO]] as const) {
    for (let lin = 0; lin < lins; lin++) {
      let ini = -1;
      for (let col = 0; col <= cols; col++) {
        const exposta = col < cols && ehZona(col, lin) && !dentro(col, lin + dl);
        if (exposta && ini < 0) ini = col;
        if (!exposta && ini >= 0) {
          const x0 = ini * TILE + (dentro(ini - 1, lin) ? 0 : DENTRO);
          const x1 = col * TILE - (dentro(col, lin) ? 0 : DENTRO);
          saida.push([x0, lin * TILE + base, x1, lin * TILE + base]);
          ini = -1;
        }
      }
    }
  }
  // bordas verticais (esquerda e direita)
  for (const [dc, base] of [[-1, DENTRO], [1, TILE - DENTRO]] as const) {
    for (let col = 0; col < cols; col++) {
      let ini = -1;
      for (let lin = 0; lin <= lins; lin++) {
        const exposta = lin < lins && ehZona(col, lin) && !dentro(col + dc, lin);
        if (exposta && ini < 0) ini = lin;
        if (!exposta && ini >= 0) {
          const y0 = ini * TILE + (dentro(col, ini - 1) ? 0 : DENTRO);
          const y1 = lin * TILE - (dentro(col, lin) ? 0 : DENTRO);
          saida.push([col * TILE + base, y0, col * TILE + base, y1]);
          ini = -1;
        }
      }
    }
  }
  return saida;
}

/** Contorno tracejado fino de tinta no limite de cada Zona: mostra onde a conversa fica isolada. */
function bordaZonas(p: Caneta, mapa: readonly string[]) {
  const letras = new Set<string>();
  for (const linha of mapa) for (const c of linha) if (isZona(c)) letras.add(c);
  for (const letra of letras)
    for (const [x0, y0, x1, y1] of segmentosDaZona(mapa, letra)) p.tracejada([[x0, y0], [x1, y1]], [5, 4], FINO + 0.5);
}

export type ContornoZona = { canvas: HTMLCanvasElement; res: number; x: number; y: number };

/** Contorno da Zona onde você está: amarelo sólido sobre uma linha de tinta (o amarelo da regra do tema). */
export function contornoZonaAtiva(template: Template, letra: string, res: number): ContornoZona {
  const segs = segmentosDaZona(TEMPLATES_LUGAR[template].mapa, letra);
  const folga = 5;
  const x0 = Math.min(...segs.map((s) => Math.min(s[0], s[2]))) - folga;
  const y0 = Math.min(...segs.map((s) => Math.min(s[1], s[3]))) - folga;
  const x1 = Math.max(...segs.map((s) => Math.max(s[0], s[2]))) + folga;
  const y1 = Math.max(...segs.map((s) => Math.max(s[1], s[3]))) + folga;
  const [canvas, p] = criarCanvas(x1 - x0, y1 - y0, res);
  const q = p.em(-x0, -y0);
  for (const [a, b, c, d] of segs) q.linha([[a, b], [c, d]], 5, MUNDO.tinta);
  for (const [a, b, c, d] of segs) q.linha([[a, b], [c, d]], 2.5, MUNDO.amarelo);
  return { canvas, res, x: x0, y: y0 };
}

// ---------------------------------------------------------------- decoração de parede

function janela(p: Caneta, m: Movel) {
  const { papel: P, meio: M } = MUNDO;
  const x = m.col * TILE + 4;
  const y = 6;
  const w = m.larg * TILE - 8;
  const h = 20;
  p.caixa(x, y, w, h, P, 3);
  const vx = x + 3.5;
  const vy = y + 3.5;
  const vw = w - 7;
  const vh = h - 7;
  p.caixa(vx, vy, vw, vh, M, 1.5, FINO);
  // sol, nuvem e colinas
  p.elipse(vx + vw - 7, vy + 4.5, 2.6, 2.6, P, FINO + 0.5);
  p.nuvem([[vx + 6, vy + 4, 2.4], [vx + 9.5, vy + 3.4, 2.8], [vx + 13, vy + 4, 2.2]], P, null, FINO);
  p.linha(Array.from({ length: Math.floor(vw / 2) + 1 }, (_, i): Ponto => [vx + i * 2, vy + vh - 1.5 - 2 * (0.5 + 0.5 * Math.sin(i / 2.2 + 1))]), FINO);
  // travessas
  const divs = m.larg * 2;
  for (let i = 1; i < divs; i++) p.linha([[x + (w * i) / divs, y + 1], [x + (w * i) / divs, y + h - 1]], TRACO);
  p.linha([[x + 1, y + h / 2], [x + w - 1, y + h / 2]], TRACO);
  // soleira
  p.caixa(x - 2, y + h - 1, w + 4, 4, P, 1.5);
}

function quadro(p: Caneta, m: Movel) {
  const { papel: P, meio: M, tinta: T } = MUNDO;
  const w = m.larg === 1 ? 20 : 44;
  const x = m.col * TILE + (m.larg * TILE - w) / 2;
  const y = 7;
  const h = 17;
  p.caixa(x, y, w, h, P, 2);
  p.caixa(x + 3, y + 3, w - 6, h - 6, M, 1, FINO);
  if (m.variante === "b") {
    p.elipse(x + w * 0.35, y + 8.5, 3.2, 3.2, T, 0);
    p.caixa(x + w * 0.55, y + 5.5, w * 0.22, h - 11, P, 0.5, FINO + 0.5);
  } else {
    p.elipse(x + w * 0.32, y + 7.5, 2.4, 2.4, P, FINO + 0.5);
    p.poli([[x + 3.5, y + h - 3.5], [x + w * 0.5, y + 8.5], [x + w - 3.5, y + h - 3.5]], T, 0);
  }
}

function relogio(p: Caneta, m: Movel) {
  const { papel: P, tinta: T } = MUNDO;
  const cx = m.col * TILE + 16;
  const cy = 15;
  p.elipse(cx, cy, 9.5, 9.5, P);
  for (const [dx, dy] of [[0, -6.6], [6.6, 0], [0, 6.6], [-6.6, 0]] as const) p.ponto(cx + dx, cy + dy, 0.9);
  p.linha([[cx, cy], [cx, cy - 5]], 1.6);
  p.linha([[cx, cy], [cx + 3.4, cy]], 1.6);
  p.ponto(cx, cy, 1.2, T);
}

function lousa(p: Caneta, m: Movel, rnd: () => number) {
  const { papel: P, meio: M } = MUNDO;
  const x = m.col * TILE + 4;
  const y = 6;
  const w = m.larg * TILE - 8;
  const h = 19;
  p.caixa(x, y, w, h, P, 2.5);
  // rabiscos
  for (let i = 0; i < 3; i++) {
    const len = 14 + Math.floor(rnd() * (w - 56));
    p.curva(x + 6, y + 6 + i * 4, x + 6 + len / 2, y + 4 + i * 4, x + 6 + len, y + 6 + i * 4);
  }
  // post-its
  for (let i = 0; i < 3; i++) p.caixa(x + w - 14 - i * 11, y + 4 + (i % 2) * 3, 8, 8, M, 0.8, FINO + 0.5);
  p.caixa(x + w / 2 - 6, y + h - 1, 12, 3, M, 1.2, FINO + 0.5);
}

// ---------------------------------------------------------------- paredes

/** Porta no tile (col, lin)? */
const portaNo = (mapa: readonly string[], col: number, lin: number) => isPorta(mapa[lin]?.[col]);

/** Chama `f(i0, i1)` para cada trecho contínuo de índices `[i0, i1)` em `[de, ate)` que não é porta. */
function trechos(de: number, ate: number, ehPorta: (i: number) => boolean, f: (i0: number, i1: number) => void) {
  let ini = -1;
  for (let i = de; i <= ate; i++) {
    const ok = i < ate && !ehPorta(i);
    if (ok && ini < 0) ini = i;
    if (!ok && ini >= 0) {
      f(ini, i);
      ini = -1;
    }
  }
}

/** Contorno do limite entre a parede e o chão, interrompido nas portas. */
function contornoParede(p: Caneta, mapa: readonly string[]) {
  const cols = mapa[0].length;
  const lins = mapa.length;
  const W = cols * TILE;
  const H = lins * TILE;
  trechos(1, cols - 1, (c) => portaNo(mapa, c, 0), (a, b) => p.linha([[a * TILE, TILE], [b * TILE, TILE]], TRACO));
  trechos(1, cols - 1, (c) => portaNo(mapa, c, lins - 1), (a, b) => p.linha([[a * TILE, H - TILE], [b * TILE, H - TILE]], TRACO));
  trechos(1, lins - 1, (l) => portaNo(mapa, 0, l), (a, b) => p.linha([[TILE, a * TILE], [TILE, b * TILE]], TRACO));
  trechos(1, lins - 1, (l) => portaNo(mapa, cols - 1, l), (a, b) => p.linha([[W - TILE, a * TILE], [W - TILE, b * TILE]], TRACO));
}

function paredeInterna(p: Caneta, mapa: readonly string[], W: number, H: number, rnd: () => number) {
  const { parede, meio, sombra } = MUNDO;
  const cols = mapa[0].length;
  const lins = mapa.length;

  // sombra chapada das paredes no chão (a luz vem de cima à esquerda)
  for (let c = 1; c < cols - 1; c++) if (!portaNo(mapa, c, 0)) p.chapa(c * TILE, TILE, TILE, 9, sombra);
  for (let l = 1; l < lins - 1; l++) if (!portaNo(mapa, 0, l)) p.chapa(TILE, l * TILE, 7, TILE, sombra);

  // topo das paredes visto de cima, com um filete mais claro na face voltada para dentro
  p.chapa(0, 0, W, TILE, sombra);
  p.chapa(0, H - TILE, W, TILE, sombra);
  p.chapa(0, TILE, TILE, H - TILE * 2, sombra);
  p.chapa(W - TILE, TILE, TILE, H - TILE * 2, sombra);
  p.chapa(TILE, H - TILE, W - TILE * 2, 5, meio);
  p.chapa(TILE - 5, TILE, 5, H - TILE * 2, meio);
  p.chapa(W - TILE, TILE, 5, H - TILE * 2, meio);

  // face frontal da parede do fundo: tampo, parede clara e rodapé
  p.chapa(TILE, 0, W - TILE * 2, TILE, parede);
  p.chapa(TILE, 0, W - TILE * 2, 5, sombra);
  p.chapa(TILE, 26, W - TILE * 2, 6, meio);
  p.linha([[TILE, 5], [W - TILE, 5]], 1.5);
  p.linha([[TILE, 26], [W - TILE, 26]], 1.5);
  // rara: uma emenda de painel de vez em quando
  for (let c = 2; c < cols - 2; c++) if (!portaNo(mapa, c, 0) && rnd() < 0.18) p.linha([[c * TILE + 16, 9], [c * TILE + 16, 23]]);

  contornoParede(p, mapa);
  p.forma((c) => c.rect(1, 1, W - 2, H - 2), null, TRACO);
}

/** Trilha do limite interno da sebe: moitas de 16 px que avançam para o chão. Nas portas, reta (e, para o traço, sem linha). */
function trilhaSebe(c: CanvasRenderingContext2D, mapa: readonly string[], W: number, H: number, oy: number, contorno: boolean) {
  const cols = mapa[0].length;
  const lins = mapa.length;
  const R = 8;
  const reta = (x: number, y: number) => (contorno ? c.moveTo(x, y) : c.lineTo(x, y));
  c.moveTo(TILE, TILE + oy);
  for (let t = 1; t < cols - 1; t++) {
    if (portaNo(mapa, t, 0)) reta((t + 1) * TILE, TILE + oy);
    else for (let k = 0; k < 2; k++) c.arc(t * TILE + R + k * 2 * R, TILE + oy, R, Math.PI, 0, true);
  }
  for (let t = 1; t < lins - 1; t++) {
    if (portaNo(mapa, cols - 1, t)) reta(W - TILE, (t + 1) * TILE + oy);
    else for (let k = 0; k < 2; k++) c.arc(W - TILE, t * TILE + R + k * 2 * R + oy, R, -Math.PI / 2, Math.PI / 2, true);
  }
  for (let t = cols - 2; t >= 1; t--) {
    if (portaNo(mapa, t, lins - 1)) reta(t * TILE, H - TILE + oy);
    else for (let k = 1; k >= 0; k--) c.arc(t * TILE + R + k * 2 * R, H - TILE + oy, R, 0, Math.PI, true);
  }
  for (let t = lins - 2; t >= 1; t--) {
    if (portaNo(mapa, 0, t)) reta(TILE, t * TILE + oy);
    else for (let k = 1; k >= 0; k--) c.arc(TILE, t * TILE + R + k * 2 * R + oy, R, Math.PI / 2, -Math.PI / 2, true);
  }
  if (!contorno) c.closePath();
}

function sebe(p: Caneta, mapa: readonly string[], W: number, H: number, rnd: () => number) {
  const { parede, sombra } = MUNDO;
  const massa = (oy: number) => (c: CanvasRenderingContext2D) => {
    c.rect(-4, -4 + oy, W + 8, H + 8);
    trilhaSebe(c, mapa, W, H, oy, false);
  };
  p.forma(massa(5), sombra, 0, "evenodd"); // sombra chapada no gramado
  p.forma(massa(0), parede, 0, "evenodd");
  // moitas: curvinhas de folha em pontos soltos
  for (let i = 0; i < 46; i++) {
    const lado = Math.floor(rnd() * 4);
    const x = lado < 2 ? TILE + rnd() * (W - TILE * 2) : lado === 2 ? 6 + rnd() * 18 : W - 24 + rnd() * 18;
    const y = lado === 0 ? 4 + rnd() * 18 : lado === 1 ? H - 26 + rnd() * 18 : TILE + rnd() * (H - TILE * 2);
    if (portaNo(mapa, Math.floor(x / TILE), Math.floor(y / TILE))) continue;
    p.forma((c) => c.arc(x, y, 2.6, Math.PI * 0.15, Math.PI * 1.35), null, FINO);
  }
  p.forma((c) => trilhaSebe(c, mapa, W, H, 0, true), null, TRACO);
  p.forma((c) => c.rect(1, 1, W - 2, H - 2), null, TRACO);
}

// ---------------------------------------------------------------- portas

function capacho(p: Caneta, col: number, lin: number, lado: Lado) {
  // tapete no tile de chão à frente da porta (onde o Avatar chega)
  const cx = col * TILE + 16;
  const cy = lin * TILE + 16;
  const [dx, dy] = lado === "baixo" ? [0, TILE] : lado === "cima" ? [0, -TILE] : lado === "direita" ? [TILE, 0] : [-TILE, 0];
  const horiz = lado === "baixo" || lado === "cima";
  const w = horiz ? 26 : 16;
  const h = horiz ? 14 : 26;
  const x = cx + dx - w / 2;
  const y = cy + dy - h / 2;
  p.caixa(x, y, w, h, MUNDO.meio, 3);
  for (let i = 5; i < (horiz ? w - 3 : h - 3); i += 4) {
    if (horiz) p.linha([[x + i, y + 4], [x + i, y + h - 4]]);
    else p.linha([[x + 4, y + i], [x + w - 4, y + i]]);
  }
}

function portaVisual(p: Caneta, tema: Tema, col: number, lin: number, lado: Lado) {
  const { papel: P, meio: M, sombra: S, tinta: T, chao } = MUNDO;
  const x = col * TILE;
  const y = lin * TILE;
  if (lado === "baixo") {
    // porta aberta na face da parede de cima: vão escuro com batente e a luz da passagem no chão
    p.poli([[x + 6, y + TILE + 1], [x + TILE - 6, y + TILE + 1], [x + TILE - 1, y + TILE + 12], [x + 1, y + TILE + 12]], P, 0);
    p.caixa(x + 2, y + 3, TILE - 4, TILE - 1, P, 3, 0);
    p.poli([[x + 2, y + TILE + 1], [x + 2, y + 6], [x + 5, y + 3], [x + TILE - 5, y + 3], [x + TILE - 2, y + 6], [x + TILE - 2, y + TILE + 1]], null, TRACO, false);
    p.caixa(x + 6, y + 7, TILE - 12, TILE - 6, T, 2, 0);
  } else if (lado === "cima") {
    // vão na parede de baixo: batentes de tinta e a luz de fora
    p.chapa(x + 5, y - 1, TILE - 10, TILE + 2, P);
    p.linha([[x + 5, y - 1], [x + 5, y + TILE]], TRACO);
    p.linha([[x + TILE - 5, y - 1], [x + TILE - 5, y + TILE]], TRACO);
    p.caixa(x + 7, y + 1, TILE - 14, 6, M, 2, FINO + 0.5); // degrau
  } else if (tema.clima === "externo") {
    // portão na sebe: dois mourões marcam a passagem
    p.chapa(x - 1, y, TILE + 2, TILE, chao);
    p.chapaElipse(x + 17, y + 6, 10, 3, S);
    p.chapaElipse(x + 17, y + TILE - 2, 10, 3, S);
    for (const py of [y - 2, y + TILE - 8]) p.caixa(x + 8, py, 16, 10, M, 3);
  } else {
    // parede lateral: vão com batentes de tinta e soleira
    const dir = lado === "esquerda"; // porta na parede direita; entra-se pela esquerda
    p.chapa(x - 1, y + 5, TILE + 2, TILE - 10, P);
    p.linha([[x - 1, y + 5], [x + TILE + 1, y + 5]], TRACO);
    p.linha([[x - 1, y + TILE - 5], [x + TILE + 1, y + TILE - 5]], TRACO);
    p.caixa(dir ? x : x + TILE - 7, y + 8, 7, TILE - 16, M, 2, FINO + 0.5); // soleira
  }
}

// ---------------------------------------------------------------- API

/** Desenha o chão, as paredes, os tapetes, a decoração de parede e as portas do Lugar (canvas com `res` px por unidade). */
export function desenharMapa(template: Template, res: number): HTMLCanvasElement {
  const t = TEMPLATES_LUGAR[template];
  const tema = TEMAS[template];
  const mapa = t.mapa;
  const lins = mapa.length;
  const cols = mapa[0].length;
  const W = cols * TILE;
  const H = lins * TILE;
  const [canvas, p] = criarCanvas(W, H, res);
  const rnd = aleatorio(hashTexto(template));

  p.chapa(0, 0, W, H, MUNDO.chao);
  if (tema.piso === "tabua") pisoTabua(p, W, H, rnd);
  else if (tema.piso === "ladrilho") pisoLadrilho(p, W, H);
  else pisoGrama(p, W, H, rnd);

  for (const m of t.moveis) {
    const r = aleatorio(hashTexto(`${m.tipo}${m.col},${m.lin}`));
    if (m.tipo === "deck") deck(p, m, r);
    else if (m.tipo === "caminho") caminho(p, m, r);
  }
  for (const m of t.moveis) if (m.tipo === "tapete") tapete(p, m);

  bordaZonas(p, mapa);

  if (tema.clima === "externo") sebe(p, mapa, W, H, rnd);
  else paredeInterna(p, mapa, W, H, rnd);

  for (const m of t.moveis) {
    if (!TIPOS_PAREDE.has(m.tipo)) continue;
    const r = aleatorio(hashTexto(`${m.tipo}${m.col},${m.lin}`));
    if (m.tipo === "janela") janela(p, m);
    else if (m.tipo === "quadro") quadro(p, m);
    else if (m.tipo === "relogio") relogio(p, m);
    else if (m.tipo === "lousa") lousa(p, m, r);
  }

  for (const porta of portasDoMapa(template, () => "")) {
    if (tema.clima === "interno") capacho(p, porta.col, porta.lin, porta.lado);
    portaVisual(p, tema, porta.col, porta.lin, porta.lado);
  }
  return canvas;
}

const objetosCache = new Map<string, ObjetoMapa[]>();

/** Sprites ordenáveis por profundidade: cada Móvel com desenho próprio (e as luzinhas). */
export function objetosDoMapa(template: Template, res: number): ObjetoMapa[] {
  const guardado = objetosCache.get(`${template}:${res}`);
  if (guardado) return guardado;
  const saida: ObjetoMapa[] = [];
  for (const m of TEMPLATES_LUGAR[template].moveis) {
    if (m.tipo === "luzinhas") {
      saida.push(luzinhas(template, m, res));
      continue;
    }
    const s = desenharMovel(m, res);
    if (!s) continue;
    saida.push({
      chave: `mov:${template}:${m.tipo}:${m.col},${m.lin}:${res}`,
      canvas: s.canvas,
      res,
      x: m.col * TILE + s.dx,
      y: m.lin * TILE + s.dy,
      // profundidade pela base: o Avatar (pela sola) passa atrás de quem está mais abaixo
      depth: (movelSolido(m) ? baseSolida(m).y + baseSolida(m).alt : (m.lin + m.alt) * TILE) + s.prof,
      movel: m,
    });
  }
  objetosCache.set(`${template}:${res}`, saida);
  return saida;
}

/** Fio de luzinhas pendurado entre dois pontos (fica sempre acima dos Avatares). */
function luzinhas(template: Template, m: Movel, res: number): ObjetoMapa {
  const L = m.larg * TILE;
  const sag = 14;
  const [canvas, p] = criarCanvas(L + 16, sag + 28, res);
  const y0 = 6;
  const yDe = (x: number) => y0 + sag * (1 - Math.pow((2 * x) / L - 1, 2));
  p.linha(Array.from({ length: Math.floor(L / 4) + 1 }, (_, i): Ponto => [8 + i * 4, yDe(i * 4)]), 1.5);
  let i = 0;
  for (let x = 10; x < L; x += 18) {
    const y = yDe(x) + 1;
    p.caixa(x + 6.5, y, 3, 3, MUNDO.tinta, 0.8, 0);
    p.elipse(x + 8, y + 7, 3.4, 3.8, i % 2 ? MUNDO.meio : MUNDO.papel, FINO + 0.5);
    p.linha([[x + 2, y + 7], [x, y + 7]]);
    p.linha([[x + 14, y + 7], [x + 16, y + 7]]);
    p.linha([[x + 8, y + 13], [x + 8, y + 15]]);
    i++;
  }
  return { chave: `mov:${template}:luzinhas:${m.col},${m.lin}:${res}`, canvas, res, x: m.col * TILE - 8, y: m.lin * TILE - y0 + 4, depth: 900000, movel: m };
}

/** Portas do mapa com o lado por onde se entra (para posicionar o rótulo com o nome do destino). */
export function portasDoMapa(template: Template, nomeDe: (destino: Template) => string): PortaMapa[] {
  const t = TEMPLATES_LUGAR[template];
  const saida: PortaMapa[] = [];
  t.mapa.forEach((linha, lin) => {
    [...linha].forEach((c, col) => {
      if (!isPorta(c)) return;
      const porta = t.portas[c];
      if (!porta) return;
      const lado = lin === 0 ? "baixo" : lin === t.mapa.length - 1 ? "cima" : col === 0 ? "direita" : "esquerda";
      saida.push({ col, lin, texto: nomeDe(porta.destino), lado });
    });
  });
  return saida;
}

/** Retângulo (em tiles) de cada Zona do mapa, para desenhar o rótulo. */
export function zonasDoMapa(template: Template): ZonaMapa[] {
  const t = TEMPLATES_LUGAR[template];
  const achadas = new Map<string, ZonaMapa>();
  t.mapa.forEach((linha, lin) => {
    [...linha].forEach((c, col) => {
      if (!isZona(c)) return;
      const z = achadas.get(c);
      if (!z) achadas.set(c, { letra: c, ...t.zonas[c], col0: col, lin0: lin, col1: col, lin1: lin });
      else {
        z.col0 = Math.min(z.col0, col);
        z.lin0 = Math.min(z.lin0, lin);
        z.col1 = Math.max(z.col1, col);
        z.lin1 = Math.max(z.lin1, lin);
      }
    });
  });
  return [...achadas.values()];
}
