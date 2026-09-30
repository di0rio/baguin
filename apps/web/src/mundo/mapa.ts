import { TEMPLATES_LUGAR, TILE, TIPOS_PAREDE, type Movel, type Template } from "@baguin/shared";
import { desenharMovel } from "./moveis";
import { Pena, aleatorio, clarear, criarCanvas, escurecer, hashTexto, mix } from "./pixel";

/**
 * Desenho do Lugar em pixel art (visão 3/4, paleta pastel): chão texturizado, paredes com face frontal,
 * tapetes, decoração de parede e portas vão num canvas só (camada do chão); cada Móvel vira um sprite
 * ordenado por y (ver `objetosDoMapa`), para o Avatar passar atrás/na frente deles.
 */

type Tema = {
  parede: { cap: string; capLuz: string; face: string; faceSombra: string; rodape: string; rodapeLuz: string };
  clima: "interno" | "externo";
};

const TEMAS: Record<Template, Tema> = {
  sala: {
    parede: { cap: "#6A5B8A", capLuz: "#8E80B0", face: "#F7EAD5", faceSombra: "#EBD9BC", rodape: "#C49A70", rodapeLuz: "#DDB890" },
    clima: "interno",
  },
  escritorio: {
    parede: { cap: "#525B82", capLuz: "#7983B2", face: "#E9ECF8", faceSombra: "#D9DEEF", rodape: "#A9B2D4", rodapeLuz: "#C5CCE6" },
    clima: "interno",
  },
  terraco: {
    parede: { cap: "#3F8A52", capLuz: "#7FCB7A", face: "#63B366", faceSombra: "#4E9E5A", rodape: "#2C6A43", rodapeLuz: "#8BD683" },
    clima: "externo",
  },
};

export type Lado = "cima" | "baixo" | "esquerda" | "direita";
export type PortaMapa = { col: number; lin: number; texto: string; lado: Lado };
export type ZonaMapa = { letra: string; nome: string; tipo: "comum" | "reuniao"; col0: number; lin0: number; col1: number; lin1: number };
export type ObjetoMapa = { chave: string; canvas: HTMLCanvasElement; x: number; y: number; depth: number };

const isPorta = (c: string | undefined) => c !== undefined && c >= "1" && c <= "9";
const isZona = (c: string | undefined) => c !== undefined && c >= "a" && c <= "z";

/** Profundidade do chão e da decoração rasteira (sempre atrás de qualquer Avatar). */
export const PROF_CHAO = -10;

// ---------------------------------------------------------------- pisos

function pisoMadeira(p: Pena, W: number, H: number, rnd: () => number) {
  const tons = ["#EED6AE", "#E8CFA4", "#F1DBB6", "#E5CB9F", "#ECD3A9"];
  for (let r = 0; r < H / 8; r++) {
    const y = r * 8;
    let x = -Math.floor(rnd() * 96);
    while (x < W) {
      const len = 72 + Math.floor(rnd() * 4) * 12;
      const tom = tons[Math.floor(rnd() * tons.length)];
      const x0 = Math.max(0, x);
      const w = Math.min(W, x + len) - x0;
      p.r(x0, y, w, 8, tom);
      p.h(x0, y, w, clarear(tom, 0.35)); // quina de cima iluminada
      p.h(x0, y + 7, w, mix(tom, "#9C7A52", 0.35)); // junta
      if (x >= 0) p.v(x, y, 8, mix(tom, "#9C7A52", 0.35));
      const veios = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < veios; i++) {
        const gx = x0 + 3 + Math.floor(rnd() * Math.max(1, w - 14));
        p.h(gx, y + 2 + Math.floor(rnd() * 4), 4 + Math.floor(rnd() * 9), mix(tom, "#B8915F", 0.3));
      }
      if (rnd() < 0.3) p.p(x0 + 4 + Math.floor(rnd() * Math.max(1, w - 8)), y + 3, mix(tom, "#8C6A43", 0.45));
      x += len;
    }
  }
}

