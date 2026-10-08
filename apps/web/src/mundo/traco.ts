import { MUNDO } from "./paleta";

/**
 * Traço do mundo: cartoon vetorial desenhado em canvas 2D, com o mesmo contorno grosso de tinta do Avatar.
 * Tudo em coordenadas do mundo (1 unidade = 1 px do Lugar); o canvas é criado em `res` vezes essa resolução
 * para ficar nítido com zoom não inteiro e em tela de alta densidade.
 */

/** Contorno grosso das formas. */
export const TRACO = 2;
/** Marca de material: traço fino e raro. */
export const FINO = 1;

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

export type Ponto = readonly [x: number, y: number];
/** Círculo `[cx, cy, raio]` de uma nuvem (copa, moita). */
export type Circulo = readonly [cx: number, cy: number, r: number];

/** Caneta de tinta sobre um canvas. Formas fechadas levam Preenchimento e contorno; marcas são só traço. */
export class Caneta {
  constructor(
    readonly ctx: CanvasRenderingContext2D,
    private dx = 0,
    private dy = 0,
  ) {}

  /** Nova caneta com a origem deslocada (para desenhar um Móvel relativo à própria pegada). */
  em(dx: number, dy: number) {
    return new Caneta(this.ctx, this.dx + dx, this.dy + dy);
  }

  /** Executa `f` com a origem deslocada, juntas e pontas redondas. */
  private com(f: (c: CanvasRenderingContext2D) => void) {
    const c = this.ctx;
    c.save();
    c.translate(this.dx, this.dy);
    c.lineJoin = "round";
    c.lineCap = "round";
    f(c);
    c.restore();
  }

  private pintar(c: CanvasRenderingContext2D, fundo: string | null, traco: number, cor = MUNDO.tinta, regra: CanvasFillRule = "nonzero") {
    if (fundo) {
      c.fillStyle = fundo;
      c.fill(regra);
    }
    if (traco > 0) {
      c.lineWidth = traco;
      c.strokeStyle = cor;
      c.stroke();
    }
  }

  /** Retângulo de cantos redondos. */
  caixa(x: number, y: number, w: number, h: number, fundo: string | null = MUNDO.papel, raio = 2, traco = TRACO) {
    this.com((c) => {
      c.beginPath();
      c.roundRect(x, y, w, h, Math.min(raio, w / 2, h / 2));
      this.pintar(c, fundo, traco);
    });
  }

  elipse(cx: number, cy: number, rx: number, ry: number, fundo: string | null = MUNDO.papel, traco = TRACO) {
    this.com((c) => {
      c.beginPath();
      c.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, Math.PI * 2);
      this.pintar(c, fundo, traco);
    });
  }

  /** Polígono (ou polilinha, com `fechar = false`). */
  poli(pontos: readonly Ponto[], fundo: string | null = MUNDO.papel, traco = TRACO, fechar = true) {
    this.com((c) => {
      c.beginPath();
      pontos.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      if (fechar) c.closePath();
      this.pintar(c, fechar ? fundo : null, traco);
    });
  }

  /** Forma livre: `f` monta o caminho no contexto já deslocado. */
  forma(f: (c: CanvasRenderingContext2D) => void, fundo: string | null = MUNDO.papel, traco = TRACO, regra: CanvasFillRule = "nonzero") {
    this.com((c) => {
      c.beginPath();
      f(c);
      this.pintar(c, fundo, traco, MUNDO.tinta, regra);
    });
  }

  /** Marca de traço fino (polilinha aberta). */
  linha(pontos: readonly Ponto[], traco = FINO, cor = MUNDO.tinta) {
    this.com((c) => {
      c.beginPath();
      pontos.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.lineWidth = traco;
      c.strokeStyle = cor;
      c.stroke();
    });
  }

  /** Marca tracejada. */
  tracejada(pontos: readonly Ponto[], tracos: readonly number[], traco = FINO, cor = MUNDO.tinta) {
    this.com((c) => {
      c.setLineDash([...tracos]);
      c.lineCap = "butt";
      c.beginPath();
      pontos.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.lineWidth = traco;
      c.strokeStyle = cor;
      c.stroke();
    });
  }

  /** Curva quadrática fina. */
  curva(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, traco = FINO, cor = MUNDO.tinta) {
    this.com((c) => {
      c.beginPath();
      c.moveTo(x0, y0);
      c.quadraticCurveTo(cx, cy, x1, y1);
      c.lineWidth = traco;
      c.strokeStyle = cor;
      c.stroke();
    });
  }

  /** Mancha chapada, sem contorno (sombra no chão, face em sombra). */
  chapa(x: number, y: number, w: number, h: number, cor: string, raio = 0) {
    this.com((c) => {
      c.beginPath();
      c.roundRect(x, y, w, h, raio);
      c.fillStyle = cor;
      c.fill();
    });
  }

  chapaElipse(cx: number, cy: number, rx: number, ry: number, cor: string) {
    this.com((c) => {
      c.beginPath();
      c.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, Math.PI * 2);
      c.fillStyle = cor;
      c.fill();
    });
  }

  /** Bolinha cheia, sem contorno. */
  ponto(cx: number, cy: number, r: number, cor = MUNDO.tinta) {
    this.chapaElipse(cx, cy, r, r, cor);
  }

  /**
   * Nuvem de círculos (copa, moita, folhagem): um contorno só em volta da união, Preenchimento `fundo` e uma
   * sombra chapada `sombra` no lado de baixo e da direita (a luz vem de cima à esquerda).
   */
  nuvem(circulos: readonly Circulo[], fundo = MUNDO.papel, sombra: string | null = MUNDO.meio, traco = TRACO) {
    this.com((c) => {
      const caminho = (dx = 0, dy = 0) => {
        c.beginPath();
        for (const [cx, cy, r] of circulos) {
          c.moveTo(cx + dx + r, cy + dy);
          c.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
        }
      };
      caminho();
      c.lineWidth = traco * 2; // metade fica sob o Preenchimento: sobra o contorno só por fora
      c.strokeStyle = MUNDO.tinta;
      c.stroke();
      c.fillStyle = fundo;
      c.fill();
      if (!sombra) return;
      c.save();
      caminho();
      c.clip();
      c.fillStyle = sombra;
      c.fillRect(-1e4, -1e4, 2e4, 2e4);
      caminho(-2.5, -2.5);
      c.fillStyle = fundo;
      c.fill();
      c.restore();
    });
  }

  /** Desenha dentro de `recorte` (um caminho montado por `f`). */
  recortar(f: (c: CanvasRenderingContext2D) => void, dentro: (p: Caneta) => void) {
    this.com((c) => {
      c.beginPath();
      f(c);
      c.clip();
      // `dentro` desenha com a origem já deslocada: usa uma caneta sem offset adicional
      dentro(new Caneta(c));
    });
  }
}

/** Canvas lógico `w` × `h` (arredondado para cima), com `res` pixels por unidade; a caneta já vem na escala do mundo. */
export function criarCanvas(w: number, h: number, res: number): [HTMLCanvasElement, Caneta] {
  const lw = Math.max(1, Math.ceil(w));
  const lh = Math.max(1, Math.ceil(h));
  const c = document.createElement("canvas");
  c.width = lw * res;
  c.height = lh * res;
  const ctx = c.getContext("2d")!;
  ctx.scale(res, res);
  return [c, new Caneta(ctx)];
}

/** Tamanho lógico (em unidades do mundo) de um canvas criado por `criarCanvas`. */
export const tamanhoLogico = (c: HTMLCanvasElement, res: number) => ({ w: c.width / res, h: c.height / res });
