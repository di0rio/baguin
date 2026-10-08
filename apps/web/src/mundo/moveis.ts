import { TILE, type Movel, type TipoMovel } from "@baguin/shared";
import { MUNDO } from "./paleta";
import { Caneta, FINO, TRACO, aleatorio, criarCanvas, hashTexto, type Circulo } from "./traco";

/**
 * Móveis em cartoon de tinta e papel (visão 3/4): cada peça vira um canvas próprio, ordenado por y no mundo.
 * Os desenhos usam coordenadas relativas à pegada (0,0)-(L,A); o que passa de y < 0 é a parte alta.
 * Contorno grosso de tinta, Preenchimento em papel, face em sombra mais escura, sombra chapada no chão.
 * Marca de material só em traço fino e rara (três riscos de tábua, não o tampo inteiro).
 */

// ---------------------------------------------------------------- tons

/** Preenchimento de um Móvel: o fundo, a face em sombra e a cor do detalhe (traço que contrasta com o fundo). */
type Tom = { f: string; s: string; d: string };
const tons = (): Record<"papel" | "meio" | "tinta", Tom> => ({
  papel: { f: MUNDO.papel, s: MUNDO.meio, d: MUNDO.tinta },
  meio: { f: MUNDO.meio, s: MUNDO.sombra, d: MUNDO.tinta },
  tinta: { f: MUNDO.tinta, s: MUNDO.tinta, d: MUNDO.papel },
});

/** Sem cor no mundo: o nome da variante escolhe o Preenchimento (papel, papel em sombra ou tinta). */
const PREENCHIMENTO: Record<string, "papel" | "meio" | "tinta"> = {
  coral: "papel",
  azul: "tinta",
  menta: "meio",
  amarelo: "papel",
  rosa: "meio",
  lavanda: "meio",
  verde: "tinta",
  pessego: "papel",
  cinza: "meio",
  lilas: "tinta",
};
/** `tinta` só onde a peça é uma forma única: com peças sobrepostas ela vira um bloco preto sem detalhe. */
const tomDe = (nome: string | undefined, padrao: string, tinta = false): Tom => {
  const t = PREENCHIMENTO[nome ?? ""] ?? PREENCHIMENTO[padrao];
  return tons()[t === "tinta" && !tinta ? "meio" : t];
};

type Variante = { estilo: string; cor?: string };
const parseVariante = (v: string | undefined): Variante => {
  const [estilo, c] = (v ?? "").split(":");
  return { estilo, cor: c };
};

type Desenho = {
  /** px desenhados acima da pegada. */
  sobe: number;
  /** px desenhados além das laterais da pegada. */
  lado?: number;
  /** Desloca a profundidade (negativo: fica atrás de quem está na mesma linha). */
  prof?: number;
  desenhar: (p: Caneta, L: number, A: number, v: Variante, rnd: () => number, m: Movel) => void;
};

// ---------------------------------------------------------------- blocos reutilizáveis

/** Sombra chapada no chão, projetada para baixo e um pouco à direita (luz vinda de cima à esquerda). */
function sombraBase(p: Caneta, L: number, A: number, folga = 3) {
  p.chapa(3, A - 4, L - 2 + folga, 8, MUNDO.sombra, 3);
}
function sombraRedonda(p: Caneta, cx: number, cy: number, rx: number, ry: number) {
  p.chapaElipse(cx + 2, cy, rx, ry, MUNDO.sombra);
}

/** Três riscos de tábua: a única marca de material do tampo. */
function riscos(p: Caneta, x: number, y: number, w: number, rnd: () => number, cor = MUNDO.tinta) {
  for (let i = 0; i < 3; i++) {
    const x0 = x + Math.floor(rnd() * Math.max(1, w * 0.25));
    const len = Math.max(4, w * (0.35 + rnd() * 0.3));
    p.linha([[x0, y + i * 3.5], [Math.min(x + w, x0 + len), y + i * 3.5]], FINO, cor);
  }
}

/** Folha solta: elipse com nervura. */
function folha(p: Caneta, cx: number, cy: number, rx: number, ry: number, escura = false) {
  p.elipse(cx, cy, rx, ry, escura ? MUNDO.tinta : MUNDO.papel);
  if (ry > 3) p.linha([[cx, cy - ry + 2], [cx, cy + ry - 2]], FINO, escura ? MUNDO.papel : MUNDO.tinta);
}

/** Vaso: trapézio com borda. `tom` do corpo. */
function vaso(p: Caneta, cx: number, y: number, larg: number, alt: number, tom: Tom = tons().meio) {
  const x = cx - Math.floor(larg / 2);
  p.poli([[x + 1, y + 2], [x + larg - 1, y + 2], [x + larg - 3, y + alt], [x + 3, y + alt]], tom.f);
  p.caixa(x - 0.5, y, larg + 1, 3.5, tom.f, 1.5);
}