function pisoAzulejo(p: Pena, W: number, H: number, rnd: () => number) {
  for (let ty = 0; ty < H / TILE; ty++) {
    for (let tx = 0; tx < W / TILE; tx++) {
      const x = tx * TILE;
      const y = ty * TILE;
      const base = (tx + ty) % 2 ? "#E3E6EF" : "#DCE0EB";
      p.r(x, y, TILE, TILE, base);
      p.h(x, y, TILE, "#F3F5FB");
      p.v(x, y, TILE, "#F3F5FB");
      p.h(x, y + TILE - 1, TILE, "#C5CADB");
      p.v(x + TILE - 1, y, TILE, "#C5CADB");
      // reflexo diagonal sutil
      for (let i = 0; i < 6; i++) p.p(x + 5 + i, y + 11 - i, clarear(base, 0.5));
      for (let i = 0; i < 3; i++) p.p(x + 4 + Math.floor(rnd() * 24), y + 4 + Math.floor(rnd() * 24), mix(base, "#B6BCD2", 0.35));
    }
  }
}

function pisoGrama(p: Pena, W: number, H: number, rnd: () => number) {
  p.r(0, 0, W, H, "#A5D67C");
  // manchas suaves de tom
  for (let i = 0; i < 60; i++) {
    const cx = Math.floor(rnd() * W);
    const cy = Math.floor(rnd() * H);
    p.elipse(cx, cy, 14 + Math.floor(rnd() * 26), 8 + Math.floor(rnd() * 14), rnd() > 0.5 ? "#9CCE73" : "#AEDD85");
  }
  // tufos de grama
  for (let i = 0; i < 1100; i++) {
    const x = Math.floor(rnd() * W);
    const y = Math.floor(rnd() * H);
    const c = ["#8CC166", "#B9E591", "#92C96B", "#C2EA9A"][Math.floor(rnd() * 4)];
    p.v(x, y, 2 + Math.floor(rnd() * 2), c);
    if (rnd() < 0.4) p.v(x + 2, y + 1, 2, c);
  }
  // florzinhas
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rnd() * W);
    const y = Math.floor(rnd() * H);
    const c = ["#FFFFFF", "#FFE58A", "#F8B4D0", "#D8C6F8"][Math.floor(rnd() * 4)];
    p.r(x, y, 2, 2, c);
    p.p(x, y, clarear(c, 0.4));
  }
}

// ---------------------------------------------------------------- tapetes, deck, caminho

type TonsTapete = { base: string; borda: string; luz: string; ponto: string };
const TAPETES: Record<string, TonsTapete> = {
  lavanda: { base: "#D3CBF3", borda: "#AC9FE4", luz: "#E6E0FA", ponto: "#C5BBEE" },
  lilas: { base: "#DDCDF3", borda: "#B99BE2", luz: "#EEE3FA", ponto: "#D0BDEE" },
  pessego: { base: "#FBD8BE", borda: "#F1AE86", luz: "#FDE9D8", ponto: "#F6C8A6" },
  verde: { base: "#CDE8C4", borda: "#9DCD92", luz: "#E2F3DC", ponto: "#BEDEB3" },
  rosa: { base: "#F9D0E0", borda: "#EE9FC0", luz: "#FCE5EE", ponto: "#F3BDD3" },
  menta: { base: "#C4EBDD", borda: "#8CD2B8", luz: "#DDF5EC", ponto: "#B2E0CF" },
};

function tapete(p: Pena, m: Movel, rnd: () => number) {
  const t = TAPETES[m.variante ?? "lavanda"] ?? TAPETES.lavanda;
  const x = m.col * TILE + 2;
  const y = m.lin * TILE + 2;
  const w = m.larg * TILE - 4;
  const h = m.alt * TILE - 4;
  p.sombraR(x + 1, y + 2, w, h, 0.1);
  p.caixa(x, y, w, h, t.borda, 4);
  p.caixa(x + 2, y + 2, w - 4, h - 4, t.base, 3);
  p.caixa(x + 5, y + 5, w - 10, h - 10, t.luz, 2);
  p.caixa(x + 6, y + 6, w - 12, h - 12, t.base, 2);
  // textura de fibra
  for (let i = 0; i < (w * h) / 26; i++) {
    const px = x + 8 + Math.floor(rnd() * (w - 16));
    const py = y + 8 + Math.floor(rnd() * (h - 16));
    p.r(px, py, 2, 1, rnd() > 0.5 ? t.ponto : t.luz);
  }
  // losangos ao longo da borda interna
  for (let px = x + 12; px < x + w - 10; px += 16) {
    for (const py of [y + 3, y + h - 5]) {
      p.r(px, py, 3, 2, t.borda);
    }
  }
  for (let py = y + 12; py < y + h - 10; py += 16) {
    for (const px of [x + 3, x + w - 5]) p.r(px, py, 2, 3, t.borda);
  }
}

