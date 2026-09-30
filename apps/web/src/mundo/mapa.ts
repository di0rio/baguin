import { TEMPLATES_LUGAR, TILE, type Template } from "@baguin/shared";

type Tema = {
  chao: [string, string];
  tabua: string;
  parede: string;
  topo: string;
  brilho: string;
  moveis: string[];
  zona: { comum: [string, string]; reuniao: [string, string] };
};

// Paleta aconchegante: madeira quente na sala, carpete azulado no escritório, grama no terraço.
const TEMAS: Record<Template, Tema> = {
  sala: {
    chao: ["#8d6c53", "#86664e"],
    tabua: "#7f6049",
    parede: "#5b4a73",
    topo: "#362b49",
    brilho: "#7a679a",
    moveis: ["#c98a5a", "#b8566b", "#5a8db0", "#8f6bb0"],
    zona: { comum: ["rgba(255,209,102,0.20)", "rgba(255,209,102,0.70)"], reuniao: ["rgba(107,227,200,0.20)", "rgba(107,227,200,0.70)"] },
  },
  escritorio: {
    chao: ["#5f6c82", "#5a677d"],
    tabua: "#56627a",
    parede: "#414c66",
    topo: "#252d44",
    brilho: "#61708f",
    moveis: ["#b99468", "#a8734f", "#7c8fa8", "#8f6bb0"],
    zona: { comum: ["rgba(255,209,102,0.20)", "rgba(255,209,102,0.70)"], reuniao: ["rgba(107,227,160,0.22)", "rgba(107,227,160,0.75)"] },
  },
  terraco: {
    chao: ["#6f9059", "#6a8b55"],
    tabua: "#5f814d",
    parede: "#4a7043",
    topo: "#2c4a2e",
    brilho: "#6a9a5a",
    moveis: ["#a9805a", "#c98a5a", "#7a5a3c", "#b8566b"],
    zona: { comum: ["rgba(255,209,102,0.22)", "rgba(255,209,102,0.75)"], reuniao: ["rgba(107,227,200,0.2)", "rgba(107,227,200,0.7)"] },
  },
};

export type PortaMapa = { col: number; lin: number; texto: string; lado: "cima" | "baixo" | "esquerda" | "direita" };

const isPorta = (c: string | undefined) => c !== undefined && c >= "1" && c <= "9";
const isZona = (c: string | undefined) => c !== undefined && c >= "a" && c <= "z";

