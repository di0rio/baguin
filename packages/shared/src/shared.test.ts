import { describe, expect, it } from "vitest";
import {
  TEMPLATES,
  TEMPLATES_LUGAR,
  TILE,
  TIPOS_PAREDE,
  alcancePx,
  bloqueado,
  centroTile,
  chaveBloqueio,
  movelSolido,
  pecasSchema,
  PECAS_PADRAO,
  podemSeOuvir,
  portaEm,
  volume,
  zonaEm,
  type ContextoLugar,
  type Ouvinte,
} from "./index.js";

const o = (contaId: string, col: number, lin: number, naoPerturbe = false): Ouvinte => ({
  contaId,
  ...centroTile(col, lin),
  naoPerturbe,
});
const nenhum = new Set<string>();

describe("integridade dos mapas", () => {
  for (const t of TEMPLATES) {
    const { mapa, portas, zonas, spawn } = TEMPLATES_LUGAR[t];

    it(`${t}: retangular e fechado por paredes (portas contam na borda)`, () => {
      const larg = mapa[0].length;
      for (const linha of mapa) expect(linha.length).toBe(larg);
      mapa.forEach((linha, lin) =>
        [...linha].forEach((c, col) => {
          const borda = lin === 0 || col === 0 || lin === mapa.length - 1 || col === larg - 1;
          if (borda) expect("#123456789").toContain(c);
        }),
      );
    });

    it(`${t}: só usa caracteres, portas e zonas declaradas`, () => {
      const usados = new Set(mapa.join(""));
      for (const c of usados) {
        if ("#M.".includes(c)) continue;
        if (c >= "1" && c <= "9") expect(portas[c], `porta ${c}`).toBeDefined();
        else expect(zonas[c], `zona ${c}`).toBeDefined();
      }
      for (const d of Object.keys(portas)) expect(usados.has(d)).toBe(true);
      for (const z of Object.keys(zonas)) expect(usados.has(z)).toBe(true);
    });

    it(`${t}: spawn livre e todos os pontos livres alcançáveis`, () => {
      const { x, y } = centroTile(spawn.col, spawn.lin);
      expect(bloqueado(t, x, y)).toBe(false);
      const visto = new Set([`${spawn.col},${spawn.lin}`]);
      const fila = [[spawn.col, spawn.lin]];
      while (fila.length) {
        const [c, l] = fila.pop()!;
        for (const [dc, dl] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = `${c + dc},${l + dl}`;
          const ch = mapa[l + dl]?.[c + dc];
          if (ch && ch !== "#" && ch !== "M" && !visto.has(k)) {
            visto.add(k);
            fila.push([c + dc, l + dl]);
          }
        }
      }
      mapa.forEach((linha, lin) =>
        [...linha].forEach((ch, col) => {
          if (ch !== "#" && ch !== "M") expect(visto.has(`${col},${lin}`), `${t} ${col},${lin}`).toBe(true);
        }),
      );
    });

    for (const [digito, porta] of Object.entries(portas)) {
      it(`${t}: porta ${digito} -> ${porta.destino} chega em chão livre ao lado da porta de volta`, () => {
        const destino = TEMPLATES_LUGAR[porta.destino];
        const { col, lin } = porta.chegada;
        const c = destino.mapa[lin]?.[col];
        expect(c).toBeDefined();
        expect(c).not.toBe("#");
        expect(c).not.toBe("M");
        expect(c! >= "1" && c! <= "9").toBe(false);
        const { x, y } = centroTile(col, lin);
        expect(bloqueado(porta.destino, x, y)).toBe(false);
        // vizinho ortogonal com uma porta do destino que volta para este template
        const vizinhos = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dl]) => destino.mapa[lin + dl]?.[col + dc]);
        const voltam = vizinhos.filter((v) => v && destino.portas[v]?.destino === t);
        expect(voltam.length).toBeGreaterThan(0);
      });
    }
  }
});