function deck(p: Pena, m: Movel, rnd: () => number) {
  const x = m.col * TILE;
  const y = m.lin * TILE;
  const w = m.larg * TILE;
  const h = m.alt * TILE;
  // sombra no gramado e face frontal do deck
  p.sombraR(x + 2, y + h - 1, w, 9, 0.16);
  p.r(x, y + h - 6, w, 6, "#B98A5A");
  p.r(x, y + h - 6, w, 1, "#D1A46F");
  for (let i = 4; i < w; i += 14) p.v(x + i, y + h - 5, 5, "#9F7346");
  const tons = ["#EBCF9F", "#E8CA98", "#EED3A5", "#E6C792"];
  for (let r = 0; r < (h - 6) / 8; r++) {
    const yy = y + r * 8;
    let xx = x - Math.floor(rnd() * 40);
    while (xx < x + w) {
      const len = 56 + Math.floor(rnd() * 3) * 16;
      const x0 = Math.max(x, xx);
      const ww = Math.min(x + w, xx + len) - x0;
      const tom = tons[Math.floor(rnd() * tons.length)];
      const hh = Math.min(8, y + h - 6 - yy);
      p.r(x0, yy, ww, hh, tom);
      p.h(x0, yy, ww, clarear(tom, 0.35));
      p.h(x0, yy + hh - 1, ww, mix(tom, "#9B7040", 0.4));
      if (xx >= x) {
        p.v(xx, yy, hh, mix(tom, "#9B7040", 0.4));
        p.p(xx + 3, yy + 3, "#A8794A");
      }
      if (xx + len < x + w) p.p(xx + len - 4, yy + 3, "#A8794A");
      xx += len;
    }
  }
  p.r(x, y, w, 2, "#F3DDB4");
  p.r(x, y, 2, h - 6, "#F3DDB4");
}

function caminho(p: Pena, m: Movel, rnd: () => number) {
  const x = m.col * TILE;
  const y = m.lin * TILE;
  for (let c = 0; c < m.larg; c++) {
    for (let l = 0; l < m.alt; l++) {
      const cx = x + c * TILE + 16;
      const cy = y + l * TILE + 16;
      for (const [dx, dy] of [[-8, -3], [9, 2], [-2, 10], [-3, -11]] as const) {
        const rx = 7 + Math.floor(rnd() * 3);
        const ry = 5 + Math.floor(rnd() * 2);
        p.elipse(cx + dx + 1, cy + dy + 2, rx, ry, "rgba(58,47,91,0.14)");
        p.elipse(cx + dx, cy + dy, rx, ry, "#C9C2B6");
        p.elipse(cx + dx - 1, cy + dy - 1, rx - 1, ry - 1, "#E3DDD0");
        p.elipse(cx + dx - 2, cy + dy - 2, rx - 4, ry - 3, "#EFEAE0");
      }
    }
  }
}

/** Contorno pontilhado claro no limite das Zonas: mostra onde a conversa fica isolada. */
function bordaZonas(p: Pena, mapa: readonly string[]) {
  const cor = "rgba(255,255,255,0.9)";
  const sombra = "rgba(58,47,91,0.2)";
  mapa.forEach((linha, lin) =>
    [...linha].forEach((c, col) => {
      if (!isZona(c)) return;
      const x = col * TILE;
      const y = lin * TILE;
      const fora = (dc: number, dl: number) => {
        const n = mapa[lin + dl]?.[col + dc];
        return n !== c && n !== "M";
      };
      const tracejado = (x0: number, y0: number, horiz: boolean) => {
        for (let i = 2; i < TILE - 2; i += 6) {
          if (horiz) {
            p.r(x0 + i, y0 + 1, 3, 1, sombra);
            p.r(x0 + i, y0, 3, 1, cor);
          } else {
            p.r(x0 + 1, y0 + i, 1, 3, sombra);
            p.r(x0, y0 + i, 1, 3, cor);
          }
        }
      };
      if (fora(0, -1)) tracejado(x, y + 1, true);
      if (fora(0, 1)) tracejado(x, y + TILE - 3, true);
      if (fora(-1, 0)) tracejado(x + 1, y, false);
      if (fora(1, 0)) tracejado(x + TILE - 3, y, false);
    }),
  );
}

