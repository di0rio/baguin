import type { Altura, Direcao, Pecas, Preenchimento } from "@baguin/shared";

/**
 * Avatar cartoon vetorial, desenhado por código (`Path2D`) em duas tintas: papel e tinta. Referência de proporção
 * e traço: docs/rascunhos/avatar.html. Tudo é desenhado em "unidades" (a tela do rascunho, 240 de largura); o mundo
 * mostra `UNIDADE` unidades por px.
 *
 * O Avatar é uma marionete: o desenho (`montarAvatar`) é uma lista de partes ordenadas e a animação (`poseDe`) só
 * move as partes. Quem pinta (`pintarAvatar` no canvas do DOM, `renderizarParte` para texturas do Phaser) não conhece
 * as Peças.
 */

export const TINTA = "#000";
export const PAPEL = "#FFF";
/** Traço do rascunho (unidades). */
const T = 7;
/** Traço mais grosso no tamanho do mundo, para olheira e boca não sumirem (45% no rascunho). */
export const ESPESSURA_MUNDO = 1.45;

// ---------------------------------------------------------------- quadro

/** Unidades de desenho por px lógico do mundo. */
export const UNIDADE = 10;
/** Retângulo do desenho (unidades): cabe cabelo alto, braços erguidos e a sombra. */
export const QUADRO = { x0: -15, y0: -30, x1: 255, y1: 290 } as const;
/** Tamanho lógico do quadro (px do mundo). */
export const FRAME_L = (QUADRO.x1 - QUADRO.x0) / UNIDADE;
export const FRAME_A = (QUADRO.y1 - QUADRO.y0) / UNIDADE;
/** Onde o Avatar pisa (a sola), em unidades e em px do quadro a partir do topo. */
export const SOLA = { x: 120, y: 272 } as const;
export const SOLA_Y = (SOLA.y - QUADRO.y0) / UNIDADE;
/** Topo do cabelo mais alto (altura "alto"), em px do quadro, para posicionar etiqueta e Balão. */
export const TOPO_Y = (-10 - QUADRO.y0) / UNIDADE;

// ---------------------------------------------------------------- vistas

export type Vista = "frente" | "costas" | "lado";
/** Direções do mundo, na ordem em que o editor as lista. */
export const ORDEM_DIRECOES: readonly Direcao[] = ["baixo", "esquerda", "direita", "cima"];

/** Baixo mostra a frente, cima as costas; esquerda e direita mostram o lado (a direita é a esquerda espelhada). */
export function vistaDe(dir: Direcao): { vista: Vista; espelhar: boolean } {
  if (dir === "baixo") return { vista: "frente", espelhar: false };
  if (dir === "cima") return { vista: "costas", espelhar: false };
  return { vista: "lado", espelhar: dir === "direita" };
}

// ---------------------------------------------------------------- geometria

type Matriz = readonly [number, number, number, number, number, number];

/** Uma forma: preenchimento e/ou traço. Só `PAPEL` e `TINTA` aparecem (exceto a sombra, que é tinta translúcida). */
export type Op = {
  /** Caminho SVG. */
  d: string;
  fill?: string;
  /** Largura do traço (unidades, antes da espessura); sem valor, não tem traço. */
  traco?: number;
  cor?: string;
  /** Recorte (caminho SVG) para estampas. */
  clip?: string;
  /** Matriz aplicada à geometria (não ao traço). */
  m?: Matriz;
  alfa?: number;
};

export type ParteId = "sombra" | "pernaA" | "pernaB" | "cabeloAtras" | "bracoA" | "bracoB" | "tronco" | "cabeca";
type Caixa = { x0: number; y0: number; x1: number; y1: number };

export type Parte = {
  id: ParteId;
  /** `superior` acompanha a respiração e o balanço do tronco (gira em torno do quadril). */
  grupo: "chao" | "pernas" | "superior";
  ops: Op[];
  /** A Altura desce ou sobe a parte de cima (o quadril fica onde está). */
  dy: number;
  /** Retângulo que contém a parte (unidades, já com `dy`), para a textura. */
  caixa: Caixa;
  /** Eixo de giro (unidades, já com `dy`): topo da perna, ombro. */
  pivo: { x: number; y: number };
};

export type Desenho = { vista: Vista; altura: Altura; quadril: { x: number; y: number }; partes: Parte[] };

const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const giro = (graus: number, cx: number, cy: number): Matriz => {
  const a = (graus * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, s, -s, c, cx - cx * c + cy * s, cy - cx * s - cy * c];
};

