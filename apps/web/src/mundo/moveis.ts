import { TILE, type Movel, type TipoMovel } from "@baguin/shared";
import { Pena, aleatorio, clarear, criarCanvas, escurecer, hashTexto, mix } from "./pixel";

/**
 * Móveis em pixel art (visão 3/4): cada peça vira um canvas próprio, ordenado por y no mundo.
 * Os desenhos usam coordenadas relativas à pegada (0,0)-(L,A); o que passa de y < 0 é a parte alta.
 */

// ---------------------------------------------------------------- paletas

const COR: Record<string, string> = {
  coral: "#F29A8D",
  azul: "#82A2F0",
  menta: "#7DCFB2",
  amarelo: "#F5CB6E",
  rosa: "#F4A6C8",
  lavanda: "#B9A9F0",
  verde: "#92CB8C",
  pessego: "#F8BB90",
  cinza: "#A3A9C4",
  lilas: "#C5B0EC",
};
const cor = (nome: string | undefined, padrao: string) => COR[nome ?? ""] ?? COR[padrao];

const MADEIRA = { c: "#DDB583", l: "#F0CF9F", d: "#B98B5C", dd: "#8C6643" };
const MADEIRA_CLARA = { c: "#ECD2A8", l: "#F8E4C2", d: "#CBA77A", dd: "#A0805A" };
const CREME = { c: "#F4EBDD", l: "#FFF8EE", d: "#D9CBB6", dd: "#B3A48D" };
const CONTORNO = "#6D5A78";
const VERDE = { c: "#5FAE62", l: "#8BCF7C", d: "#3F8A52", dd: "#2C6A43" };
const TERRACOTA = { c: "#D98B62", l: "#EBA67D", d: "#B66A48" };
const PASTEL_LIVROS = ["#E98F86", "#F2C46D", "#7FB7A4", "#82A2F0", "#C5A0E8", "#F4A6C8", "#F8E1A0", "#9FD0E8", "#E6785F", "#6E86C8"];

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
  desenhar: (p: Pena, L: number, A: number, v: Variante, rnd: () => number, m: Movel) => void;
};

// ---------------------------------------------------------------- blocos reutilizáveis

/** Sombra suave projetada para baixo e um pouco à direita (luz vinda de cima à esquerda). */
function sombraBase(p: Pena, L: number, A: number, folga = 3) {
  p.sombraR(3, A - 3, L - 2 + folga, 6, 0.1);
  p.sombraR(2, A - 1, L - 1 + folga, 4, 0.14);
  p.sombraR(4, A + 2, L - 4, 2, 0.08);
}

function folha(p: Pena, cx: number, cy: number, rx: number, ry: number, t = VERDE) {
  p.elipse(cx, cy, rx, ry, t.d);
  p.elipse(cx - 1, cy - 1, rx - 1, ry - 1, t.c);
  p.elipse(cx - 2, cy - 2, Math.max(1, rx - 3), Math.max(1, ry - 3), t.l);
}

function vaso(p: Pena, cx: number, y: number, larg: number, alt: number, t: { c: string; l: string; d: string }) {
  const x = cx - Math.floor(larg / 2);
  p.caixa(x, y, larg, alt, t.d);
  p.r(x + 1, y + 1, larg - 2, alt - 2, t.c);
  p.r(x, y, larg, 2, t.l); // borda
  p.r(x + 1, y + 2, 2, alt - 3, t.l);
  p.r(x + larg - 3, y + 2, 2, alt - 3, t.d);
}

// ---------------------------------------------------------------- desenhos