// ---------------------------------------------------------------- decoração de parede

function janela(p: Pena, m: Movel, rnd: () => number) {
  const x = m.col * TILE + 4;
  const y = m.lin * TILE + 6;
  const w = m.larg * TILE - 8;
  const h = 20;
  p.sombraR(x + 1, y + h, w, 3, 0.12);
  p.caixa(x, y, w, h, "#B8AFA0", 2);
  p.caixa(x + 1, y + 1, w - 2, h - 2, "#FFFDF8", 2);
  const vx = x + 3;
  const vy = y + 3;
  const vw = w - 6;
  const vh = h - 6;
  for (let i = 0; i < vh; i++) p.r(vx, vy + i, vw, 1, mix("#9ED2FF", "#E4F4FF", i / vh));
  // nuvens e sol
  const nx = vx + 4 + Math.floor(rnd() * (vw / 3));
  p.elipse(nx, vy + 5, 5, 2, "#FFFFFF");
  p.elipse(nx + 4, vy + 4, 4, 2, "#FFFFFF");
  p.elipse(vx + vw - 8, vy + 4, 3, 3, "#FFF0B8");
  // montanhas distantes
  for (let i = 0; i < vw; i++) p.v(vx + i, vy + vh - 3 - Math.round(2 * Math.sin(i / 4 + 1)), 3 + Math.round(2 * Math.sin(i / 4 + 1)), "#9DCBA0");
  // travessas
  const divs = m.larg * 2;
  for (let i = 1; i < divs; i++) p.v(x + Math.round((w * i) / divs), y + 1, h - 2, "#FFFDF8");
  p.h(x + 1, y + Math.floor(h / 2), w - 2, "#FFFDF8");
  p.h(x + 1, y + h - 2, w - 2, "#E1DACB");
  // soleira
  p.r(x - 2, y + h, w + 4, 2, "#FFFDF8");
  p.r(x - 2, y + h + 2, w + 4, 1, "#D5CCBB");
}

function quadro(p: Pena, m: Movel, rnd: () => number) {
  const x = m.col * TILE + (m.larg * TILE - (m.larg === 1 ? 20 : 44)) / 2;
  const y = m.lin * TILE + 7;
  const w = m.larg === 1 ? 20 : 44;
  const h = 17;
  p.sombraR(x + 1, y + 2, w, h, 0.12);
  p.caixa(x, y, w, h, "#6E4D33", 1);
  p.r(x + 1, y + 1, w - 2, h - 2, "#9B7448");
  p.r(x + 2, y + 2, w - 4, h - 4, "#FFF9EE");
  const fundo = m.variante === "b" ? "#F8D9CC" : "#D5E5F8";
  p.r(x + 3, y + 3, w - 6, h - 6, fundo);
  p.elipse(x + w * 0.3, y + 8, 4, 4, m.variante === "b" ? "#E98F86" : "#F5CB6E");
  p.r(x + w * 0.5, y + 6, w * 0.25, h - 9, m.variante === "b" ? "#82A2F0" : "#7DCFB2");
  p.elipse(x + w * 0.6, y + h - 3, 7, 3, m.variante === "b" ? "#7DCFB2" : "#F4A6C8");
  void rnd;
}

function relogio(p: Pena, m: Movel) {
  const cx = m.col * TILE + 16;
  const cy = m.lin * TILE + 15;
  p.elipse(cx + 1, cy + 2, 9, 9, "rgba(58,47,91,0.14)");
  p.elipse(cx, cy, 9, 9, "#6E4D33");
  p.elipse(cx, cy, 8, 8, "#FFFDF8");
  for (const [dx, dy] of [[0, -6], [6, 0], [0, 6], [-6, 0]] as const) p.r(cx + dx, cy + dy, 1, 1, "#5A4C72");
  p.v(cx, cy - 5, 5, "#3C3A52");
  p.h(cx, cy, 4, "#3C3A52");
  p.p(cx, cy, "#E98F86");
}