const forma = (d: string, fill?: string, traco = T, extra: Partial<Op> = {}): Op => ({ d, fill, traco, ...extra });
/** Ponto cheio, sem traço. */
const ponto = (x: number, y: number, r: number, fill = TINTA) => forma(circ(x, y, r), fill, 0);
const linha = (d: string, traco: number) => forma(d, undefined, traco);

const cor = (p: Preenchimento) => (p === "tinta" ? TINTA : PAPEL);

// ---------------------------------------------------------------- cabelos

type Cabelo = {
  /** Silhueta atrás da cabeça. */
  b?: string;
  /** Linha da franja (a testa é coberta acima dela). */
  f?: string;
  /** Versão de baixo de boné e touca. */
  u?: string;
  /** Extra atrás da silhueta (coque). */
  coque?: boolean;
  /** Crista (moicano), sobre a cabeça. */
  c?: string;
  /** Cabeça só de cúpula (sem franja): careca e moicano. */
  cupula?: boolean;
  /** Altura do arco do fone. */
  t: number;
};

const CABELOS: Record<Pecas["cabelo"]["estilo"], Cabelo> = {
  espetado: {
    b: "M50 149C29 128 29 89.5 46.5 68.5L29 54.5L57 54.5C71 33.5 95.5 23 116.5 26.5L123.5 9L137.5 28C165.5 26.5 190 40.5 200.5 65L221.5 58L207.5 82.5C218 107 211 135 193.5 152.5Z",
    f: "M66 84L80 118L92 100L106 124L120 102L134 124L148 100L160 118L174 84",
    u: "M62 84L38 78L50 98L34 110L54 118C52 134 56 144 62 152L178 152C184 144 188 134 186 118L206 110L190 98L202 78L178 84Z",
    t: 16,
  },
  redondo: {
    b: "M43 100a77 77 0 1 0 154 0a77 77 0 1 0 -154 0Z",
    f: "M66 84Q120 132 174 84",
    u: "M60 84C36 90 38 146 68 160L172 160C202 146 204 90 180 84Z",
    t: 15,
  },
  longo: {
    b: "M44 198C32 120 43 26 120 26C197 26 208 120 196 198Z",
    f: "M66 84C92 128 150 116 174 84",
    u: "M62 82C40 112 36 160 44 198L196 198C204 160 200 112 178 82Z",
    t: 18,
  },
  chanel: {
    b: "M46 168C32 104 48 28 120 28C192 28 208 104 194 168Z",
    f: "M66 84V108H174V84",
    u: "M62 82C40 104 38 142 46 168L194 168C202 142 200 104 178 82Z",
    t: 20,
  },
  tigela: {
    b: "M58 112C50 56 84 30 120 30C156 30 190 56 182 112Z",
    f: "M66 84Q68 112 120 112Q172 112 174 84",
    u: "M60 84C56 96 56 106 58 112L182 112C184 106 184 96 180 84Z",
    t: 22,
  },
  coque: {
    b: "M60 108C52 58 84 34 120 34C156 34 188 58 180 108Z",
    f: "M66 84Q93 98 120 86Q147 98 174 84",
    u: "M60 84C56 94 58 104 60 108L180 108C182 104 184 94 180 84Z",
    coque: true,
    t: 26,
  },
  moicano: { c: "M108 100C102 76 97 50 104 30C108 16 132 16 136 30C143 50 138 76 132 100Z", cupula: true, t: 38 },
  careca: { cupula: true, t: 38 },
};
// Moicano visto de lado: a crista vira uma faixa que acompanha o topo da cabeça.
const CRISTA_LADO = "M82 62C84 34 106 14 128 18C150 22 166 44 160 70C146 48 104 44 82 62Z";

const CUPULA = "M66 86C60 150 85 184 120 184C155 184 180 150 174 86C174 60 152 44 120 44C88 44 66 60 66 86Z";
const ROSTO_FORMA = "M66 84C60 150 85 184 120 184C155 184 180 150 174 84";
const ORELHA_E = "M66 128C51 124 49 150 67 150";
const ORELHA_D = "M174 128C189 124 191 150 173 150";

// ---------------------------------------------------------------- rostos

/** Olhos e boca separados: a Expressão (boca mexendo, dormindo, zíper) troca só o que muda. */
export type Rosto = { olhos: Op[]; boca: Op[] };