/** Livros em pé numa prateleira: alternam papel, papel em sombra e tinta. */
function livros(p: Caneta, x0: number, x1: number, base: number, rnd: () => number, altMax = 15) {
  const fundos = [MUNDO.papel, MUNDO.meio, MUNDO.tinta, MUNDO.papel, MUNDO.sombra];
  let x = x0;
  while (x < x1 - 4) {
    if (rnd() < 0.1) {
      x += 3;
      continue;
    }
    const w = 3 + Math.floor(rnd() * 3);
    const h = 9 + Math.floor(rnd() * (altMax - 8));
    p.caixa(x, base - h, w, h, fundos[Math.floor(rnd() * fundos.length)], 0.6, FINO);
    x += w;
  }
}

/** Pilha de livros deitados. */
function pilha(p: Caneta, x: number, y: number, w: number, n: number) {
  const fundos = [MUNDO.meio, MUNDO.papel, MUNDO.tinta, MUNDO.sombra];
  for (let k = 0; k < n; k++) p.caixa(x + (k % 2), y - (k + 1) * 3, w - k * 1.5, 3, fundos[k % fundos.length], 0.6, FINO);
}

// ---------------------------------------------------------------- desenhos

const DESENHOS: Partial<Record<TipoMovel, Desenho>> = {
  estante: {
    sobe: 34,
    desenhar(p, L, A, _v, rnd) {
      const { papel: P, meio: M, sombra: S, tinta: T } = MUNDO;
      sombraBase(p, L, A);
      const top = -34;
      const h = A - top;
      p.caixa(0, top, L, h - 2, M, 3);
      p.caixa(4, top + 4, L - 8, 38, P, 1.5, FINO);
      // dois vãos com livros e objetos
      [top + 5, top + 23].forEach((y0, vi) => {
        const base = y0 + 16;
        let x = 6;
        while (x < L - 12) {
          if (rnd() < 0.15) {
            const tipo = Math.floor(rnd() * 3);
            if (tipo === 0) {
              vaso(p, x + 4, base - 7, 8, 7);
              folha(p, x + 4, base - 11, 4, 4);
            } else if (tipo === 1) {
              p.caixa(x, base - 10, 9, 10, P, 1);
              p.caixa(x + 2, base - 8, 5, 4, vi ? T : S, 0.5, FINO);
            } else {
              p.elipse(x + 3, base - 4, 3, 4, P);
            }
            x += 11;
            continue;
          }
          livros(p, x, Math.min(L - 10, x + 14), base, rnd);
          x += 15;
        }
        p.caixa(4, base, L - 8, 2.5, S, 0.5);
      });
      // armário embaixo
      const y0 = top + 46;
      p.caixa(2, y0, L - 4, A - 4 - y0, M, 2);
      const portas = Math.max(1, Math.round((L - 6) / 30));
      const lp = (L - 8) / portas;
      for (let i = 0; i < portas; i++) {
        const x = 4 + i * lp;
        p.caixa(x + 1, y0 + 2, lp - 2, A - 8 - y0, P, 1.5, FINO);
        p.ponto(x + lp - 6, y0 + 8, 1.4);
      }
    },
  },

  planta: {
    sobe: 30,
    lado: 6,
    desenhar(p, L, A, v, rnd) {
      const { papel: P, tinta: T } = MUNDO;
      const cx = L / 2;
      const estilo = v.estilo || "ficus";
      sombraRedonda(p, cx + 1, A - 3, 11, 3);
      if (estilo === "ficus") {
        p.caixa(cx - 1.5, -2, 3, 20, tons().meio.f, 1);
        p.nuvem([[cx, -10, 11], [cx - 8, -3, 7], [cx + 8, -2, 7]]);
        for (let i = 0; i < 3; i++) p.linha([[cx - 6 + i * 6, -8 + (i % 2) * 5], [cx - 4 + i * 6, -11 + (i % 2) * 5]], FINO);
        vaso(p, cx, 16, 14, 13);
      } else if (estilo === "monstera") {
        // folhas largas em leque, de trás para frente: tinta com nervura de papel
        const folhas: [number, number, number, number][] = [
          [cx - 6, -15, 6, 8], [cx + 7, -14, 6, 8], [cx - 11, -4, 7, 7], [cx + 12, -3, 7, 7], [cx, -8, 7, 9], [cx - 7, 6, 7, 5], [cx + 8, 6, 7, 5],
        ];
        folhas.forEach(([fx, fy, rx, ry], i) => folha(p, fx, fy, rx, ry, i % 2 === 0));
        vaso(p, cx, 16, 14, 13, tons().papel);
      } else if (estilo === "palmeira") {
        p.caixa(cx - 1.5, -6, 3, 24, tons().meio.f, 1);
        const leques: [number, number][] = [[-13, 0], [-10, -9], [-4, -14], [4, -14], [10, -9], [13, 0]];
        for (const [dx, dy] of leques) {
          p.forma((c) => {
            c.moveTo(cx, -7);
            c.quadraticCurveTo(cx + dx * 0.4, -7 + dy * 1.3, cx + dx, -7 + dy + 6);
            c.quadraticCurveTo(cx + dx * 0.7, -7 + dy * 0.5 + 2, cx, -7);
          }, P, 1.5);
        }
        p.elipse(cx, -7, 3, 2.5, T);
        vaso(p, cx, 16, 14, 13);
      } else if (estilo === "samambaia") {
        for (let i = 0; i < 7; i++) {
          const ang = -Math.PI * (0.1 + 0.8 * (i / 6));
          const fx = cx + Math.cos(ang) * 15;
          const fy = 14 + Math.sin(ang) * 17;
          p.forma((c) => {
            c.moveTo(cx, 14);
            c.quadraticCurveTo(cx + Math.cos(ang) * 8, 14 + Math.sin(ang) * 18, fx, fy + 3);
            c.quadraticCurveTo(cx + Math.cos(ang) * 9 + 2, 14 + Math.sin(ang) * 12, cx, 14);
          }, i % 2 ? T : P, 1.5);
        }
        vaso(p, cx, 16, 14, 13, tons().papel);
      } else if (estilo === "arbusto") {
        p.nuvem([[cx - 8, 13, 9], [cx + 8, 13, 9], [cx, 8, 10]]);
        for (let i = 0; i < 5; i++) {
          const fx = cx - 10 + Math.floor(rnd() * 20);
          const fy = 6 + Math.floor(rnd() * 12);
          p.elipse(fx, fy, 1.8, 1.8, P, FINO);
        }
      } else {
        // vaso pequeno com suculenta
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI * (0.1 + (0.8 * i) / 4);
          folha(p, cx + Math.cos(a) * 5, 12 + Math.sin(a) * 4, 2.5, 4, i % 2 === 0);
        }
        vaso(p, cx, 16, 12, 12, tons().papel);
      }
    },
  },

  arvore: {
    sobe: 56,
    lado: 26,
    desenhar(p, L, A) {
      const { meio: M, tinta: T } = MUNDO;
      const cx = L / 2;
      sombraRedonda(p, cx + 3, A - 2, 22, 6);
      // tronco com raízes
      p.forma((c) => {
        c.moveTo(cx - 3, 0);
        c.lineTo(cx - 3.5, A - 8);
        c.quadraticCurveTo(cx - 3, A - 3, cx - 8, A - 2);
        c.lineTo(cx + 8, A - 2);
        c.quadraticCurveTo(cx + 3, A - 3, cx + 3.5, A - 8);
        c.lineTo(cx + 3, 0);
        c.closePath();
      }, M);
      p.linha([[cx - 0.5, 6], [cx - 0.5, 16]]);
      const copa: Circulo[] = [[cx, -20, 17], [cx - 13, -10, 12], [cx + 14, -9, 12], [cx - 4, -31, 11], [cx + 9, -24, 11]];
      p.nuvem(copa);
      // folhagem: poucos arcos finos
      for (const [x, y] of [[-8, -22], [6, -14], [-14, -8], [12, -26], [0, -34]] as const) p.linha([[cx + x - 3, y + 2], [cx + x, y - 1], [cx + x + 3, y + 2]], FINO);
      void T;
    },
  },

  sofa: {
    sobe: 8,
    desenhar(p, L, A, v) {
      const { papel: P, meio: M, tinta: T } = MUNDO;
      const tom = tomDe(v.cor, v.estilo === "frente" ? "azul" : "coral");
      sombraBase(p, L, A);
      if (v.estilo === "costas") {
        // visto por trás (olha para cima): encosto alto e braços
        p.caixa(0, 4, L, 25, tom.f, 4);
        const n = Math.max(2, Math.round((L - 10) / 26));
        for (let i = 1; i < n; i++) {
          const x = 5 + ((L - 10) * i) / n;
          p.linha([[x, 9], [x, 22]], FINO, tom.d);
        }
        p.caixa(0, 8, 6, 21, tom.s, 3);
        p.caixa(L - 6, 8, 6, 21, tom.s, 3);
        // almofada espiando por cima
        p.caixa(L - 26, -1, 12, 9, tom.f === T ? P : M, 3);
        p.caixa(3, 28, 4, 3, T, 1, 0);
        p.caixa(L - 7, 28, 4, 3, T, 1, 0);
      } else {
        // visto de frente: encosto, assentos e braços
        p.caixa(0, 6, L, 24, tom.s, 4);
        p.caixa(5, 0, L - 10, 17, tom.f, 4);
        const n = Math.max(2, Math.round((L - 18) / 28));
        const lc = (L - 18) / n;
        for (let i = 0; i < n; i++) p.caixa(9 + i * lc, 13, lc - 1, 13, tom.f, 3);
        p.caixa(0, 8, 9, 21, tom.f, 4);
        p.caixa(L - 9, 8, 9, 21, tom.f, 4);
        p.caixa(12, 7, 9, 9, tom.f === T ? P : M, 2.5); // almofada
        p.caixa(3, 28, 4, 3, T, 1, 0);
        p.caixa(L - 7, 28, 4, 3, T, 1, 0);
      }
    },
  },

  poltrona: {
    sobe: 6,
    desenhar(p, L, A, v) {
      const { papel: P, meio: M, tinta: T } = MUNDO;
      const tom = tomDe(v.cor, "coral");
      sombraRedonda(p, L / 2 + 1, A - 3, 12, 3);
      if (v.estilo === "frente") {
        p.caixa(4, 2, 24, 17, tom.f, 5);
        p.caixa(3, 10, 6, 18, tom.s, 3);
        p.caixa(L - 9, 10, 6, 18, tom.s, 3);
        p.caixa(9, 14, 14, 12, tom.f, 3);
        p.caixa(5, 27, 3, 3, T, 1, 0);
        p.caixa(L - 8, 27, 3, 3, T, 1, 0);
      } else {
        // vista lateral: desenhada virada para a direita (encosto à esquerda) e espelhada para "esq"
        const esq = v.estilo === "esq";
        const bx = (x: number, w: number) => (esq ? L - x - w : x);
        p.caixa(bx(10, 18), 6, 18, 9, tom.s, 3); // braço de trás
        p.caixa(bx(3, 10), 2, 10, 27, tom.f, 4); // encosto
        p.caixa(bx(11, 17), 13, 17, 13, tom.f, 3); // assento
        p.caixa(bx(9, 19), 21, 19, 8, tom.s, 3); // braço da frente
        p.caixa(bx(5, 3), A - 4, 3, 3, T, 1, 0);
        p.caixa(bx(24, 3), A - 4, 3, 3, T, 1, 0);
        void P;
      }
    },
  },

  "mesa-centro": {
    sobe: 4,
    desenhar(p, L, A, _v, rnd) {
      const { papel: P, meio: M, tinta: T } = MUNDO;
      sombraBase(p, L, A, 1);
      p.caixa(6, 18, 4, 12, M, 1);
      p.caixa(L - 10, 18, 4, 12, M, 1);
      p.caixa(2, 4, L - 4, 21, M, 4); // espessura
      p.caixa(2, 3, L - 4, 17, P, 4); // tampo
      riscos(p, 8, 7, L - 20, rnd);
      // objetos
      const cx = Math.floor(L / 2);
      pilha(p, cx - 14, 14, 11, 2);
      p.caixa(cx + 4, 6, 6, 6, P, 1.5, FINO);
      p.caixa(cx + 10, 7.5, 2.5, 3, null, 1, FINO);
      folha(p, cx + 16, 10, 3, 3.5);
    },
  },

  "mesa-lateral": {
    sobe: 12,
    desenhar(p, L, A) {
      const { papel: P, meio: M, tinta: T } = MUNDO;
      sombraRedonda(p, L / 2 + 1, A - 3, 10, 3);
      p.elipse(16, 28, 7, 2.2, M);
      p.caixa(14.5, 12, 3, 16, M, 1);
      p.elipse(16, 12, 11, 5, P);
      // abajur
      p.caixa(15, 3, 2, 8, T, 0.5, 0);
      p.poli([[12, -5], [20, -5], [23, 3], [9, 3]], P, TRACO);
      p.linha([[13, -2], [14, 1]], FINO);
    },
  },

  tv: {
    sobe: 38,
    desenhar(p, L, A, _v, rnd) {
      const { papel: P, meio: M, tinta: T, sombra: S } = MUNDO;
      sombraBase(p, L, A);
      // móvel baixo
      p.caixa(4, A - 4, 3, 4, T, 0.5, 0);
      p.caixa(L - 7, A - 4, 3, 4, T, 0.5, 0);
      p.caixa(0, 8, L, 22, M, 3);
      p.caixa(0, 8, L, 6, P, 3);
      const n = Math.max(2, Math.round((L - 4) / 30));
      for (let i = 1; i < n; i++) p.linha([[(L * i) / n, 15], [(L * i) / n, 28]], FINO);
      for (let i = 0; i < n; i++) {
        const x = (L * (i + 0.5)) / n;
        p.linha([[x - 3, 21], [x + 3, 21]], TRACO);
      }
      // TV
      const tw = Math.min(L - 28, 96);
      const tx = Math.floor((L - tw) / 2);
      p.poli([[tx + tw / 2 - 5, 8], [tx + tw / 2 + 5, 8], [tx + tw / 2 + 8, 4], [tx + tw / 2 - 8, 4]], S);
      p.caixa(tx, -30, tw, 36, P, 4);
      p.caixa(tx + 4, -26, tw - 8, 28, T, 2, 0);
      // reflexo na tela
      p.linha([[tx + 9, -6], [tx + 22, -22]], 2.5, P);
      p.linha([[tx + 26, -6], [tx + 33, -15]], FINO + 0.5, P);
      p.ponto(tx + tw - 5, 3, 1.2);
      void rnd;
    },
  },

  luminaria: {
    sobe: 30,
    lado: 8,
    desenhar(p, L, A) {
      const { papel: P, tinta: T, meio: M } = MUNDO;
      const cx = L / 2;
      sombraRedonda(p, cx + 2, A - 3, 7, 2);
      p.elipse(cx, A - 4, 6, 2.2, T);
      p.caixa(cx - 1, -2, 2, A - 5, T, 0.5, 0);
      // cúpula
      p.poli([[cx - 6, -14], [cx + 6, -14], [cx + 9, -1], [cx - 9, -1]], P);
      p.linha([[cx - 5, -11], [cx - 6, -5]], FINO, M);
    },
  },

  bebedouro: {
    sobe: 26,
    desenhar(p, L, A) {
      const { papel: P, meio: M, tinta: T } = MUNDO;
      const cx = L / 2;
      sombraRedonda(p, cx + 2, A - 2, 11, 3);
      p.caixa(cx - 8, 2, 16, A - 4, P, 3);
      p.caixa(cx - 5, 8, 4, 3, T, 1, 0);
      p.caixa(cx + 1, 8, 4, 3, M, 1, FINO);
      p.caixa(cx - 6, 18, 12, 6, M, 1.5, FINO);
      // galão
      p.caixa(cx - 7, -22, 14, 25, M, 4);
      p.linha([[cx - 3, -19], [cx - 3, -6]], 1.6, P);
      p.caixa(cx - 3, -27, 6, 5, P, 1.5);
    },
  },

  bar: {
    sobe: 16,
    desenhar(p, L, A, _v, rnd) {
      const { papel: P, meio: M, tinta: T, sombra: S } = MUNDO;
      sombraBase(p, L, A);
      p.caixa(0, 10, L, 20, M, 3);
      const n = Math.floor((L - 4) / 16);
      for (let i = 1; i < n; i++) p.linha([[(L * i) / n, 17], [(L * i) / n, 28]], FINO);
      // tampo
      p.caixa(-1, 5, L + 2, 9, P, 3);
      // coisas em cima
      for (let i = 0; i < 4; i++) {
        const x = 8 + Math.floor(rnd() * (L - 28));
        if (i % 2 === 0) {
          p.caixa(x, -6, 5, 12, i === 0 ? T : M, 1.5);
          p.caixa(x + 1, -9, 3, 4, P, 1, FINO);
        } else {
          p.caixa(x, 0, 6, 6, P, 1.5, FINO);
        }
      }
      folha(p, L - 10, -1, 4, 4.5);
      p.caixa(L - 14, 1, 9, 5, S, 1.5, FINO);
    },
  },

  banqueta: {
    sobe: 8,
    desenhar(p, L, A) {
      const { papel: P, tinta: T } = MUNDO;
      const cx = L / 2;
      sombraRedonda(p, cx + 2, A - 3, 9, 3);
      p.caixa(cx - 1.5, 13, 3, 12, T, 0.5, 0);
      p.elipse(cx, 25, 6, 2.2, T);
      p.linha([[cx - 5, 19], [cx + 5, 19]], FINO + 0.5);
      p.elipse(cx, 12, 9, 5, P);
    },
  },

  "mesa-trabalho": {
    sobe: 14,
    desenhar(p, L, A, v, rnd) {
      const { papel: P, meio: M, tinta: T, sombra: S } = MUNDO;
      sombraBase(p, L, A);
      p.caixa(3, A - 10, 4, 10, M, 1);
      p.caixa(L - 7, A - 10, 4, 10, M, 1);
      p.caixa(0, 4, L, A - 8, M, 4); // espessura
      p.caixa(0, 3, L, A - 14, P, 4); // tampo
      riscos(p, 6, A - 22, L - 20, rnd);
      const postos = Math.round(L / 64);
      for (let i = 0; i < postos; i++) {
        const x0 = Math.round((L / postos) * i) + 6;
        const w = Math.round(L / postos) - 12;
        const mw = 27;
        const mx = x0 + Math.floor((w - mw) / 2);
        p.caixa(mx + mw / 2 - 2, 14, 4, 6, M, 0.5, FINO);
        p.caixa(mx + mw / 2 - 6, 19, 12, 2, T, 1, 0);
        p.caixa(mx, -3, mw, 19, P, 3); // monitor
        const tela = (i + (v.estilo === "b" ? 1 : 0)) % 2;
        if (tela === 0) {
          p.caixa(mx + 3, 0, mw - 6, 12, T, 1.5, 0);
          for (let k = 0; k < 4; k++) p.linha([[mx + 5 + (k % 2) * 3, 2.5 + k * 2.4], [mx + 8 + (k % 2) * 3 + Math.floor(rnd() * 9), 2.5 + k * 2.4]], FINO, P);
        } else {
          p.caixa(mx + 3, 0, mw - 6, 12, M, 1.5, FINO);
          for (let k = 0; k < 4; k++) p.linha([[mx + 6 + k * 4.5, 10], [mx + 6 + k * 4.5, 10 - (2 + Math.floor(rnd() * 6))]], 2);
        }
        // teclado e mouse
        p.caixa(mx + 4, 25, 18, 6, M, 1.5, FINO);
        p.caixa(mx + 25, 26, 4, 5, M, 1.5, FINO);
        // extras por posto
        if (i % 2 === 0) {
          p.caixa(mx - 7, 23, 6, 7, P, 1.5, FINO);
        } else {
          p.caixa(mx + mw + 2, 21, 9, 10, S, 0.5, FINO);
        }
      }
      vaso(p, L - 12, 21, 8, 7);
      folha(p, L - 12, 18, 4, 4.5);
    },
  },

  cadeira: {
    sobe: 6,
    prof: -28,
    desenhar(p, L, A, v) {
      const { tinta: T } = MUNDO;
      const [estilo, nomeCor] = v.estilo.includes("-") ? v.estilo.split("-") : [v.estilo, v.cor];
      const tom = tomDe(nomeCor, "azul", estilo === "costas");
      const cx = L / 2;
      sombraRedonda(p, cx + 1, A - 4, 10, 3);
      if (estilo === "costas") {
        p.caixa(cx - 1.5, 22, 3, 6, T, 0.5, 0);
        p.linha([[cx - 8, 28], [cx + 8, 28]], TRACO);
        for (const x of [-8, 8]) p.ponto(cx + x, 30, 1.3);
        p.caixa(cx - 9, 6, 18, 19, tom.f, 5);
        p.linha([[cx - 6, 13], [cx + 6, 13]], FINO, tom.d);
      } else {
        p.caixa(cx - 8, 4, 16, 13, tom.f, 4);
        p.caixa(cx - 9, 14, 18, 8, tom.s, 3);
        p.caixa(cx - 1.5, 22, 3, 5, T, 0.5, 0);
        p.linha([[cx - 8, 27], [cx + 8, 27]], TRACO);
        for (const x of [-8, 8]) p.ponto(cx + x, 29, 1.3);
      }
    },
  },

  "mesa-reuniao": {
    sobe: 8,
    desenhar(p, L, A, _v, rnd) {
      const { papel: P, meio: M, tinta: T } = MUNDO;
      sombraBase(p, L, A);
      p.caixa(14, A - 12, 4, 12, M, 1);
      p.caixa(L - 18, A - 12, 4, 12, M, 1);
      p.caixa(L / 2 - 4, A - 12, 8, 12, M, 1);
      p.caixa(0, 6, L, A - 8, M, 7); // espessura
      p.caixa(0, 4, L, A - 12, P, 7); // tampo
      riscos(p, 14, 10, L - 40, rnd);
      // notebooks, garrafa, papéis
      [22, 52, 82, 112].forEach((x, i) => {
        if (x > L - 26) return;
        p.caixa(x, 12, 15, 9, i % 2 ? T : M, 1.5, FINO + 0.5);
        p.caixa(x + 2, 34, 15, 9, i % 2 ? M : T, 1.5, FINO + 0.5);
      });
      p.caixa(L / 2 - 2, 22, 5, 12, M, 1.5, FINO);
      vaso(p, L / 2 + 24, 25, 8, 7);
      folha(p, L / 2 + 24, 21, 4, 4.5);
      p.caixa(L / 2 - 26, 26, 10, 12, P, 0.5, FINO);
    },
  },

  "mesa-piquenique": {
    sobe: 6,
    desenhar(p, L, A, _v, rnd) {
      const { papel: P, meio: M, tinta: T, sombra: S } = MUNDO;
      p.chapa(6, A - 14, L - 8, 14, S, 4);
      // banco de trás (norte)
      p.caixa(8, 16, 5, 8, M, 1);
      p.caixa(L - 13, 16, 5, 8, M, 1);
      p.caixa(5, 4, L - 10, 14, M, 3);
      p.caixa(5, 4, L - 10, 8, P, 3);
      // mesa: pernas, espessura e tampo
      p.caixa(10, 54, 5, 18, M, 1);
      p.caixa(L - 15, 54, 5, 18, M, 1);
      p.caixa(1, 22, L - 2, 40, M, 4);
      p.caixa(1, 22, L - 2, 34, P, 4);
      riscos(p, 8, 30, L - 24, rnd);
      // itens sobre a mesa
      p.elipse(L / 2 - 12, 40, 8, 4, P);
      p.elipse(L / 2 - 12, 39.5, 4.5, 2, null, FINO);
      p.caixa(L / 2 + 6, 33, 9, 7, M, 2, FINO + 0.5);
      p.caixa(L / 2 + 17, 40, 5, 6, T, 1.5, 0);
      // banco da frente (sul)
      p.caixa(10, 82, 4, 10, M, 1);
      p.caixa(L - 14, 82, 4, 10, M, 1);
      p.caixa(5, 66, L - 10, 18, M, 3);
      p.caixa(5, 66, L - 10, 10, P, 3);
    },
  },

  "mesa-redonda": {
    sobe: 8,
    desenhar(p, L, A, _v, rnd) {
      const { papel: P, meio: M, tinta: T } = MUNDO;
      const cx = L / 2;
      sombraRedonda(p, cx + 1, A - 6, 27, 8);
      // banquinhos
      for (const x of [cx - 26, cx + 26]) {
        p.caixa(x - 1.5, A - 20, 3, 12, T, 0.5, 0);
        p.elipse(x, A - 8, 6, 2.2, T);
        p.elipse(x, A - 22, 8, 4.5, P);
      }
      p.caixa(cx - 3, 18, 6, A - 28, M, 1);
      p.elipse(cx, A - 8, 10, 3, M);
      p.elipse(cx, 18, 22, 11, M);
      p.elipse(cx, 15, 22, 11, P);
      riscos(p, cx - 12, 12, 24, rnd);
      // vasinho e copos
      p.caixa(cx - 3, 7, 6, 6, M, 1.5, FINO + 0.5);
      folha(p, cx, 4, 3.5, 4);
      p.caixa(cx + 9, 11, 4, 5, P, 1, FINO);
      p.caixa(cx - 13, 14, 4, 5, P, 1, FINO);
    },
  },

  jardineira: {
    sobe: 14,
    desenhar(p, L, A, _v, rnd) {
      const { papel: P, meio: M, tinta: T } = MUNDO;
      sombraBase(p, L, A - 3, 1);
      const n = Math.floor(L / 8);
      for (let i = 0; i < n; i++) {
        const x = 5 + i * ((L - 10) / n) + 4;
        const a = 6 + Math.floor(rnd() * 7);
        p.linha([[x, 16], [x, 16 - a]], 1.5);
        folha(p, x - 3, 14 - a / 2, 3, 2);
        p.elipse(x, 14 - a - 1, 2.6, 2.6, i % 3 === 0 ? T : P, FINO + 0.5);
      }
      p.caixa(0, 15, L, 15, M, 3);
      p.caixa(0, 15, L, 4, P, 2);
      for (let x = 10; x < L - 4; x += 16) p.linha([[x, 20], [x, 28]], FINO);
    },
  },

  puff: {
    sobe: 4,
    desenhar(p, L, A, v) {
      const { papel: P, tinta: T } = MUNDO;
      const tom = tomDe(v.estilo, "rosa", true);
      const cx = L / 2;
      sombraRedonda(p, cx + 2, A - 4, 12, 4);
      p.forma((c) => {
        c.moveTo(cx - 12, 22);
        c.quadraticCurveTo(cx - 14, 10, cx - 5, 10);
        c.quadraticCurveTo(cx, 8, cx + 5, 10);
        c.quadraticCurveTo(cx + 14, 10, cx + 12, 22);
        c.quadraticCurveTo(cx, 29, cx - 12, 22);
      }, tom.f);
      p.curva(cx - 7, 21, cx, 24, cx + 7, 21, FINO, tom.d);
      p.ponto(cx, 13, 1.2, tom.d);
      void P;
      void T;
    },
  },

  aparador: {
    sobe: 22,
    desenhar(p, L, A, _v, rnd) {
      const { papel: P, meio: M, tinta: T } = MUNDO;
      sombraBase(p, L, A);
      p.caixa(4, A - 5, 3, 5, T, 0.5, 0);
      p.caixa(L - 7, A - 5, 3, 5, T, 0.5, 0);
      p.caixa(0, 8, L, 22, M, 3);
      p.caixa(-0.5, 6, L + 1, 6, P, 2.5);
      const n = Math.max(2, Math.round(L / 32));
      const lp = (L - 6) / n;
      for (let i = 0; i < n; i++) {
        const x = 3 + i * lp;
        p.caixa(x + 1, 14, lp - 2, 13, P, 1.5, FINO);
        p.ponto(x + lp - 6, 20, 1.3);
      }
      // em cima: vaso, livros e luminária de mesa
      vaso(p, 14, -1, 10, 8);
      folha(p, 14, -6, 4, 5);
      pilha(p, Math.floor(L / 2) - 8, 6, 14, 4);
      p.linha([[L - 11, 5], [L - 11, -2]], TRACO);
      p.poli([[L - 16, -9], [L - 6, -9], [L - 4, -2], [L - 18, -2]], P);
      void rnd;
    },
  },

  balcao: {
    sobe: 16,
    desenhar(p, L, A) {
      const { papel: P, meio: M, tinta: T } = MUNDO;
      sombraBase(p, L, A);
      p.caixa(0, 10, L, 20, M, 3);
      const n = Math.floor(L / 32);
      for (let i = 0; i < n; i++) {
        const x = 3 + i * 32;
        p.caixa(x, 15, 28, 13, P, 1.5, FINO);
        p.ponto(x + 14, 21, 1.4);
      }
      p.caixa(-1, 6, L + 2, 8, P, 2.5);
      // cafeteira
      p.caixa(6, -9, 16, 16, T, 3);
      p.caixa(9, 0, 5, 6, P, 1, 0);
      p.ponto(18, -4, 1.2, P);
      // micro-ondas
      p.caixa(L - 36, -6, 22, 13, P, 2.5);
      p.caixa(L - 33, -3, 13, 7, T, 1.5, 0);
      // frutas
      p.elipse(L - 8, 4, 4, 2, P, FINO + 0.5);
      p.elipse(L - 10, 1.5, 2.2, 2.2, P, FINO + 0.5);
      p.elipse(L - 6, 1.5, 2.2, 2.2, P, FINO + 0.5);
    },
  },

  banco: {
    sobe: 12,
    desenhar(p, L, A) {
      const { papel: P, meio: M, tinta: T } = MUNDO;
      sombraBase(p, L, A - 4, 1);
      p.caixa(3, 14, 3, 14, M, 1);
      p.caixa(L - 6, 14, 3, 14, M, 1);
      // encosto (ripas)
      for (let i = 0; i < 3; i++) p.caixa(1, i * 5 - 2, L - 2, 4, i === 1 ? M : P, 1.5);
      // assento
      p.caixa(0, 14, L, 8, M, 2.5);
      p.caixa(0, 14, L, 5, P, 2.5);
      void T;
    },
  },

  copiadora: {
    sobe: 12,
    desenhar(p, L, A) {
      const { papel: P, meio: M, tinta: T } = MUNDO;
      const cx = L / 2;
      sombraRedonda(p, cx + 2, A - 3, 12, 3);
      p.caixa(cx - 12, 8, 24, A - 10, M, 3);
      p.caixa(cx - 13, 6, 26, 8, P, 2.5);
      p.caixa(cx - 6, 1, 14, 7, P, 1.5, FINO + 0.5);
      p.caixa(cx + 3, 17, 7, 4, T, 1, 0);
      p.ponto(cx + 6, 19, 0.9, P);
      p.caixa(cx - 9, 17, 10, 6, P, 1, FINO);
      p.linha([[cx - 7, 25], [cx + 7, 25]], FINO);
    },
  },
};