function lousa(p: Pena, m: Movel, rnd: () => number) {
  const x = m.col * TILE + 4;
  const y = m.lin * TILE + 6;
  const w = m.larg * TILE - 8;
  const h = 19;
  p.sombraR(x + 1, y + 2, w, h, 0.12);
  p.caixa(x, y, w, h, "#AAB3CC", 2);
  p.caixa(x + 1, y + 1, w - 2, h - 2, "#FFFFFF", 2);
  p.r(x + 2, y + 2, w - 4, 1, "#F1F3F9");
  // rabiscos
  const cs = ["#82A2F0", "#F08A7C", "#7DCFB2"];
  for (let i = 0; i < 4; i++) p.h(x + 5, y + 4 + i * 3, 10 + Math.floor(rnd() * (w - 40)), cs[i % 3]);
  // post-its
  const pcs = ["#F8E1A0", "#F4B8D0", "#BDE8D8"];
  for (let i = 0; i < 3; i++) {
    const px = x + w - 14 - i * 11;
    p.r(px, y + 4 + (i % 2) * 3, 8, 8, pcs[i]);
    p.h(px + 1, y + 6 + (i % 2) * 3, 5, escurecer(pcs[i], 0.25));
  }
  p.r(x + 4, y + h - 2, w - 8, 1, "#AAB3CC");
  p.r(x + w / 2 - 6, y + h - 1, 12, 2, "#8A92B0");
}

// ---------------------------------------------------------------- paredes

function paredeInterna(p: Pena, tema: Tema["parede"], mapa: readonly string[], W: number, H: number, rnd: () => number) {
  const cols = mapa[0].length;
  const lins = mapa.length;
  // sombra das paredes no chão (luz vem de cima à esquerda)
  for (let c = 1; c < cols - 1; c++) {
    if (mapa[0][c] === "#" || isPorta(mapa[0][c])) {
      for (let i = 0; i < 9; i++) p.r(c * TILE, TILE + i, TILE, 1, `rgba(58,47,91,${(0.2 * (9 - i)) / 9})`);
    }
  }
  for (let l = 1; l < lins - 1; l++) {
    if (mapa[l][0] === "#") for (let i = 0; i < 7; i++) p.r(TILE + i, l * TILE, 1, TILE, `rgba(58,47,91,${(0.17 * (7 - i)) / 7})`);
  }

  for (let l = 0; l < lins; l++) {
    for (let c = 0; c < cols; c++) {
      const ch = mapa[l][c];
      if (ch !== "#") continue;
      const x = c * TILE;
      const y = l * TILE;
      if (l === 0 && c > 0 && c < cols - 1) {
        // face frontal: tampo escuro, papel de parede e rodapé
        p.r(x, y, TILE, 5, tema.cap);
        p.r(x, y, TILE, 1, tema.capLuz);
        p.r(x, y + 5, TILE, 1, mix(tema.cap, "#000000", 0.15));
        p.r(x, y + 6, TILE, 20, tema.face);
        for (let i = 0; i < TILE; i += 8) p.r(x + i, y + 6, 4, 20, mix(tema.face, tema.faceSombra, 0.55)); // listras
        p.r(x, y + 6, TILE, 2, mix(tema.face, tema.faceSombra, 0.9)); // sombra sob o tampo
        p.r(x, y + 26, TILE, 6, tema.rodape);
        p.r(x, y + 26, TILE, 1, tema.rodapeLuz);
        p.r(x, y + 31, TILE, 1, mix(tema.rodape, "#3a2f5b", 0.3));
      } else if (l === lins - 1 && c > 0 && c < cols - 1) {
        // parede de baixo: só o tampo aparece
        p.r(x, y, TILE, TILE, tema.cap);
        p.r(x, y, TILE, 3, tema.capLuz);
        p.r(x, y + 3, TILE, 1, mix(tema.cap, "#000000", 0.12));
        for (let i = 0; i < 6; i++) p.r(x + Math.floor(rnd() * TILE), y + 8 + Math.floor(rnd() * 20), 2, 1, mix(tema.cap, "#ffffff", 0.08));
      } else {
        // lateral/canto: só o tampo; a face voltada para dentro ganha um filete de luz
        p.r(x, y, TILE, TILE, tema.cap);
        if (c === 0 && l > 0 && l < lins - 1) {
          p.r(x + TILE - 3, y, 3, TILE, tema.capLuz);
          p.r(x + TILE - 4, y, 1, TILE, mix(tema.cap, "#000000", 0.12));
        } else if (c === cols - 1 && l > 0 && l < lins - 1) {
          p.r(x, y, 3, TILE, tema.capLuz);
          p.r(x + 3, y, 1, TILE, mix(tema.cap, "#000000", 0.12));
        } else if (l === 0) {
          p.r(x, y, TILE, 2, tema.capLuz);
        }
        for (let i = 0; i < 5; i++) p.r(x + 4 + Math.floor(rnd() * 22), y + Math.floor(rnd() * TILE), 2, 1, mix(tema.cap, "#ffffff", 0.08));
      }
    }
  }
  void W;
  void H;
}