export const ROSTOS: Record<Pecas["rosto"], Rosto> = {
  sono: {
    olhos: [
      linha("M90 138h20M130 138h20", 6),
      forma("M93.5 138a6.5 6.5 0 0 0 13 0zM133.5 138a6.5 6.5 0 0 0 13 0z", TINTA, 2),
      linha("M93 151q7 4 14 0M133 151q7 4 14 0", 3),
    ],
    boca: [linha("M107 165q6 -5 13 0q6 5 13 -2", 5)],
  },
  feliz: { olhos: [ponto(100, 139, 6), ponto(140, 139, 6)], boca: [linha("M105 160q15 13 30 0", 5)] },
  bravo: {
    olhos: [linha("M88 126l22 8M152 126l-22 8", 6), ponto(101, 144, 5), ponto(139, 144, 5)],
    boca: [linha("M107 169q13 -9 26 0", 5)],
  },
  sorrisao: {
    olhos: [linha("M90 143q10 -11 20 0M130 143q10 -11 20 0", 5)],
    boca: [forma("M104 158h32q-4 18 -16 18q-12 0 -16 -18z", TINTA, 4)],
  },
  desconfiado: {
    olhos: [linha("M90 137h20", 6), ponto(101, 144, 4), linha("M130 127q10 -7 20 0", 5), ponto(140, 140, 5.5)],
    boca: [linha("M108 168l24 -5", 5)],
  },
  fofo: {
    olhos: [ponto(99, 140, 9), ponto(141, 140, 9), ponto(96, 137, 3, PAPEL), ponto(138, 137, 3, PAPEL)],
    boca: [linha("M113 162q7 7 14 0", 4)],
  },
};

// O rosto de lado: encolhe e vai para a frente (esquerda) da cabeça.
const ROSTO_LADO: Matriz = [0.8, 0, 0, 1, 2, 0];
const comM = (ops: Op[], m: Matriz): Op[] => ops.map((o) => ({ ...o, m }));

// ---------------------------------------------------------------- medidas por Altura

/** `perna`: parte visível das pernas; `tronco`: altura do bloco. A cabeça não muda. */
const ALTURAS: Record<Altura, { perna: number; tronco: number }> = {
  baixo: { perna: 28, tronco: 54 },
  medio: { perna: 36, tronco: 60 },
  alto: { perna: 46, tronco: 66 },
};

/** Quanto a parte de cima sobe ou desce com a Altura (médio = 0). */
export const deslocamentoDe = (altura: Altura) => SOLA.y - ALTURAS[altura].perna - ALTURAS[altura].tronco - 176;

// ---------------------------------------------------------------- montagem

const caixa = (x0: number, y0: number, x1: number, y1: number): Caixa => ({ x0, y0, x1, y1 });
const em = (c: Caixa, dy: number): Caixa => ({ ...c, y0: c.y0 + dy, y1: c.y1 + dy });

function estampa(p: Preenchimento, recorte: string): Op[] {
  if (p === "listra") return [forma([189, 205, 221, 237].map((y) => `M86 ${y}h68v8h-68z`).join(""), TINTA, 0, { clip: recorte })];
  if (p === "bolinha") {
    const pontos = [[105, 192], [122, 192], [139, 192], [113, 207], [131, 207], [105, 222], [122, 222], [139, 222], [113, 237], [131, 237]];
    return [forma(pontos.map(([x, y]) => circ(x, y, 4.5)).join(""), TINTA, 0, { clip: recorte })];
  }
  if (p === "xadrez") return [forma("M84 192H156M84 206H156M84 220H156M84 234H156M105 172V250M120 172V250M135 172V250", undefined, 3, { clip: recorte })];
  return [];
}