describe("Móveis", () => {
  for (const t of TEMPLATES) {
    const { mapa, moveis } = TEMPLATES_LUGAR[t];
    const lins = mapa.length;
    const cols = mapa[0].length;

    it(`${t}: os 'M' do mapa são exatamente as pegadas dos Móveis sólidos`, () => {
      const esperado = new Set<string>();
      for (const m of moveis.filter(movelSolido))
        for (let l = m.lin; l < m.lin + m.alt; l++) for (let c = m.col; c < m.col + m.larg; c++) esperado.add(`${c},${l}`);
      const real = new Set<string>();
      mapa.forEach((linha, l) => [...linha].forEach((ch, c) => ch === "M" && real.add(`${c},${l}`)));
      expect([...real].sort()).toEqual([...esperado].sort());
    });

    it(`${t}: Móveis sólidos não se sobrepõem e ficam dentro do chão`, () => {
      const ocupado = new Set<string>();
      for (const m of moveis.filter(movelSolido)) {
        for (let l = m.lin; l < m.lin + m.alt; l++)
          for (let c = m.col; c < m.col + m.larg; c++) {
            const k = `${c},${l}`;
            expect(ocupado.has(k), `${m.tipo} sobrepõe em ${k}`).toBe(false);
            ocupado.add(k);
            expect(c > 0 && l > 0 && c < cols - 1 && l < lins - 1, `${m.tipo} fora do chão em ${k}`).toBe(true);
          }
      }
    });

    it(`${t}: decoração de parede fica sobre parede; o resto, sobre chão`, () => {
      for (const m of moveis.filter((x) => !movelSolido(x))) {
        if (m.tipo === "luzinhas") continue;
        for (let c = m.col; c < m.col + m.larg; c++)
          for (let l = m.lin; l < m.lin + m.alt; l++) {
            const ch = mapa[l][c];
            if (TIPOS_PAREDE.has(m.tipo)) expect(ch, `${m.tipo} em ${c},${l}`).toBe("#");
            else expect(ch !== "#" && !(ch >= "1" && ch <= "9"), `${m.tipo} em ${c},${l}`).toBe(true);
          }
      }
    });

    it(`${t}: nenhum Móvel sólido cobre a chegada, o spawn ou a frente de uma porta`, () => {
      const { spawn } = TEMPLATES_LUGAR[t];
      expect(mapa[spawn.lin][spawn.col]).not.toBe("M");
      for (const p of Object.values(TEMPLATES_LUGAR)) {
        for (const porta of Object.values(p.portas))
          if (porta.destino === t) expect(mapa[porta.chegada.lin][porta.chegada.col]).not.toBe("M");
      }
    });
  }
});

describe("bloqueio e portas", () => {
  it("paredes e Móveis bloqueiam; chão e porta não; fora do mapa bloqueia", () => {
    expect(bloqueado("sala", 0.5 * TILE, 0.5 * TILE)).toBe(true);
    expect(bloqueado("sala", 3.5 * TILE, 1.5 * TILE)).toBe(true);
    expect(bloqueado("sala", 10.5 * TILE, 10.5 * TILE)).toBe(false);
    const p = centroTile(14, 0);
    expect(bloqueado("sala", p.x, p.y)).toBe(false);
    expect(bloqueado("sala", -5, -5)).toBe(true);
    expect(bloqueado("sala", 9999, 9999)).toBe(true);
  });

  it("caixa de colisão pega tile vizinho", () => {
    // encostado na parede esquerda: centro no tile 1 mas caixa invade o tile 0
    expect(bloqueado("sala", TILE + 5, 6.5 * TILE)).toBe(true);
    expect(bloqueado("sala", TILE + 11, 6.5 * TILE)).toBe(false);
  });

  it("portaEm acha a porta e o destino", () => {
    const { x, y } = centroTile(14, 0);
    expect(portaEm("sala", x, y)).toMatchObject({ digito: "1", destino: "escritorio" });
    expect(portaEm("sala", 10.5 * TILE, 10.5 * TILE)).toBeNull();
  });
});