function sebe(p: Pena, tema: Tema["parede"], mapa: readonly string[], rnd: () => number) {
  const cols = mapa[0].length;
  const lins = mapa.length;
  const moita = (x: number, y: number, w: number, h: number) => {
    p.r(x, y, w, h, tema.face);
    for (let i = 0; i < (w * h) / 10; i++) {
      const px = x + Math.floor(rnd() * w);
      const py = y + Math.floor(rnd() * h);
      const c = [tema.capLuz, tema.faceSombra, tema.cap, tema.face][Math.floor(rnd() * 4)];
      p.r(px, py, 2 + Math.floor(rnd() * 2), 2, c);
    }
  };
  for (let l = 0; l < lins; l++) {
    for (let c = 0; c < cols; c++) {
      if (mapa[l][c] !== "#") continue;
      const x = c * TILE;
      const y = l * TILE;
      if (l === 0 && c > 0 && c < cols - 1) {
        moita(x, y, TILE, TILE);
        p.r(x, y, TILE, 6, tema.cap);
        for (let i = 0; i < 8; i++) p.r(x + Math.floor(rnd() * TILE), y + 4 + Math.floor(rnd() * 3), 2, 2, tema.capLuz);
        p.r(x, y + 26, TILE, 6, tema.rodape);
        for (let i = 0; i < 6; i++) p.r(x + Math.floor(rnd() * TILE), y + 26 + Math.floor(rnd() * 4), 3, 2, tema.faceSombra);
      } else {
        moita(x, y, TILE, TILE);
        p.r(x, y, TILE, 4, tema.capLuz);
        for (let i = 0; i < 8; i++) p.r(x + Math.floor(rnd() * TILE), y + Math.floor(rnd() * TILE), 3, 2, tema.cap);
        if (c === 0) p.r(x + TILE - 3, y, 3, TILE, tema.rodape);
        else if (c === cols - 1) p.r(x, y, 3, TILE, tema.rodape);
        else if (l === lins - 1) p.r(x, y, TILE, 3, tema.rodape);
      }
    }
  }
  // sombra da sebe sobre o gramado
  for (let c = 1; c < cols - 1; c++) if (mapa[0][c] === "#") p.r(c * TILE, TILE, TILE, 4, "rgba(58,100,58,0.25)");
}

// ---------------------------------------------------------------- portas