function acessorio(pecas: Pecas, vista: Vista, ac: string): Op[] {
  const ai = ac === TINTA ? PAPEL : TINTA;
  const t = CABELOS[pecas.cabelo.estilo].t;
  switch (pecas.acessorio) {
    case "oculos": {
      if (vista === "costas") return [];
      const lentes = [forma(circ(100, 140, 15), undefined, 5), forma(circ(140, 140, 15), undefined, 5), linha("M115 138q5 -4 10 0", 5)];
      if (vista === "lado") return [...comM(lentes, ROSTO_LADO), linha("M126 138L142 135", 5)];
      return [...lentes, linha("M85 137L67 131M155 137L173 131", 5)];
    }
    case "bone": {
      const copa = forma("M64 80C60 40 92 20 120 20C148 20 180 40 176 80Z", ac);
      const botao = forma(circ(120, 20, 5), ac, 5);
      if (vista === "costas") return [copa, linha("M100 76q20 8 40 0", 4), botao];
      if (vista === "lado") return [copa, forma("M70 84C46 74 22 78 14 92C26 104 54 104 74 98Z", ac), botao];
      return [copa, forma("M56 80Q120 72 184 80Q182 102 120 104Q58 102 56 80Z", ac), botao];
    }
    case "fone": {
      const claro = ac === PAPEL;
      const lado = vista === "lado";
      const arco = lado ? `M148 118C150 72 140 ${t} 122 ${t}` : `M53 132C46 70 78 ${t} 120 ${t}C162 ${t} 194 70 187 132`;
      const fones = lado ? [rr(136, 114, 24, 42, 11)] : [rr(41, 114, 24, 42, 11), rr(175, 114, 24, 42, 11)];
      // Sobre cabelo em tinta o arco vira um tubo claro com contorno.
      const banda = claro ? [linha(arco, 13), forma(arco, undefined, 5, { cor: PAPEL })] : [linha(arco, 8)];
      return [...banda, ...fones.map((d) => forma(d, ac))];
    }
    case "touca": {
      const listras = forma("M80 82v12M100 82v12M120 82v12M140 82v12M160 82v12", undefined, 3, { cor: ai });
      return [forma(circ(120, 16, 11), ac), forma("M62 90C58 40 90 22 120 22C150 22 182 40 178 90Z", ac), forma(rr(56, 76, 128, 24, 11), ac), listras];
    }
    default:
      return [];
  }
}

/** Monta o Avatar numa vista: partes na ordem de desenho, cada uma com suas formas. */
export function montarAvatar(pecas: Pecas, vista: Vista, rosto: Rosto = ROSTOS[pecas.rosto]): Desenho {
  const { perna, tronco: th } = ALTURAS[pecas.altura];
  const lh = perna + 8;
  const dy = deslocamentoDe(pecas.altura);
  const quadril = { x: 120, y: SOLA.y - perna };
  const h = CABELOS[pecas.cabelo.estilo];
  const chapeu = pecas.acessorio === "bone" || pecas.acessorio === "touca";
  const lado = vista === "lado";
  const hc = cor(pecas.cabelo.preenchimento);
  // Acessório é sempre o contrário do cabelo; sem cabelo (careca, moicano), tinta.
  const ac = h.cupula ? TINTA : hc === TINTA ? PAPEL : TINTA;
  const cc = cor(pecas.calca.preenchimento);
  const rc = pecas.roupa.preenchimento === "tinta" ? TINTA : PAPEL;

  const parte = (id: ParteId, grupo: Parte["grupo"], ops: Op[], c: Caixa, pivo = { x: quadril.x, y: quadril.y }): Parte => {
    const d = grupo === "superior" ? dy : 0;
    return { id, grupo, ops, dy: d, caixa: em(c, d), pivo: { x: pivo.x, y: pivo.y } };
  };

  // pernas: tubos arredondados, sem pé
  const ly = SOLA.y - lh;
  const xPerna = lado ? [104, 118] : [98, 124];
  const perna_ = (id: "pernaA" | "pernaB", x: number) =>
    parte(id, "pernas", [forma(rr(x, ly, 18, lh, 8), cc)], caixa(x - 9, ly - 9, x + 27, SOLA.y + 9), { x: x + 9, y: ly });

  // braços: iguais às pernas, caem colados ao tronco, sempre papel
  const braco = (id: "bracoA" | "bracoB", x: number, graus: number, px: number): Parte =>
    parte(id, "superior", [forma(rr(x, 182, 18, lh, 8), PAPEL, T, { m: giro(graus, px, 184) })], caixa(x - 12, 170, x + 30, 182 + lh + 14), { x: px, y: 183 + dy });
  const bracos = lado ? [braco("bracoA", 115, 0, 120), braco("bracoB", 111, 0, 120)] : [braco("bracoA", 74, 4, 83), braco("bracoB", 148, -4, 157)];

  // tronco: bloco arredondado único com o Preenchimento da roupa
  const bloco = lado ? rr(100, 176, 40, th, 18) : rr(90, 176, 60, th, 20);
  const corpo = parte(
    "tronco",
    "superior",
    [forma(bloco, rc, 0), ...estampa(pecas.roupa.preenchimento, bloco), forma(bloco)],
    caixa(lado ? 92 : 82, 168, lado ? 148 : 158, 176 + th + 10),
  );

  // cabelo atrás do corpo
  const bun = lado ? circ(150, 30, 17) : circ(120, 24, 17);
  const atras: Op[] = h.cupula ? [] : chapeu ? [forma(h.u!, hc)] : [...(h.coque ? [forma(bun, hc)] : []), forma(h.b!, hc)];
  const cabeloAtras = parte("cabeloAtras", "superior", atras, caixa(18, -12, 226, 208));

  // cabeça: orelhas, cabeça, franja, rosto e acessório
  const orelhas = [forma(ORELHA_E, PAPEL), forma(ORELHA_D, PAPEL)];
  const orelhaLado = [forma("M140 142a8 11 0 1 0 16 0a8 11 0 1 0 -16 0Z", PAPEL), linha("M145 138q5 -2 6 4", 3)];
  const crista = h.c && !chapeu ? [forma(lado ? CRISTA_LADO : h.c, hc)] : [];
  const rostoOps = [...rosto.olhos, ...rosto.boca];
  let cabeca: Op[];
  if (vista === "costas") {
    cabeca = h.cupula ? [...orelhas, forma(CUPULA, PAPEL), ...crista] : [...orelhas, forma(ROSTO_FORMA, hc)];
  } else {
    const craneo: Op[] = h.cupula
      ? [forma(CUPULA, PAPEL), ...crista]
      : [forma(ROSTO_FORMA, PAPEL), forma(`${h.f}L170 62L70 62Z`, hc, 0), linha(h.f!, T)];
    cabeca = lado ? [...craneo, ...comM(rostoOps, ROSTO_LADO), ...orelhaLado] : [...orelhas, ...craneo, ...rostoOps];
  }
  cabeca.push(...acessorio(pecas, vista, ac));
  const cabecaParte = parte("cabeca", "superior", cabeca, caixa(6, -14, 234, 196));

  const sombra = parte("sombra", "chao", [forma(`M66 274a54 9 0 1 0 108 0a54 9 0 1 0 -108 0Z`, TINTA, 0, { alfa: 0.15 })], caixa(58, 262, 182, 288));

  const a = perna_("pernaA", xPerna[0]);
  const b = perna_("pernaB", xPerna[1]);
  const [bA, bB] = bracos;
  // De lado o braço de longe fica atrás do tronco e o de perto na frente; de frente e de costas os dois ficam atrás.
  const partes = lado ? [sombra, a, b, cabeloAtras, bA, corpo, bB, cabecaParte] : [sombra, a, b, cabeloAtras, bA, bB, corpo, cabecaParte];
  return { vista, altura: pecas.altura, quadril, partes };
}