const DESENHOS: Partial<Record<TipoMovel, Desenho>> = {
  estante: {
    sobe: 34,
    desenhar(p, L, A, _v, rnd) {
      sombraBase(p, L, A);
      const top = -34;
      const h = A - top;
      p.caixa(0, top, L, h, "#7A5A3E", 2);
      p.caixa(1, top + 1, L - 2, h - 2, MADEIRA.c, 2);
      p.r(2, top + 2, L - 4, 2, MADEIRA.l); // tampo iluminado
      p.r(3, top + 4, L - 6, h - 8, "#8E6C4A"); // fundo
      const vaos = [top + 5, top + 23];
      const alturaVao = 16;
      vaos.forEach((y0, vi) => {
        let x = 5;
        while (x < L - 10) {
          const r = rnd();
          if (r < 0.14) {
            // objeto decorativo
            const kind = Math.floor(rnd() * 3);
            if (kind === 0) {
              vaso(p, x + 4, y0 + alturaVao - 6, 7, 6, TERRACOTA);
              folha(p, x + 4, y0 + alturaVao - 10, 4, 4);
            } else if (kind === 1) {
              p.caixa(x, y0 + alturaVao - 11, 9, 11, "#FBF3E2", 1);
              p.r(x + 2, y0 + alturaVao - 9, 5, 4, mix("#82A2F0", "#fff", vi * 0.3));
            } else {
              p.elipse(x + 3, y0 + alturaVao - 4, 3, 4, "#F4A6C8");
              p.r(x + 2, y0 + alturaVao - 1, 3, 1, "#B66A48");
            }
            x += 10;
            continue;
          }
          const w = 3 + Math.floor(rnd() * 3);
          const hh = 9 + Math.floor(rnd() * 7);
          const c = PASTEL_LIVROS[Math.floor(rnd() * PASTEL_LIVROS.length)];
          p.r(x, y0 + alturaVao - hh, w, hh, c);
          p.r(x, y0 + alturaVao - hh, 1, hh, clarear(c, 0.3));
          p.r(x + w - 1, y0 + alturaVao - hh, 1, hh, escurecer(c, 0.25));
          p.h(x + 1, y0 + alturaVao - hh + 2, Math.max(1, w - 2), clarear(c, 0.5));
          x += w;
          if (rnd() < 0.12) x += 2;
        }
        p.r(3, y0 + alturaVao, L - 6, 2, MADEIRA.d); // tábua
        p.r(3, y0 + alturaVao, L - 6, 1, MADEIRA.l);
        p.sombraR(3, y0 + alturaVao + 2, L - 6, 1, 0.22);
      });
      // armário embaixo
      const y0 = top + 41;
      p.r(3, y0, L - 6, A - 3 - y0, MADEIRA.c);
      const portas = Math.max(1, Math.round((L - 6) / 30));
      const lp = (L - 6) / portas;
      for (let i = 0; i < portas; i++) {
        const x = 3 + Math.round(i * lp);
        const w = Math.round(lp);
        p.caixaC(x + 1, y0 + 1, w - 2, A - 5 - y0, MADEIRA.l, MADEIRA.d);
        p.r(x + 3, y0 + 3, w - 6, 1, clarear(MADEIRA.l, 0.4));
        p.r(x + w - 6, y0 + 5, 2, 4, MADEIRA.dd);
      }
      p.r(3, A - 4, L - 6, 2, MADEIRA.d);
    },
  },

  planta: {
    sobe: 30,
    lado: 6,
    desenhar(p, L, A, v, rnd) {
      const cx = L / 2;
      const estilo = v.estilo || "ficus";
      p.sombra(cx + 2, A - 3, 11, 3, 0.16);
      const pote = estilo === "arbusto" ? null : estilo === "monstera" ? { c: "#F2EEE6", l: "#FFFFFF", d: "#CFC8BB" } : estilo === "samambaia" ? { c: "#8FB6D9", l: "#B6D3EC", d: "#6E97BD" } : TERRACOTA;
      if (estilo === "ficus") {
        p.r(cx - 1, 0, 3, 18, "#8C6643");
        folha(p, cx, -10, 12, 12);
        folha(p, cx - 7, -3, 7, 7);
        folha(p, cx + 8, -2, 7, 7, { ...VERDE, c: "#6DBB67" });
        for (let i = 0; i < 12; i++) p.p(cx - 10 + Math.floor(rnd() * 22), -18 + Math.floor(rnd() * 20), VERDE.l);
        if (pote) vaso(p, cx, 16, 14, 13, pote);
      } else if (estilo === "monstera") {
        // folhas largas em leque, de trás para frente; um vinco claro por folha e duas "lascas" nas bordas
        const folhas: [number, number, number, number, string][] = [
          [cx - 6, -15, 6, 8, "#3F9658"], [cx + 7, -14, 6, 8, "#4AA05E"], [cx - 11, -4, 7, 7, "#4FA565"],
          [cx + 12, -3, 7, 7, "#3F9658"], [cx, -8, 7, 9, "#58B06C"], [cx - 7, 6, 7, 5, "#4AA05E"], [cx + 8, 6, 7, 5, "#58B06C"],
        ];
        for (const [fx, fy, rx, ry, c] of folhas) {
          folha(p, fx, fy, rx, ry, { ...VERDE, c, l: clarear(c, 0.3), d: escurecer(c, 0.3) });
          p.v(fx, fy - ry + 3, ry * 2 - 5, clarear(c, 0.45));
          p.p(fx - rx + 1, fy, escurecer(c, 0.45));
          p.p(fx + rx - 1, fy + 1, escurecer(c, 0.45));
        }
        if (pote) vaso(p, cx, 16, 14, 13, pote);
      } else if (estilo === "palmeira") {
        p.r(cx - 1, -6, 3, 24, "#9B7448");
        p.r(cx - 1, -6, 1, 24, "#B58C5A");
        const leques: [number, number][] = [[-12, -2], [-9, -9], [-3, -14], [3, -14], [9, -9], [12, -2], [-7, 1], [7, 1]];
        for (const [dx, dy] of leques) {
          const n = 8;
          for (let i = 0; i <= n; i++) {
            const x = cx + (dx * i) / n;
            const y = -8 + ((dy + 8) * i) / n + (i * i) / 14;
            p.r(x, y, 2, 2, i % 2 ? VERDE.c : VERDE.l);
            if (i > 2) p.p(x, y + 2, VERDE.d);
          }
        }
        p.elipse(cx, -8, 3, 2, VERDE.d);
        if (pote) vaso(p, cx, 16, 14, 13, pote);
      } else if (estilo === "samambaia") {
        for (let i = 0; i < 9; i++) {
          const ang = -Math.PI * (0.05 + 0.9 * (i / 8));
          for (let k = 2; k <= 15; k++) {
            const x = cx + Math.cos(ang) * k * 0.95;
            const y = 14 + Math.sin(ang) * k * 1.0 + (k * k) / 40;
            p.r(x, y, 2, 2, k % 3 ? VERDE.c : VERDE.l);
            if (k % 2 === 0) p.p(x + (Math.cos(ang) > 0 ? -1 : 2), y + 1, VERDE.d);
          }
        }
        if (pote) vaso(p, cx, 16, 14, 13, pote);
      } else if (estilo === "arbusto") {
        p.elipse(cx, 14, 14, 11, VERDE.d);
        p.elipse(cx - 1, 12, 13, 10, VERDE.c);
        p.elipse(cx - 3, 9, 8, 6, VERDE.l);
        for (let i = 0; i < 10; i++) {
          const fx = cx - 11 + Math.floor(rnd() * 22);
          const fy = 6 + Math.floor(rnd() * 14);
          const fc = ["#F4A6C8", "#FFF3C4", "#F8BB90"][i % 3];
          p.r(fx, fy, 2, 2, fc);
          p.p(fx, fy, "#fff");
        }
      } else {
        // vaso pequeno com suculenta
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          folha(p, cx + Math.cos(a) * 5, 12 + Math.sin(a) * 2, 3, 4, { ...VERDE, c: "#7CC58F", l: "#A5E0AC" });
        }
        folha(p, cx, 10, 3, 4, { ...VERDE, c: "#8BD39B", l: "#B8ECBF" });
        if (pote) vaso(p, cx, 16, 12, 12, { c: "#F2EEE6", l: "#FFFFFF", d: "#CFC8BB" });
      }
    },
  },

  arvore: {
    sobe: 56,
    lado: 26,
    desenhar(p, L, A, _v, rnd) {
      const cx = L / 2;
      p.sombra(cx + 3, A - 1, 26, 7, 0.14);
      p.r(cx - 3, 2, 7, A - 4, "#8A6343");
      p.r(cx - 3, 2, 2, A - 4, "#A77F56");
      p.r(cx + 2, 2, 2, A - 4, "#6E4D33");
      p.r(cx - 6, A - 6, 13, 4, "#8A6343");
      p.elipse(cx, -20, 24, 22, "#4E9A57");
      p.elipse(cx - 12, -10, 13, 12, "#4E9A57");
      p.elipse(cx + 13, -9, 12, 11, "#4E9A57");
      p.elipse(cx - 1, -23, 22, 19, "#64B464");
      p.elipse(cx - 13, -12, 11, 10, "#64B464");
      p.elipse(cx + 12, -11, 10, 9, "#64B464");
      p.elipse(cx - 6, -29, 14, 10, "#86CF78");
      p.elipse(cx + 8, -20, 7, 6, "#7AC46F");
      for (let i = 0; i < 26; i++) {
        const x = cx - 22 + Math.floor(rnd() * 44);
        const y = -40 + Math.floor(rnd() * 44);
        const d = Math.hypot((x - cx) / 24, (y + 18) / 22);
        if (d < 0.95) p.r(x, y, 2, 1, rnd() > 0.5 ? "#A9E08D" : "#3F8A52");
      }
      for (let i = 0; i < 7; i++) p.p(cx - 18 + Math.floor(rnd() * 36), -36 + Math.floor(rnd() * 34), "#F8D4E4");
    },
  },

  sofa: {
    sobe: 8,
    desenhar(p, L, A, v) {
      const c = cor(v.cor, v.estilo === "frente" ? "azul" : "coral");
      const l = clarear(c, 0.28);
      const d = escurecer(c, 0.22);
      const dd = escurecer(c, 0.42);
      sombraBase(p, L, A);
      if (v.estilo === "costas") {
        // visto por trás (olha para cima): encosto alto e braços
        p.caixa(0, 4, L, 24, dd, 2);
        p.caixa(1, 5, L - 2, 22, c, 2);
        p.r(3, 6, L - 6, 3, l);
        p.r(3, 9, L - 6, 1, clarear(c, 0.12));
        p.r(3, 21, L - 6, 6, d);
        p.r(3, 20, L - 6, 1, escurecer(c, 0.1));
        const n = Math.max(2, Math.round((L - 10) / 26));
        for (let i = 1; i < n; i++) p.r(Math.round(5 + ((L - 10) * i) / n), 9, 1, 12, d);
        p.caixa(0, 7, 6, 21, d, 2); // braços (vistos de trás: laterais)
        p.caixa(L - 6, 7, 6, 21, d, 2);
        p.r(1, 8, 2, 4, l);
        p.r(L - 5, 8, 2, 4, l);
        p.r(3, 28, 3, 3, "#5A4636");
        p.r(L - 6, 28, 3, 3, "#5A4636");
        // almofada espiando por cima
        p.caixa(L - 26, 0, 12, 9, mix(c, "#FFF3C4", 0.55), 2);
        p.r(L - 25, 1, 5, 2, "#ffffff88");
      } else {
        // visto de frente: encosto, assentos e braços
        p.caixa(0, 6, L, 24, dd, 2);
        p.caixa(5, 0, L - 10, 16, d, 3);
        p.r(7, 1, L - 14, 2, l);
        p.caixa(5, 2, L - 10, 13, c, 3);
        p.r(7, 2, L - 14, 2, l);
        const n = Math.max(2, Math.round((L - 18) / 28));
        const lc = (L - 18) / n;
        for (let i = 0; i < n; i++) {
          const x = 9 + Math.round(i * lc);
          p.caixaC(x, 13, Math.round(lc) - 1, 12, mix(c, "#fff", 0.1), d);
          p.r(x + 2, 14, Math.round(lc) - 5, 2, l);
        }
        p.caixa(0, 8, 10, 20, d, 3);
        p.caixa(L - 10, 8, 10, 20, d, 3);
        p.caixa(1, 7, 8, 7, c, 3);
        p.caixa(L - 9, 7, 8, 7, c, 3);
        p.r(3, 8, 4, 2, l);
        p.r(L - 7, 8, 4, 2, l);
        p.r(10, 25, L - 20, 3, dd);
        p.r(3, 28, 3, 3, "#5A4636");
        p.r(L - 6, 28, 3, 3, "#5A4636");
        // almofada no canto
        p.caixa(11, 8, 9, 9, mix(c, "#FFF3C4", 0.6), 2);
        p.r(12, 9, 4, 2, "#ffffffaa");
      }
    },
  },

  poltrona: {
    sobe: 6,
    desenhar(p, L, A, v) {
      const c = cor(v.cor, "coral");
      const l = clarear(c, 0.28);
      const d = escurecer(c, 0.22);
      const dd = escurecer(c, 0.42);
      p.sombra(L / 2 + 2, A - 3, 12, 3, 0.16);
      if (v.estilo === "frente") {
        p.caixa(4, 2, 24, 16, d, 3);
        p.caixa(5, 2, 22, 14, c, 3);
        p.r(8, 3, 16, 2, l);
        p.caixa(3, 10, 6, 17, d, 2);
        p.caixa(L - 9, 10, 6, 17, d, 2);
        p.caixaC(9, 14, 14, 11, mix(c, "#fff", 0.1), d);
        p.r(10, 15, 12, 2, l);
        p.r(5, 26, 3, 3, "#5A4636");
        p.r(L - 8, 26, 3, 3, "#5A4636");
      } else {
        // vista lateral: desenhada virada para a direita (encosto à esquerda) e espelhada para "esq"
        const esq = v.estilo === "esq";
        const bx = (x: number, w: number) => (esq ? L - x - w : x);
        const caixa = (x: number, y: number, w: number, h: number, fundo: string, raio = 2) => {
          p.caixa(bx(x, w), y, w, h, dd, raio);
          p.caixa(bx(x + 1, w - 2), y + 1, w - 2, h - 2, fundo, raio);
        };
        const luz = (x: number, y: number, w: number) => p.r(bx(x, w), y, w, 1, l);
        caixa(10, 6, 18, 9, d); // braço de trás
        caixa(3, 2, 10, 27, c, 3); // encosto
        p.r(bx(5, 2), 5, 2, 20, l);
        p.r(bx(10, 2), 6, 2, 21, d);
        caixa(11, 13, 17, 13, mix(c, "#ffffff", 0.1)); // assento
        luz(13, 14, 13);
        p.r(bx(12, 15), 23, 15, 2, d);
        p.r(bx(14, 1), 17, 1, 4, d);
        caixa(9, 21, 19, 8, c); // braço da frente
        luz(11, 22, 15);
        p.r(bx(5, 3), A - 3, 3, 2, "#5A4636");
        p.r(bx(24, 3), A - 3, 3, 2, "#5A4636");
      }
    },
  },

  "mesa-centro": {
    sobe: 4,
    desenhar(p, L, A, _v, rnd) {
      sombraBase(p, L, A, 1);
      p.r(6, 22, 3, 7, MADEIRA.dd);
      p.r(L - 9, 22, 3, 7, MADEIRA.dd);
      p.caixa(2, 4, L - 4, 20, MADEIRA.dd, 3);
      p.caixa(2, 3, L - 4, 19, MADEIRA.d, 3);
      p.caixa(3, 3, L - 6, 17, MADEIRA.c, 3);
      p.r(6, 5, L - 12, 2, MADEIRA.l);
      for (let i = 0; i < 3; i++) p.h(6 + Math.floor(rnd() * 6), 9 + i * 4, 6 + Math.floor(rnd() * 10), MADEIRA.d);
      // objetos
      const cx = Math.floor(L / 2);
      p.caixa(cx - 10, 7, 9, 6, "#E98F86", 1);
      p.r(cx - 9, 8, 7, 1, "#F6B8B0");
      p.caixa(cx - 9, 5, 8, 5, "#82A2F0", 1);
      p.r(cx + 4, 7, 6, 5, "#FBF3E2");
      p.r(cx + 10, 8, 2, 3, "#FBF3E2");
      p.r(cx + 5, 8, 4, 1, "#8C6643");
      p.r(cx + 11, 14, 5, 4, "#9ED7C5");
      folha(p, cx + 13, 12, 3, 3);
    },
  },

  "mesa-lateral": {
    sobe: 12,
    desenhar(p, L, A) {
      p.sombra(L / 2 + 2, A - 3, 10, 3, 0.16);
      p.r(15, 12, 3, 15, MADEIRA.dd);
      p.elipse(16, 28, 7, 2, MADEIRA.d);
      p.elipse(16, 13, 11, 5, MADEIRA.dd);
      p.elipse(16, 12, 11, 5, MADEIRA.d);
      p.elipse(16, 11, 10, 4, MADEIRA.c);
      p.elipse(14, 10, 6, 2, MADEIRA.l);
      // abajur
      p.r(15, 4, 2, 6, "#6D5A78");
      p.r(11, -5, 10, 8, "#FFF1C9");
      p.r(12, -6, 8, 1, "#FFF8E4");
      p.r(11, 2, 10, 1, "#E8CE92");
      p.r(13, -4, 2, 6, "#ffffffaa");
    },
  },

  tv: {
    sobe: 38,
    desenhar(p, L, A) {
      sombraBase(p, L, A);
      // móvel
      p.r(4, A - 3, 3, 3, "#8C6643");
      p.r(L - 7, A - 3, 3, 3, "#8C6643");
      p.caixa(0, 8, L, 22, CREME.dd, 2);
      p.caixa(1, 8, L - 2, 21, CREME.c, 2);
      p.r(2, 9, L - 4, 3, CREME.l);
      p.r(2, 22, L - 4, 1, CREME.d);
      const n = Math.max(2, Math.round((L - 4) / 30));
      for (let i = 1; i < n; i++) p.r(Math.round((L * i) / n), 13, 1, 15, CREME.d);
      for (let i = 0; i < n; i++) {
        const x = Math.round((L * (i + 0.5)) / n);
        p.r(x - 3, 17, 7, 2, MADEIRA.d);
      }
      // TV
      const tw = Math.min(L - 28, 96);
      const tx = Math.floor((L - tw) / 2);
      p.r(tx + tw / 2 - 6, 4, 12, 5, "#3C3A52");
      p.r(tx + tw / 2 - 10, 7, 20, 2, "#2B293D");
      p.caixa(tx, -30, tw, 36, "#2B293D", 2);
      p.r(tx + 2, -28, tw - 4, 32, "#1B1A2B");
      // tela (pôr do sol)
      const sx = tx + 3;
      const sw = tw - 6;
      for (let y = 0; y < 30; y++) {
        const t = y / 30;
        p.r(sx, -27 + y, sw, 1, t < 0.5 ? mix("#7C8FF0", "#F6A4B8", t * 2) : mix("#F6A4B8", "#FFD79A", (t - 0.5) * 2));
      }
      p.elipse(sx + sw * 0.68, -8, 6, 5, "#FFF1C9");
      for (let x = 0; x < sw; x++) {
        const h = 8 + Math.round(6 * Math.sin(x / 7) + 4 * Math.sin(x / 3));
        p.r(sx + x, 3 - h, 1, h, x % 9 < 4 ? "#6F5B9A" : "#5A4A85");
      }
      p.r(sx, -26, sw, 1, "#ffffff55");
      for (let i = 0; i < 6; i++) p.r(sx + 4 + i * 7, -27 + i * 3, 3, 1, "#ffffff40");
      p.p(tx + tw - 4, 5, "#7CF0B0");
    },
  },

  luminaria: {
    sobe: 30,
    lado: 8,
    desenhar(p, L, A) {
      const cx = L / 2;
      p.elipse(cx, A - 3, 13, 5, "rgba(255,226,150,0.14)");
      p.sombra(cx + 2, A - 3, 7, 2, 0.18);
      p.elipse(cx, A - 4, 6, 2, "#5B4B6E");
      p.elipse(cx, A - 5, 5, 1, "#7A6890");
      p.r(cx - 1, -2, 2, A - 6, "#6D5A78");
      p.elipse(cx, -10, 14, 14, "rgba(255,230,160,0.16)");
      // cúpula
      for (let y = 0; y < 13; y++) {
        const w = 5 + Math.round((y * 4) / 12);
        p.r(cx - w, -14 + y, w * 2, 1, y < 2 ? "#FFF8E0" : mix("#FFEBB0", "#F5D38A", y / 12));
      }
      p.r(cx - 5, -14, 10, 1, "#FFFDF0");
      p.r(cx - 6, -2, 12, 1, "#E5C77E");
    },
  },

  bebedouro: {
    sobe: 26,
    desenhar(p, L, A) {
      const cx = L / 2;
      p.sombra(cx + 2, A - 2, 11, 3, 0.16);
      p.caixa(cx - 8, 2, 16, A - 4, "#9DA8C8", 2);
      p.caixa(cx - 8, 2, 15, A - 5, "#F1F4FB", 2);
      p.r(cx - 6, 4, 11, 2, "#FFFFFF");
      p.r(cx + 4, 5, 3, A - 10, "#D3D9EA");
      p.r(cx - 5, 9, 4, 3, "#4EA5F0");
      p.r(cx, 9, 4, 3, "#F0675B");
      p.r(cx - 5, 15, 10, 2, "#B9C2DD");
      p.r(cx - 6, 20, 12, 5, "#D3D9EA");
      p.r(cx - 5, 21, 10, 1, "#9DA8C8");
      // galão
      p.caixa(cx - 7, -22, 14, 25, "#8FB8EE", 3);
      p.caixa(cx - 6, -22, 12, 24, "#C9E3FF", 3);
      p.r(cx - 6, -10, 12, 12, "#8EC4F8");
      p.r(cx - 4, -20, 2, 18, "#ffffffcc");
      p.r(cx - 3, -26, 6, 4, "#8FB8EE");
      p.r(cx - 2, -27, 4, 2, "#C9E3FF");
    },
  },

  bar: {
    sobe: 16,
    desenhar(p, L, A, _v, rnd) {
      sombraBase(p, L, A);
      p.caixa(0, 8, L, 22, "#4F7F78", 2);
      p.caixa(1, 14, L - 2, 15, "#79B5AC", 2);
      const n = Math.floor((L - 4) / 8);
      for (let i = 0; i < n; i++) p.r(3 + i * 8, 15, 1, 13, "#63A096");
      p.r(2, 15, L - 4, 2, "#93CDC3");
      p.caixa(-1, 6, L + 2, 9, MADEIRA.dd, 2);
      p.caixa(-1, 5, L + 2, 8, MADEIRA.d, 2);
      p.r(0, 5, L, 4, MADEIRA.c);
      p.r(1, 5, L - 2, 2, MADEIRA.l);
      // coisas em cima
      for (let i = 0; i < 4; i++) {
        const x = 8 + Math.floor(rnd() * (L - 24));
        if (i % 2 === 0) {
          p.r(x, -6, 4, 11, ["#82A2F0", "#F4A6C8", "#7DCFB2"][i % 3]);
          p.r(x + 1, -9, 2, 3, "#E8E4EF");
        } else {
          p.r(x, 0, 5, 5, "#E9F3FA");
          p.r(x + 1, 1, 3, 2, "#F5CB6E");
        }
      }
      folha(p, L - 10, 0, 5, 5);
      p.caixa(L - 14, 1, 9, 5, TERRACOTA.c, 1);
    },
  },

  banqueta: {
    sobe: 8,
    desenhar(p, L, A) {
      const cx = L / 2;
      p.sombra(cx + 2, A - 3, 9, 3, 0.16);
      p.r(cx - 1, 12, 3, 13, "#6D5A78");
      p.elipse(cx, 25, 6, 2, "#5B4B6E");
      p.r(cx - 5, 18, 10, 1, "#8A7AA0");
      p.elipse(cx, 13, 9, 5, "#D9705F");
      p.elipse(cx, 12, 9, 5, "#F29A8D");
      p.elipse(cx - 2, 11, 5, 2, "#FDC7BE");
    },
  },

  "mesa-trabalho": {
    sobe: 14,
    desenhar(p, L, A, v, rnd) {
      sombraBase(p, L, A);
      // pés/laterais
      p.r(3, A - 8, 4, 8, "#6D5A78");
      p.r(L - 7, A - 8, 4, 8, "#6D5A78");
      // tampo
      p.caixa(0, 4, L, A - 6, MADEIRA_CLARA.dd, 3);
      p.caixa(0, 3, L, A - 10, MADEIRA_CLARA.d, 3);
      p.caixa(1, 3, L - 2, A - 12, "#F4F1EC", 3);
      p.r(3, 4, L - 6, 2, "#FFFFFF");
      p.r(1, A - 10, L - 2, 2, MADEIRA_CLARA.c); // quina
      p.r(1, A - 8, L - 2, 1, MADEIRA_CLARA.dd);
      // divisória baixa (gaveteiro)
      p.caixa(L / 2 - 1, 6, 3, A - 18, "#E5E0D9", 1);
      const postos = Math.round(L / 64);
      for (let i = 0; i < postos; i++) {
        const x0 = Math.round((L / postos) * i) + 6;
        const w = Math.round(L / postos) - 12;
        // monitor
        const mw = 27;
        const mx = x0 + Math.floor((w - mw) / 2);
        p.r(mx + mw / 2 - 2, 15, 4, 5, "#59566B");
        p.r(mx + mw / 2 - 6, 19, 12, 2, "#45435A");
        p.caixa(mx, -2, mw, 18, "#3C3A52", 2);
        p.r(mx + 1, -1, mw - 2, 16, "#232138");
        const tela = (i + (v.estilo === "b" ? 1 : 0)) % 2;
        if (tela === 0) {
          p.r(mx + 2, 0, mw - 4, 13, "#26304F");
          const cs = ["#82A2F0", "#F4A6C8", "#7DCFB2", "#F5CB6E"];
          for (let k = 0; k < 6; k++) {
            const ind = (k % 3) * 2;
            p.r(mx + 4 + ind, 2 + k * 2, 3 + Math.floor(rnd() * 10), 1, cs[Math.floor(rnd() * 4)]);
          }
        } else {
          p.r(mx + 2, 0, mw - 4, 13, "#F2F5FB");
          p.r(mx + 2, 0, mw - 4, 2, "#82A2F0");
          for (let k = 0; k < 5; k++) p.r(mx + 4 + k * 4, 12 - (2 + Math.floor(rnd() * 7)), 3, 2 + Math.floor(rnd() * 7), ["#F4A6C8", "#7DCFB2", "#F5CB6E"][k % 3]);
        }
        p.r(mx + 2, -1, 8, 1, "#ffffff55");
        p.p(mx + mw / 2, 15, "#7CF0B0");
        // teclado e mouse
        p.caixa(mx + 4, 27, 18, 6, "#D9D7E2", 1);
        p.r(mx + 5, 28, 16, 1, "#F2F1F7");
        for (let k = 0; k < 4; k++) p.r(mx + 6 + k * 4, 30, 3, 1, "#B3B0C6");
        p.r(mx + 26, 29, 4, 5, "#D9D7E2");
        p.r(mx + 27, 29, 2, 2, "#F2F1F7");
        // extras por posto
        if (i % 2 === 0) {
          p.caixa(mx - 4, 24, 6, 7, "#FBF3E2", 1);
          p.r(mx - 3, 25, 4, 2, "#8C6643");
          p.r(mx + 2, 26, 2, 3, "#FBF3E2");
        } else {
          p.r(mx + mw + 1, 22, 9, 11, "#F8E1A0");
          p.r(mx + mw + 2, 24, 7, 1, "#D9BB6A");
          p.r(mx + mw + 2, 27, 5, 1, "#D9BB6A");
          p.r(mx + mw + 11, 26, 2, 8, "#E98F86");
        }
      }
      // planta pequena e luminária no canto
      vaso(p, L - 12, 22, 8, 7, TERRACOTA);
      folha(p, L - 12, 19, 5, 5);
    },
  },

  cadeira: {
    sobe: 6,
    prof: -28,
    desenhar(p, L, A, v) {
      const [estilo, nomeCor] = v.estilo.includes("-") ? v.estilo.split("-") : [v.estilo, v.cor];
      const c = cor(nomeCor, "azul");
      const l = clarear(c, 0.28);
      const d = escurecer(c, 0.25);
      const cx = L / 2;
      p.sombra(cx + 1, A - 4, 10, 3, 0.14);
      if (estilo === "costas") {
        p.r(cx - 1, 24, 3, 4, "#6D5A78");
        p.r(cx - 8, 27, 16, 2, "#59566B");
        for (const x of [-8, -3, 2, 7]) p.r(cx + x, 29, 2, 2, "#3C3A52");
        p.caixa(cx - 9, 7, 18, 18, d, 4);
        p.caixa(cx - 9, 6, 18, 17, c, 4);
        p.r(cx - 6, 7, 12, 2, l);
        p.r(cx - 7, 13, 14, 1, d);
        p.r(cx - 3, 3, 6, 4, d);
      } else {
        p.r(cx - 8, 7, 16, 10, d);
        p.caixa(cx - 8, 5, 16, 12, c, 3);
        p.r(cx - 5, 6, 10, 2, l);
        p.caixa(cx - 9, 15, 18, 8, d, 3);
        p.caixa(cx - 9, 14, 18, 7, c, 3);
        p.r(cx - 6, 15, 12, 2, l);
        p.r(cx - 1, 23, 3, 4, "#6D5A78");
        p.r(cx - 8, 26, 16, 2, "#59566B");
        for (const x of [-8, -3, 2, 7]) p.r(cx + x, 28, 2, 2, "#3C3A52");
      }
    },
  },

  "mesa-reuniao": {
    sobe: 8,
    desenhar(p, L, A, _v, rnd) {
      sombraBase(p, L, A);
      p.r(L / 2 - 4, A - 8, 8, 8, "#6D5A78");
      p.r(14, A - 8, 4, 8, "#6D5A78");
      p.r(L - 18, A - 8, 4, 8, "#6D5A78");
      p.caixa(0, 6, L, A - 8, MADEIRA.dd, 5);
      p.caixa(0, 4, L, A - 10, MADEIRA.d, 5);
      p.caixa(1, 4, L - 2, A - 12, MADEIRA.c, 5);
      p.caixa(3, 6, L - 6, A - 18, MADEIRA.l, 4);
      p.caixa(4, 7, L - 8, A - 20, MADEIRA.c, 4);
      for (let i = 0; i < 6; i++) p.h(8 + Math.floor(rnd() * 20), 12 + i * 6, 14 + Math.floor(rnd() * 40), MADEIRA.d);
      p.r(8, 8, L - 16, 2, MADEIRA.l);
      // notebooks, garrafa, papéis
      const posicoes = [22, 52, 82, 112];
      posicoes.forEach((x, i) => {
        if (x > L - 26) return;
        p.caixa(x, 12, 15, 9, "#CFCFE0", 1);
        p.r(x + 1, 13, 13, 6, i % 2 ? "#26304F" : "#82A2F0");
        p.r(x + 3, 14, 5, 1, "#F4A6C8");
        p.r(x + 1, 21, 13, 2, "#B3B0C6");
        p.caixa(x + 2, 34, 15, 9, "#CFCFE0", 1);
        p.r(x + 3, 35, 13, 6, i % 2 ? "#82A2F0" : "#26304F");
        p.r(x + 3, 43, 13, 2, "#B3B0C6");
      });
      p.r(L / 2 - 2, 22, 5, 12, "#8EC4F8");
      p.r(L / 2 - 1, 20, 3, 3, "#C9E3FF");
      p.r(L / 2 - 2, 25, 5, 1, "#ffffffaa");
      vaso(p, L / 2 + 24, 26, 8, 7, TERRACOTA);
      folha(p, L / 2 + 24, 23, 5, 5);
      p.r(L / 2 - 26, 26, 10, 12, "#FFFFFF");
      p.r(L / 2 - 25, 28, 8, 1, "#C9C4D8");
      p.r(L / 2 - 25, 31, 6, 1, "#C9C4D8");
    },
  },

  "mesa-piquenique": {
    sobe: 6,
    desenhar(p, L, A, _v, rnd) {
      const w = { c: "#CE955F", l: "#E5B585", d: "#A56F43", dd: "#7E5232" };
      // sombra no deck
      p.sombraR(6, A - 14, L - 8, 14, 0.14);
      p.sombraR(8, A - 6, L - 14, 6, 0.1);
      // banco de trás (norte): tampo + frente
      p.caixa(5, 4, L - 10, 14, w.dd, 2);
      p.r(5, 4, L - 10, 8, w.c);
      p.r(6, 4, L - 12, 2, w.l);
      p.r(5, 12, L - 10, 6, w.d);
      p.r(5, 12, L - 10, 1, w.dd);
      p.r(8, 18, 4, 6, w.dd);
      p.r(L - 12, 18, 4, 6, w.dd);
      // mesa: pernas, tampo com tábuas e quina
      p.r(10, 54, 5, 18, w.dd);
      p.r(L - 15, 54, 5, 18, w.dd);
      p.caixa(1, 22, L - 2, 40, w.dd, 3);
      p.caixa(1, 22, L - 2, 34, w.c, 3);
      p.r(3, 24, L - 6, 2, w.l);
      for (let i = 1; i < 5; i++) p.h(2, 22 + i * 7, L - 4, w.d);
      for (let i = 0; i < 10; i++) p.h(5 + Math.floor(rnd() * 70), 25 + Math.floor(rnd() * 27), 4 + Math.floor(rnd() * 10), w.l);
      p.r(1, 56, L - 2, 6, w.d);
      p.r(1, 56, L - 2, 1, w.dd);
      // itens sobre a mesa
      p.elipse(L / 2 - 12, 38, 8, 4, "#F7F3EA");
      p.elipse(L / 2 - 12, 37, 6, 3, "#E98F86");
      p.r(L / 2 + 2, 32, 9, 7, "#FBF3E2");
      p.r(L / 2 + 11, 34, 3, 3, "#FBF3E2");
      p.r(L / 2 + 3, 35, 7, 2, "#8C6643");
      p.r(L / 2 + 16, 40, 6, 6, "#F5CB6E");
      p.r(L / 2 - 28, 30, 5, 7, "#9ED7C5");
      p.r(L / 2 + 20, 28, 5, 7, "#F4A6C8");
      // banco da frente (sul)
      p.r(10, 82, 4, 10, w.dd);
      p.r(L - 14, 82, 4, 10, w.dd);
      p.caixa(5, 66, L - 10, 18, w.dd, 2);
      p.r(5, 66, L - 10, 10, w.c);
      p.r(6, 66, L - 12, 2, w.l);
      p.r(5, 76, L - 10, 7, w.d);
      p.r(5, 76, L - 10, 1, w.dd);
    },
  },

  "mesa-redonda": {
    sobe: 8,
    desenhar(p, L, A) {
      p.sombra(L / 2 + 2, A - 6, 26, 8, 0.14);
      const cx = L / 2;
      // banquinhos
      for (const x of [cx - 26, cx + 26]) {
        p.elipse(x, A - 14, 8, 5, "#D9705F");
        p.elipse(x, A - 15, 8, 5, "#F29A8D");
        p.elipse(x - 2, A - 16, 4, 2, "#FDC7BE");
      }
      p.r(cx - 3, 18, 6, A - 28, MADEIRA.dd);
      p.elipse(cx, A - 8, 10, 3, MADEIRA.dd);
      p.elipse(cx, 18, 22, 11, MADEIRA.dd);
      p.elipse(cx, 16, 22, 11, MADEIRA.d);
      p.elipse(cx, 15, 21, 10, MADEIRA.c);
      p.elipse(cx - 3, 12, 14, 5, MADEIRA.l);
      for (let i = 0; i < 4; i++) p.h(cx - 14 + i * 3, 13 + i * 2, 12, MADEIRA.d);
      // vasinho e copos
      p.r(cx - 2, 8, 5, 5, "#FBF3E2");
      folha(p, cx, 5, 4, 4);
      p.p(cx - 1, 3, "#F4A6C8");
      p.r(cx + 9, 11, 4, 5, "#E9F3FA");
      p.r(cx - 13, 14, 4, 5, "#E9F3FA");
    },
  },

  jardineira: {
    sobe: 14,
    desenhar(p, L, A, _v, rnd) {
      sombraBase(p, L, A - 3, 1);
      const n = Math.floor(L / 6);
      for (let i = 0; i < n; i++) {
        const x = 4 + i * ((L - 8) / n) + 3;
        const a = 4 + Math.floor(rnd() * 8);
        p.r(x, 14 - a, 1, a, VERDE.d);
        p.elipse(x - 3, 14 - a / 2, 3, 2, VERDE.c);
        p.elipse(x + 3, 13 - a / 3, 3, 2, VERDE.l);
        const fc = ["#F4A6C8", "#FFF3C4", "#F8BB90", "#C5B0EC", "#FFFFFF"][Math.floor(rnd() * 5)];
        p.r(x - 1, 14 - a - 2, 4, 4, fc);
        p.p(x, 14 - a - 1, "#F5CB6E");
      }
      p.caixa(0, 16, L, 14, MADEIRA.dd, 2);
      p.caixa(0, 15, L, 14, MADEIRA.d, 2);
      p.r(1, 15, L - 2, 3, "#6E4D33");
      p.r(1, 18, L - 2, 10, MADEIRA.c);
      p.r(1, 18, L - 2, 2, MADEIRA.l);
      p.h(1, 23, L - 2, MADEIRA.d);
      for (let x = 10; x < L - 4; x += 16) p.r(x, 18, 1, 10, MADEIRA.d);
    },
  },

  puff: {
    sobe: 4,
    desenhar(p, L, A, v) {
      const c = cor(v.estilo, "rosa");
      const cx = L / 2;
      p.sombra(cx + 2, A - 4, 12, 4, 0.16);
      p.elipse(cx, 20, 12, 9, escurecer(c, 0.25));
      p.elipse(cx, 19, 12, 9, c);
      p.elipse(cx - 2, 16, 8, 5, clarear(c, 0.3));
      p.r(cx - 1, 12, 3, 2, escurecer(c, 0.2));
      p.r(cx - 6, 22, 12, 1, escurecer(c, 0.12));
      p.r(cx - 10, 17, 1, 2, clarear(c, 0.35));
    },
  },

  aparador: {
    sobe: 22,
    desenhar(p, L, A, _v, rnd) {
      sombraBase(p, L, A);
      p.r(4, A - 4, 3, 4, MADEIRA.dd);
      p.r(L - 7, A - 4, 3, 4, MADEIRA.dd);
      p.caixa(0, 8, L, 22, CREME.dd, 2);
      p.caixa(1, 8, L - 2, 21, CREME.c, 2);
      p.r(0, 7, L, 4, MADEIRA.c);
      p.r(0, 7, L, 2, MADEIRA.l);
      p.r(0, 10, L, 1, MADEIRA.d);
      const n = Math.max(2, Math.round(L / 32));
      const lp = (L - 6) / n;
      for (let i = 0; i < n; i++) {
        const x = 3 + Math.round(i * lp);
        p.caixaC(x + 1, 13, Math.round(lp) - 2, 14, CREME.l, CREME.d);
        p.r(x + Math.round(lp) - 6, 18, 2, 4, MADEIRA.d);
      }
      // decoração: abajur/quadro/livros/vaso
      const x0 = 8;
      vaso(p, x0 + 5, 0, 10, 8, { c: "#9ED7C5", l: "#CDEFE3", d: "#6FB7A2" });
      folha(p, x0 + 5, -5, 4, 5);
      p.p(x0 + 4, -9, "#F4A6C8");
      const lx = Math.floor(L / 2) - 8;
      for (let k = 0; k < 4; k++) p.r(lx, 6 - (k + 1) * 3, 14 - k * 2, 3, PASTEL_LIVROS[(k * 3 + Math.floor(rnd() * 3)) % 10]);
      // luminária de mesa
      p.r(L - 14, -8, 8, 6, "#FFF1C9");
      p.r(L - 11, -2, 2, 8, "#6D5A78");
      p.r(L - 15, 5, 10, 2, "#6D5A78");
    },
  },

  balcao: {
    sobe: 16,
    desenhar(p, L, A, _v, rnd) {
      sombraBase(p, L, A);
      p.caixa(0, 8, L, 22, "#8A98B8", 2);
      p.caixa(1, 12, L - 2, 17, "#C6D3EA", 2);
      const n = Math.floor(L / 32);
      for (let i = 0; i < n; i++) {
        const x = 3 + i * 32;
        p.caixaC(x, 14, 28, 14, "#DCE6F5", "#9EB0CF");
        p.r(x + 12, 18, 4, 2, "#8A98B8");
      }
      p.caixa(-1, 6, L + 2, 8, "#8C96B0", 2);
      p.r(0, 6, L, 5, "#F1F4FB");
      p.r(0, 6, L, 2, "#FFFFFF");
      // cafeteira
      p.caixa(6, -9, 16, 15, "#3C3A52", 2);
      p.r(8, -7, 12, 4, "#5A577A");
      p.r(9, 0, 4, 6, "#F4F1EC");
      p.r(14, -2, 5, 2, "#7CF0B0");
      p.r(11, 1, 6, 1, "#8C6643");
      // micro-ondas
      p.caixa(L - 36, -6, 22, 14, "#E5E9F2", 2);
      p.r(L - 34, -4, 13, 10, "#2B293D");
      p.r(L - 32, -3, 6, 1, "#ffffff55");
      p.r(L - 19, -3, 3, 8, "#9EB0CF");
      // frutas
      p.elipse(L - 8, 3, 4, 2, "#E5E9F2");
      p.r(L - 11, 0, 3, 3, "#F2796B");
      p.r(L - 8, 0, 3, 3, "#F5CB6E");
      void rnd;
    },
  },

  banco: {
    sobe: 12,
    desenhar(p, L, A) {
      sombraBase(p, L, A - 4, 1);
      p.r(3, 14, 3, 14, "#6D5A78");
      p.r(L - 6, 14, 3, 14, "#6D5A78");
      // encosto (ripas)
      for (let i = 0; i < 3; i++) {
        p.r(1, i * 5 - 2, L - 2, 4, MADEIRA.d);
        p.r(1, i * 5 - 2, L - 2, 3, MADEIRA.c);
        p.r(2, i * 5 - 2, L - 4, 1, MADEIRA.l);
      }
      p.r(2, 14, 3, 6, MADEIRA.dd);
      p.r(L - 5, 14, 3, 6, MADEIRA.dd);
      // assento
      p.caixa(0, 14, L, 7, MADEIRA.dd, 2);
      p.r(0, 14, L, 5, MADEIRA.c);
      p.r(1, 14, L - 2, 2, MADEIRA.l);
      p.h(0, 18, L, MADEIRA.d);
      p.r(0, 20, L, 3, MADEIRA.d);
    },
  },

  copiadora: {
    sobe: 12,
    desenhar(p, L, A) {
      const cx = L / 2;
      p.sombra(cx + 2, A - 3, 12, 3, 0.16);
      p.caixa(cx - 12, 8, 24, A - 10, "#9DA8C8", 2);
      p.caixa(cx - 12, 8, 23, A - 11, "#EDF0F7", 2);
      p.r(cx - 10, 9, 20, 3, "#FFFFFF");
      p.r(cx - 10, 13, 20, 1, "#B9C2DD");
      p.r(cx - 10, 16, 12, 6, "#C6CEE4");
      p.r(cx + 4, 16, 6, 3, "#2B293D");
      p.r(cx + 5, 17, 4, 1, "#7CF0B0");
      p.r(cx - 6, 4, 14, 6, "#FFFFFF");
      p.r(cx - 6, 4, 14, 1, "#D9D7E2");
      p.r(cx - 7, 24, 14, 2, "#9DA8C8");
    },
  },
};

// ---------------------------------------------------------------- API

const MARGEM = 4;

export type Sprite = { canvas: HTMLCanvasElement; dx: number; dy: number; prof: number };

/** Desenha um Móvel num canvas próprio; (dx, dy) é o deslocamento do canto da pegada dentro do canvas. */
export function desenharMovel(m: Movel): Sprite | null {
  const d = DESENHOS[m.tipo];
  if (!d) return null;
  const L = m.larg * TILE;
  const A = m.alt * TILE;
  const lado = (d.lado ?? 0) + MARGEM;
  const sobe = d.sobe + MARGEM;
  const [canvas, pena] = criarCanvas(L + lado * 2, A + sobe + MARGEM + 4);
  const p = pena.em(lado, sobe);
  d.desenhar(p, L, A, parseVariante(m.variante), aleatorio(hashTexto(`${m.tipo}${m.col},${m.lin}`)), m);
  return { canvas, dx: -lado, dy: -sobe, prof: d.prof ?? 0 };
}