function portaVisual(p: Pena, tema: Tema, template: Template, col: number, lin: number, lado: Lado, rnd: () => number) {
  const x = col * TILE;
  const y = lin * TILE;
  const externo = tema.clima === "externo";
  const luzQuente = (i: number, n: number) => mix("#FFF4D6", "#F8D79A", i / n);
  if (lado === "baixo") {
    // porta aberta na face da parede de cima
    p.r(x, y, TILE, TILE, tema.parede.cap);
    p.r(x + 3, y + 5, TILE - 6, TILE - 5, "#2E2946");
    for (let i = 0; i < TILE - 5; i++) p.r(x + 3, y + 5 + i, TILE - 6, 1, mix("#2E2946", "#6D6690", i / (TILE - 5)));
    p.r(x + 3, y + 5, TILE - 6, 2, "#1F1B33");
    // batentes claros
    p.r(x + 1, y + 4, 3, TILE - 4, "#FAF5EA");
    p.r(x + TILE - 4, y + 4, 3, TILE - 4, "#FAF5EA");
    p.r(x + 3, y + 4, 1, TILE - 4, "#D9CFBE");
    p.r(x + TILE - 4, y + 4, 1, TILE - 4, "#D9CFBE");
    p.r(x, y, TILE, 5, tema.parede.cap);
    p.r(x, y, TILE, 1, tema.parede.capLuz);
    p.r(x, y + 4, TILE, 2, "#FAF5EA");
    p.r(x + 4, y + TILE - 3, TILE - 8, 3, luzQuente(1, 1)); // luz no chão da passagem
    p.r(x + 4, y + TILE - 4, TILE - 8, 1, "#FFE9B8");
  } else if (lado === "cima") {
    // gap na parede de baixo: luz entrando
    p.r(x, y, TILE, TILE, tema.parede.cap);
    for (let i = 0; i < TILE; i++) p.r(x + 4, y + i, TILE - 8, 1, mix("#F9E5B9", "#FFF8E6", i / TILE));
    p.r(x + 4, y, TILE - 8, 3, "rgba(58,47,91,0.22)");
    p.r(x + 4, y, 1, TILE, "#D9CFBE");
    p.r(x + TILE - 5, y, 1, TILE, "#D9CFBE");
    p.r(x, y, 5, TILE, tema.parede.cap);
    p.r(x + TILE - 5, y, 5, TILE, tema.parede.cap);
    p.r(x + 3, y, 2, TILE, tema.parede.capLuz);
    p.r(x + TILE - 5, y, 2, TILE, tema.parede.capLuz);
    // degrau
    p.r(x + 5, y + TILE - 6, TILE - 10, 6, "#E3D3B5");
    p.r(x + 5, y + TILE - 6, TILE - 10, 1, "#F4E9D1");
  } else {
    // parede lateral: vão com soleira e batentes
    const dir = lado === "esquerda"; // porta na parede direita; entra-se pela esquerda
    p.r(x, y, TILE, TILE, externo ? "#A5D67C" : tema.parede.cap);
    if (externo) {
      // portão na sebe
      for (let i = 0; i < TILE; i++) p.r(x + i, y, 1, TILE, mix("#D6EEB8", "#A5D67C", i / TILE));
      for (let i = 0; i < 6; i++) p.r(x + Math.floor(rnd() * TILE), y + 6 + Math.floor(rnd() * 20), 2, 2, "#8CC166");
      // dois mourões de madeira marcam o portão
      for (const py of [y - 2, y + TILE - 8]) {
        p.sombraR(x + 7, py + 7, 18, 3, 0.2);
        p.caixa(x + 8, py, 16, 10, "#6E4D33", 2);
        p.caixa(x + 9, py + 1, 14, 8, "#A47A4C", 2);
        p.r(x + 10, py + 1, 12, 2, "#C99C68");
        p.r(x + 9, py + 6, 14, 1, "#8A6343");
      }
    } else {
      const ax = dir ? x : x;
      for (let i = 0; i < TILE; i++) p.r(ax + i, y + 5, 1, TILE - 10, mix(dir ? "#FFF8E6" : "#F9E5B9", dir ? "#F9E5B9" : "#FFF8E6", i / TILE));
      p.r(x, y + 5, TILE, 2, "rgba(58,47,91,0.2)");
      for (const py of [y, y + TILE - 6]) {
        p.r(x, py, TILE, 6, tema.parede.cap);
        p.r(x, py + (py === y ? 4 : 0), TILE, 2, "#FAF5EA");
      }
      // soleira
      p.r(dir ? x : x + TILE - 6, y + 7, 6, TILE - 14, "#E3D3B5");
    }
  }
  void template;
}

function capacho(p: Pena, col: number, lin: number, lado: Lado, tema: Tema) {
  // tapete no tile de chão à frente da porta (onde o Avatar chega)
  const cx = col * TILE + 16;
  const cy = lin * TILE + 16;
  const [dx, dy] = lado === "baixo" ? [0, TILE] : lado === "cima" ? [0, -TILE] : lado === "direita" ? [TILE, 0] : [-TILE, 0];
  const horiz = lado === "baixo" || lado === "cima";
  const w = horiz ? 26 : 16;
  const h = horiz ? 14 : 26;
  const x = cx + dx - w / 2;
  const y = cy + dy - h / 2;
  const base = tema.clima === "externo" ? "#C9A070" : "#D9A98B";
  p.caixa(x, y, w, h, escurecer(base, 0.25), 2);
  p.caixa(x + 1, y + 1, w - 2, h - 2, base, 2);
  for (let i = 3; i < (horiz ? w - 3 : h - 3); i += 3) {
    if (horiz) p.v(x + i, y + 3, h - 6, clarear(base, 0.25));
    else p.h(x + 3, y + i, w - 6, clarear(base, 0.25));
  }
}

// ---------------------------------------------------------------- API