// ---------------------------------------------------------------- marionete

export type Movimento = "parado" | "andando" | "dancando";
export type Transf = { dx: number; dy: number; rot: number };
export type Pose = { superior: Transf; partes: Partial<Record<ParteId, Transf>> };

const ZERO: Transf = { dx: 0, dy: 0, rot: 0 };
const rad = (g: number) => (g * Math.PI) / 180;
/** 0 → 1 → 0, cada subida ou descida levando `meio` ms (como `alternate` com ease-in-out). */
const onda = (ms: number, meio: number) => (1 - Math.cos((Math.PI * ms) / meio)) / 2;

/**
 * Parado respira; andando alterna as pernas e balança os braços; dançando inclina o tronco e ergue os braços.
 * De lado as pernas giram em torno do quadril e o braço de perto vai contra a perna de perto. `ms` é o relógio.
 */
export function poseDe(movimento: Movimento, ms: number, vista: Vista, reduzir = false): Pose {
  const lado = vista === "lado";
  if (movimento === "parado") return { superior: reduzir ? ZERO : { dx: 0, dy: -3 * onda(ms, 1600), rot: 0 }, partes: {} };
  if (movimento === "andando") {
    const u = onda(ms, 300);
    const s = 2 * u - 1;
    const bob = { dx: 0, dy: -3 * u, rot: 0 };
    if (lado) {
      const perna = (r: number): Transf => ({ dx: 0, dy: 0, rot: r });
      return {
        superior: bob,
        partes: { pernaA: perna(0.5 * s), pernaB: perna(-0.5 * s), bracoA: perna(-0.5 * s), bracoB: perna(0.5 * s) },
      };
    }
    const braco = rad(-9 + 18 * u);
    return {
      superior: bob,
      partes: { pernaA: { dx: 0, dy: -7 * u, rot: 0 }, pernaB: { dx: 0, dy: -7 * (1 - u), rot: 0 }, bracoA: { dx: 0, dy: 0, rot: braco }, bracoB: { dx: 0, dy: 0, rot: -braco } },
    };
  }
  const u = onda(ms, 420);
  const erguido = rad(40 + 35 * u);
  return {
    superior: { dx: 0, dy: 0, rot: rad(-5 + 10 * u) },
    partes: {
      pernaA: { dx: 0, dy: -7 * u, rot: 0 },
      pernaB: { dx: 0, dy: -7 * (1 - u), rot: 0 },
      bracoA: { dx: 0, dy: 0, rot: erguido },
      bracoB: { dx: 0, dy: 0, rot: lado ? erguido : -erguido },
    },
  };
}