describe("conversa", () => {
  const foco: ContextoLugar = { template: "escritorio", ambiente: "foco" };
  const resenha: ContextoLugar = { template: "terraco", ambiente: "resenha" };

  it("alcance: foco 3 tiles, resenha 7 tiles", () => {
    expect(alcancePx("foco")).toBe(3 * TILE);
    expect(alcancePx("resenha")).toBe(7 * TILE);
  });

  it("dentro/fora do Alcance", () => {
    expect(podemSeOuvir(o("a", 5, 10), o("b", 8, 10), foco, nenhum)).toBe(true);
    expect(podemSeOuvir(o("a", 5, 10), o("b", 9, 10), foco, nenhum)).toBe(false);
    expect(podemSeOuvir(o("a", 5, 10), o("b", 12, 10), resenha, nenhum)).toBe(true);
    expect(podemSeOuvir(o("a", 5, 10), o("b", 13, 10), resenha, nenhum)).toBe(false);
  });

  it("simetria em várias configurações", () => {
    const pontos = [[3, 3], [4, 4], [4, 3], [13, 3], [14, 3], [22, 3], [10, 10], [11, 10], [20, 15]];
    const bloq = new Set([chaveBloqueio("c", "d")]);
    for (const ctx of [foco, resenha]) {
      for (const [c1, l1] of pontos)
        for (const [c2, l2] of pontos)
          for (const np of [false, true])
            for (const [i, j] of [["a", "b"], ["c", "d"]]) {
              const a = o(i, c1, l1, np);
              const b = o(j, c2, l2);
              expect(podemSeOuvir(a, b, ctx, bloq)).toBe(podemSeOuvir(b, a, ctx, bloq));
            }
    }
  });

  it("Zona isola de fora e de outras Zonas, mesmo colado", () => {
    // mesa 1 (zona a) e mesa 2 (zona b) no escritório, tile (3,2) é 'a'
    expect(zonaEm("escritorio", 3.5 * TILE, 2.5 * TILE)).toBe("a");
    expect(zonaEm("escritorio", 12.5 * TILE, 2.5 * TILE)).toBe("b");
    expect(zonaEm("escritorio", 10.5 * TILE, 2.5 * TILE)).toBeNull();
    const dentro1 = o("a", 3, 2);
    const dentro2 = o("b", 8, 5);
    const fora = o("c", 2, 2); // colado, fora da zona
    const outraZona = o("d", 12, 2);
    expect(podemSeOuvir(dentro1, dentro2, foco, nenhum)).toBe(true); // mesma zona, mesmo além do alcance de tile
    expect(podemSeOuvir(dentro1, fora, foco, nenhum)).toBe(false);
    expect(podemSeOuvir(fora, dentro1, foco, nenhum)).toBe(false);
    expect(podemSeOuvir(dentro1, outraZona, foco, nenhum)).toBe(false);
  });

  it("NaoPerturbe corta nos dois sentidos", () => {
    const a = o("a", 5, 10, true);
    const b = o("b", 6, 10);
    expect(podemSeOuvir(a, b, foco, nenhum)).toBe(false);
    expect(podemSeOuvir(b, a, foco, nenhum)).toBe(false);
  });

  it("Bloqueio corta em qualquer direção", () => {
    const bloq = new Set([chaveBloqueio("b", "a")]);
    expect(podemSeOuvir(o("a", 5, 10), o("b", 6, 10), foco, bloq)).toBe(false);
    expect(podemSeOuvir(o("b", 6, 10), o("a", 5, 10), foco, bloq)).toBe(false);
    expect(podemSeOuvir(o("a", 5, 10), o("c", 6, 10), foco, bloq)).toBe(true);
  });

  it("volume: cheio na Zona, decai com a distância, limitado", () => {
    expect(volume(o("a", 3, 2), o("b", 8, 5), foco)).toBe(1);
    expect(volume(o("a", 5, 10), o("b", 5, 10), foco)).toBe(1);
    expect(volume(o("a", 5, 10), o("b", 6, 10), foco)).toBeCloseTo(1 - 1 / 3);
    expect(volume(o("a", 5, 10), o("b", 20, 10), foco)).toBe(0);
  });
});

describe("Pecas", () => {
  it("aceita o padrão e rejeita fora do catálogo", () => {
    expect(pecasSchema.safeParse(PECAS_PADRAO).success).toBe(true);
    expect(pecasSchema.safeParse({ ...PECAS_PADRAO, pele: 6 }).success).toBe(false);
    expect(pecasSchema.safeParse({ ...PECAS_PADRAO, acessorio: "coroa" }).success).toBe(false);
    expect(pecasSchema.safeParse({ ...PECAS_PADRAO, cabelo: { estilo: "curto", cor: 8 } }).success).toBe(false);
    expect(pecasSchema.safeParse({ pele: 1 }).success).toBe(false);
  });
});
