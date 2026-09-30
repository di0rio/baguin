/** Utilidades de pixel art desenhada em canvas 2D (sem suavização, sem assets externos). */

export const hex = (c: string): [number, number, number] => [
  parseInt(c.slice(1, 3), 16),
  parseInt(c.slice(3, 5), 16),
  parseInt(c.slice(5, 7), 16),
];
const h2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");

/** Mistura a cor `a` com `b` (t = 0 → a, 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  return `#${h2(r1 + (r2 - r1) * t)}${h2(g1 + (g2 - g1) * t)}${h2(b1 + (b2 - b1) * t)}`;
}
/** Sombra fria (azul-arroxeada), para não escurecer com preto chapado. */
export const escurecer = (c: string, t = 0.25) => mix(c, "#3a2f5b", t);
export const clarear = (c: string, t = 0.25) => mix(c, "#fffaf0", t);

/** Gerador pseudoaleatório determinístico (mulberry32): o mapa sai igual em toda sessão. */
export function aleatorio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hashTexto = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Caneta de pixels sobre um canvas: tudo em coordenadas inteiras, sem antialias. */
export class Pena {
  constructor(
    readonly ctx: CanvasRenderingContext2D,
    private dx = 0,
    private dy = 0,
  ) {
    ctx.imageSmoothingEnabled = false;
  }
  /** Nova caneta com a origem deslocada (para desenhar um Móvel relativo à própria pegada). */
  em(dx: number, dy: number) {
    return new Pena(this.ctx, this.dx + dx, this.dy + dy);
  }
  r(x: number, y: number, w: number, h: number, c: string) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x + this.dx), Math.round(y + this.dy), Math.round(w), Math.round(h));
  }
  p(x: number, y: number, c: string) {
    this.r(x, y, 1, 1, c);
  }
  /** Linha horizontal. */
  h(x: number, y: number, w: number, c: string) {
    this.r(x, y, w, 1, c);
  }
  /** Linha vertical. */
  v(x: number, y: number, h: number, c: string) {
    this.r(x, y, 1, h, c);
  }
  /** Elipse preenchida por faixas (bordas em degrau, como pixel art). */
  elipse(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.0001))));
      this.r(cx - w, cy + y, w * 2 + 1, 1, c);
    }
  }
  /** Retângulo com cantos cortados (`raio` px). */
  caixa(x: number, y: number, w: number, h: number, c: string, raio = 1) {
    this.r(x + raio, y, w - raio * 2, h, c);
    this.r(x, y + raio, w, h - raio * 2, c);
    for (let i = 1; i < raio; i++) this.r(x + i, y + i, w - i * 2, h - i * 2, c);
  }
  /** Caixa com contorno de 1px (cor própria) e cantos cortados. */
  caixaC(x: number, y: number, w: number, h: number, fundo: string, contorno: string) {
    this.caixa(x, y, w, h, contorno);
    this.caixa(x + 1, y + 1, w - 2, h - 2, fundo);
  }
  /** Sombra suave no chão: elipse translúcida. */
  sombra(cx: number, cy: number, rx: number, ry: number, alfa = 0.16) {
    this.elipse(cx, cy, rx, ry, `rgba(58,47,91,${alfa})`);
  }
  /** Retângulo de sombra translúcida. */
  sombraR(x: number, y: number, w: number, h: number, alfa = 0.16) {
    this.r(x, y, w, h, `rgba(58,47,91,${alfa})`);
  }
}

export function criarCanvas(w: number, h: number): [HTMLCanvasElement, Pena] {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return [c, new Pena(c.getContext("2d")!)];
}