// ---------------------------------------------------------------- pintura

type Contexto = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function pintarOp(ctx: Contexto, op: Op, espessura: number) {
  let p = new Path2D(op.d);
  if (op.m) {
    const t = new Path2D();
    t.addPath(p, { a: op.m[0], b: op.m[1], c: op.m[2], d: op.m[3], e: op.m[4], f: op.m[5] });
    p = t;
  }
  ctx.save();
  if (op.clip) ctx.clip(new Path2D(op.clip));
  if (op.alfa !== undefined) ctx.globalAlpha = op.alfa;
  if (op.fill) {
    ctx.fillStyle = op.fill;
    ctx.fill(p);
  }
  if (op.traco) {
    ctx.lineWidth = op.traco * espessura;
    ctx.strokeStyle = op.cor ?? TINTA;
    ctx.stroke(p);
  }
  ctx.restore();
}

/** Pinta uma parte (em unidades, sem pose). */
export function pintarParte(ctx: Contexto, parte: Parte, espessura = 1) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.translate(0, parte.dy);
  for (const op of parte.ops) pintarOp(ctx, op, espessura);
  ctx.restore();
}

function girar(ctx: Contexto, t: Transf, x: number, y: number) {
  ctx.translate(x + t.dx, y + t.dy);
  ctx.rotate(t.rot);
  ctx.translate(-x, -y);
}

/** Pinta o Avatar inteiro, em unidades, na transformação atual do contexto. */
export function pintarAvatar(ctx: Contexto, desenho: Desenho, pose: Pose, opcoes: { espessura?: number; espelhar?: boolean; sombra?: boolean } = {}) {
  const { espessura = 1, espelhar = false, sombra = true } = opcoes;
  ctx.save();
  if (espelhar) {
    ctx.translate(2 * SOLA.x, 0);
    ctx.scale(-1, 1);
  }
  const q = desenho.quadril;
  for (const p of desenho.partes) {
    if (p.id === "sombra" && !sombra) continue;
    ctx.save();
    if (p.grupo === "superior") girar(ctx, pose.superior, q.x, q.y);
    if (p.grupo !== "chao") girar(ctx, pose.partes[p.id] ?? ZERO, p.pivo.x, p.pivo.y);
    pintarParte(ctx, p, espessura);
    ctx.restore();
  }
  ctx.restore();
}

/** Textura de uma parte (para o Phaser): `pxPorUnidade` px de textura por unidade de desenho. */
export function renderizarParte(parte: Parte, pxPorUnidade: number, espessura = 1): HTMLCanvasElement {
  const { x0, y0, x1, y1 } = parte.caixa;
  const c = document.createElement("canvas");
  c.width = Math.ceil((x1 - x0) * pxPorUnidade);
  c.height = Math.ceil((y1 - y0) * pxPorUnidade);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas 2d indisponível");
  ctx.setTransform(pxPorUnidade, 0, 0, pxPorUnidade, -x0 * pxPorUnidade, -y0 * pxPorUnidade);
  pintarParte(ctx, parte, espessura);
  return c;
}

// ---------------------------------------------------------------- recortes (miniaturas)

export type Corte = "corpo" | "cabeca" | "torso" | "pernas";

/** Região do desenho (unidades) que cada miniatura mostra. A parte de cima acompanha a Altura. */
export function regiaoDe(corte: Corte, altura: Altura = "medio"): Caixa {
  const dy = deslocamentoDe(altura);
  const { perna, tronco } = ALTURAS[altura];
  if (corte === "cabeca") return caixa(20, 5 + dy, 220, 205 + dy);
  if (corte === "torso") return caixa(62, 186 + dy, 178, 176 + dy + tronco + 10);
  if (corte === "pernas") return caixa(76, SOLA.y - perna - 4, 164, SOLA.y + 6);
  return caixa(QUADRO.x0, QUADRO.y0, QUADRO.x1, QUADRO.y1);
}