// ---------------------------------------------------------------- API

const MARGEM = 4;

export type Sprite = { canvas: HTMLCanvasElement; dx: number; dy: number; prof: number };

/** Desenha um Móvel num canvas próprio (`res` px por unidade do mundo); (dx, dy) é o deslocamento do canto da pegada dentro do canvas. */
export function desenharMovel(m: Movel, res: number): Sprite | null {
  const d = DESENHOS[m.tipo];
  if (!d) return null;
  const L = m.larg * TILE;
  const A = m.alt * TILE;
  const lado = (d.lado ?? 0) + MARGEM;
  const sobe = d.sobe + MARGEM;
  const [canvas, caneta] = criarCanvas(L + lado * 2, A + sobe + MARGEM + 4, res);
  const p = caneta.em(lado, sobe);
  d.desenhar(p, L, A, parseVariante(m.variante), aleatorio(hashTexto(`${m.tipo}${m.col},${m.lin}`)), m);
  return { canvas, dx: -lado, dy: -sobe, prof: d.prof ?? 0 };
}

/** Folga em volta do canvas do contorno alcançável (em unidades do mundo). */
export const FOLGA_ALCANCAVEL = 4;

/**
 * Contorno amarelo de um Móvel alcançável (gancho para a Deixa, etapa 4): a silhueta do sprite engordada em
 * `espessura`, pintada de amarelo. Vai atrás do Móvel; o canvas tem `FOLGA_ALCANCAVEL` a mais em cada lado.
 */
export function contornoAlcancavel(sprite: HTMLCanvasElement, res: number, espessura = 3): HTMLCanvasElement {
  const folga = FOLGA_ALCANCAVEL * res;
  const saida = document.createElement("canvas");
  saida.width = sprite.width + folga * 2;
  saida.height = sprite.height + folga * 2;
  const ctx = saida.getContext("2d")!;
  // silhueta: o sprite replicado em volta, depois tingido de amarelo só onde há tinta
  const raio = espessura * res;
  const passos = 16;
  for (let i = 0; i < passos; i++) {
    const a = (i / passos) * Math.PI * 2;
    ctx.drawImage(sprite, folga + Math.cos(a) * raio, folga + Math.sin(a) * raio);
  }
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = MUNDO.amarelo;
  ctx.fillRect(0, 0, saida.width, saida.height);
  return saida;
}