/** Desenha o Lugar inteiro num canvas 1x (colunas × TILE por linhas × TILE). */
export function desenharMapa(template: Template): HTMLCanvasElement {
  const t = TEMPLATES_LUGAR[template];
  const tema = TEMAS[template];
  const mapa = t.mapa;
  const lins = mapa.length;
  const cols = mapa[0].length;
  const canvas = document.createElement("canvas");
  canvas.width = cols * TILE;
  canvas.height = lins * TILE;
  const ctx = canvas.getContext("2d")!;
  const ch = (col: number, lin: number) => mapa[lin]?.[col];
  const px = (col: number, lin: number) => [col * TILE, lin * TILE] as const;
  const rect = (cor: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = cor;
    ctx.fillRect(x, y, w, h);
  };

  // chão: tábuas horizontais com juntas alternadas (grama pontilhada no terraço)
  for (let lin = 0; lin < lins; lin++) {
    for (let col = 0; col < cols; col++) {
      const [x, y] = px(col, lin);
      if (template === "terraco") {
        rect(tema.chao[(col + lin) % 2], x, y, TILE, TILE);
        const s = (col * 73 + lin * 151) % 7;
        rect(tema.tabua, x + 4 + s * 3, y + 6 + ((s * 5) % 20), 2, 2);
        rect(tema.tabua, x + 20 - s, y + 22 - ((s * 3) % 12), 2, 2);
        continue;
      }
      for (let r = 0; r < 4; r++) {
        const tabua = lin * 4 + r;
        rect(tema.chao[tabua % 2], x, y + r * 8, TILE, 8);
        rect(tema.tabua, x, y + r * 8 + 7, TILE, 1);
        rect(tema.tabua, x + ((tabua * 13) % TILE), y + r * 8, 1, 7);
      }
    }
  }

  // Zonas: piso tingido + borda nas bordas externas
  for (let lin = 0; lin < lins; lin++) {
    for (let col = 0; col < cols; col++) {
      const c = ch(col, lin);
      if (!isZona(c)) continue;
      const [preench, borda] = tema.zona[t.zonas[c!]?.tipo ?? "comum"];
      const [x, y] = px(col, lin);
      rect(preench, x, y, TILE, TILE);
      const fora = (dc: number, dl: number) => {
        const n = ch(col + dc, lin + dl);
        return n !== c && n !== "M";
      };
      if (fora(0, -1)) rect(borda, x, y, TILE, 2);
      if (fora(0, 1)) rect(borda, x, y + TILE - 2, TILE, 2);
      if (fora(-1, 0)) rect(borda, x, y, 2, TILE);
      if (fora(1, 0)) rect(borda, x + TILE - 2, y, 2, TILE);
    }
  }

  // sombras projetadas no chão (abaixo de paredes e móveis)
  for (let lin = 0; lin < lins; lin++) {
    for (let col = 0; col < cols; col++) {
      const c = ch(col, lin);
      const abaixo = ch(col, lin + 1);
      if ((c === "#" || c === "M") && abaixo !== "#" && abaixo !== "M" && abaixo !== undefined) {
        const [x, y] = px(col, lin + 1);
        rect("rgba(0,0,0,0.22)", x, y, TILE, c === "#" ? 8 : 6);
      }
    }
  }

  // paredes
  for (let lin = 0; lin < lins; lin++) {
    for (let col = 0; col < cols; col++) {
      if (ch(col, lin) !== "#") continue;
      const [x, y] = px(col, lin);
      rect(tema.parede, x, y, TILE, TILE);
      rect(tema.topo, x, y + 15, TILE, 1); // junta
      if (ch(col, lin - 1) !== "#") {
        rect(tema.topo, x, y, TILE, 10); // aresta superior mais escura: dá profundidade
        rect(tema.brilho, x, y + 10, TILE, 2);
      }
    }
  }

  // móveis: um componente conexo = uma peça (cor própria, contorno só nas bordas externas)
  const comp = new Map<string, number>();
  let nComp = 0;
  for (let lin = 0; lin < lins; lin++) {
    for (let col = 0; col < cols; col++) {
      if (ch(col, lin) !== "M" || comp.has(`${col},${lin}`)) continue;
      const pilha = [[col, lin]];
      comp.set(`${col},${lin}`, nComp);
      while (pilha.length) {
        const [c0, l0] = pilha.pop()!;
        for (const [dc, dl] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${c0 + dc},${l0 + dl}`;
          if (ch(c0 + dc, l0 + dl) === "M" && !comp.has(k)) {
            comp.set(k, nComp);
            pilha.push([c0 + dc, l0 + dl]);
          }
        }
      }
      nComp++;
    }
  }
  for (let lin = 0; lin < lins; lin++) {
    for (let col = 0; col < cols; col++) {
      if (ch(col, lin) !== "M") continue;
      const [x, y] = px(col, lin);
      const cor = tema.moveis[(comp.get(`${col},${lin}`) ?? 0) % tema.moveis.length];
      const livre = (dc: number, dl: number) => ch(col + dc, lin + dl) !== "M";
      rect(cor, x, y, TILE, TILE);
      if (livre(0, -1)) rect("rgba(255,255,255,0.28)", x, y, TILE, 6); // tampo iluminado
      if (livre(0, 1)) rect("rgba(0,0,0,0.30)", x, y + TILE - 8, TILE, 8); // frente na sombra
      const cont = "rgba(30,18,12,0.85)";
      if (livre(0, -1)) rect(cont, x, y, TILE, 2);
      if (livre(0, 1)) rect(cont, x, y + TILE - 2, TILE, 2);
      if (livre(-1, 0)) rect(cont, x, y, 2, TILE);
      if (livre(1, 0)) rect(cont, x + TILE - 2, y, 2, TILE);
    }
  }

  // portas
  for (let lin = 0; lin < lins; lin++) {
    for (let col = 0; col < cols; col++) {
      if (!isPorta(ch(col, lin))) continue;
      const [x, y] = px(col, lin);
      rect("#2a1c14", x, y, TILE, TILE);
      rect("#b07a4a", x + 3, y + 3, TILE - 6, TILE - 6);
      rect("#c58f5a", x + 3, y + 3, TILE - 6, 3);
      rect("rgba(0,0,0,0.25)", x + TILE / 2 - 1, y + 3, 2, TILE - 6);
      rect("#ffd166", x + TILE / 2 + 4, y + TILE / 2, 3, 3);
    }
  }
  return canvas;
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