/** Desenha o chão, as paredes, os tapetes, a decoração de parede e as portas do Lugar (canvas 1x). */
export function desenharMapa(template: Template): HTMLCanvasElement {
  const t = TEMPLATES_LUGAR[template];
  const tema = TEMAS[template];
  const mapa = t.mapa;
  const lins = mapa.length;
  const cols = mapa[0].length;
  const W = cols * TILE;
  const H = lins * TILE;
  const [canvas, p] = criarCanvas(W, H);
  const rnd = aleatorio(hashTexto(template));

  if (template === "sala") pisoMadeira(p, W, H, rnd);
  else if (template === "escritorio") pisoAzulejo(p, W, H, rnd);
  else pisoGrama(p, W, H, rnd);

  for (const m of t.moveis) {
    const r = aleatorio(hashTexto(`${m.tipo}${m.col},${m.lin}`));
    if (m.tipo === "deck") deck(p, m, r);
    else if (m.tipo === "caminho") caminho(p, m, r);
  }
  for (const m of t.moveis) {
    const r = aleatorio(hashTexto(`${m.tipo}${m.col},${m.lin}`));
    if (m.tipo === "tapete") tapete(p, m, r);
  }

  bordaZonas(p, mapa);

  if (tema.clima === "externo") sebe(p, tema.parede, mapa, rnd);
  else paredeInterna(p, tema.parede, mapa, W, H, rnd);

  for (const m of t.moveis) {
    if (!TIPOS_PAREDE.has(m.tipo)) continue;
    const r = aleatorio(hashTexto(`${m.tipo}${m.col},${m.lin}`));
    if (m.tipo === "janela") janela(p, m, r);
    else if (m.tipo === "quadro") quadro(p, m, r);
    else if (m.tipo === "relogio") relogio(p, m);
    else if (m.tipo === "lousa") lousa(p, m, r);
  }

  for (const porta of portasDoMapa(template, () => "")) {
    if (tema.clima === "interno") capacho(p, porta.col, porta.lin, porta.lado, tema);
    portaVisual(p, tema, template, porta.col, porta.lin, porta.lado, rnd);
  }
  return canvas;
}

const objetosCache = new Map<Template, ObjetoMapa[]>();

/** Sprites ordenáveis por profundidade: cada Móvel com desenho próprio (e as luzinhas). */
export function objetosDoMapa(template: Template): ObjetoMapa[] {
  const guardado = objetosCache.get(template);
  if (guardado) return guardado;
  const saida: ObjetoMapa[] = [];
  for (const m of TEMPLATES_LUGAR[template].moveis) {
    if (m.tipo === "luzinhas") {
      saida.push(luzinhas(template, m));
      continue;
    }
    const s = desenharMovel(m);
    if (!s) continue;
    saida.push({
      chave: `mov:${template}:${m.tipo}:${m.col},${m.lin}`,
      canvas: s.canvas,
      x: m.col * TILE + s.dx,
      y: m.lin * TILE + s.dy,
      depth: (m.lin + m.alt) * TILE + s.prof,
    });
  }
  objetosCache.set(template, saida);
  return saida;
}

/** Fio de luzinhas pendurado entre dois pontos (fica sempre acima dos Avatares). */
function luzinhas(template: Template, m: Movel): ObjetoMapa {
  const L = m.larg * TILE;
  const sag = 14;
  const [canvas, p] = criarCanvas(L + 16, sag + 28);
  const y0 = 6;
  const yDe = (x: number) => y0 + Math.round(sag * (1 - Math.pow((2 * x) / L - 1, 2)));
  for (let x = 0; x <= L; x++) p.r(x + 8, yDe(x), 1, 1, "rgba(91,75,110,0.85)");
  const cores = ["#FFE08A", "#FFB3A0", "#FFF3C4", "#B8E4FF", "#F8BFE0"];
  let i = 0;
  for (let x = 10; x < L; x += 18) {
    const y = yDe(x) + 1;
    p.elipse(x + 8, y + 4, 6, 6, `${cores[i % cores.length]}30`);
    p.elipse(x + 8, y + 4, 3, 3, `${cores[i % cores.length]}66`);
    p.r(x + 7, y + 1, 3, 4, cores[i % cores.length]);
    p.p(x + 7, y + 1, "#ffffff");
    i++;
  }
  return { chave: `mov:${template}:luzinhas:${m.col},${m.lin}`, canvas, x: m.col * TILE - 8, y: m.lin * TILE - y0 + 4, depth: 900000 };
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

