import { TEMPLATES, TEMPLATES_LUGAR, TILE } from "@baguin/shared";
import { describe, expect, it } from "vitest";
import { portasDoMapa, resolucaoMundo, segmentosDaZona, zonasDoMapa } from "./mapa";

describe("portasDoMapa", () => {
  it("diz por qual lado se entra em cada porta", () => {
    const nome = (t: string) => t;
    expect(portasDoMapa("sala", nome).map((p) => [p.col, p.lin, p.lado, p.texto])).toEqual([
      [14, 0, "baixo", "escritorio"],
      [29, 10, "esquerda", "terraco"],
    ]);
    expect(portasDoMapa("escritorio", nome).map((p) => p.lado)).toEqual(["cima"]);
    expect(portasDoMapa("terraco", nome).map((p) => p.lado)).toEqual(["direita"]);
  });
});

describe("zonasDoMapa", () => {
  for (const t of TEMPLATES) {
    it(`${t}: uma entrada por Zona declarada, com o retângulo das letras do mapa`, () => {
      const modelo = TEMPLATES_LUGAR[t];
      const zonas = zonasDoMapa(t);
      expect(zonas.map((z) => z.letra).sort()).toEqual(Object.keys(modelo.zonas).sort());
      for (const z of zonas) {
        expect(z.nome).toBe(modelo.zonas[z.letra].nome);
        expect(z.col1).toBeGreaterThanOrEqual(z.col0);
        expect(z.lin1).toBeGreaterThanOrEqual(z.lin0);
        // os cantos do retângulo têm a letra da Zona ou um Móvel dentro dela
        for (const [c, l] of [[z.col0, z.lin0], [z.col1, z.lin1]]) expect("M" + z.letra).toContain(modelo.mapa[l][c]);
      }
    });
  }
});

describe("segmentosDaZona", () => {
  it("retângulo: um segmento por lado, recuado para dentro do tile", () => {
    const mapa = ["#####", "#aaa#", "#aaa#", "#####"];
    expect(segmentosDaZona(mapa, "a")).toEqual([
      [34, 34, 126, 34], // cima
      [34, 94, 126, 94], // baixo
      [34, 34, 34, 94], // esquerda
      [126, 34, 126, 94], // direita
    ]);
  });

  it("Móvel dentro da Zona conta como parte dela: não ganha contorno em volta", () => {
    const mapa = ["#####", "#aMa#", "#aaa#", "#####"];
    const segs = segmentosDaZona(mapa, "a");
    // nenhuma borda desenhada entre a Zona e o Móvel (x = 2 tiles +- recuo, dentro do Móvel)
    expect(segs.some(([x0, y0, x1, y1]) => x0 === x1 && x0 > 2 * TILE - 3 && x0 < 3 * TILE + 3 && y1 > y0 && y0 < 2 * TILE && y1 <= 2 * TILE)).toBe(false);
  });

  for (const t of TEMPLATES) {
    it(`${t}: todo segmento fica dentro do retângulo da própria Zona`, () => {
      for (const z of zonasDoMapa(t)) {
        const segs = segmentosDaZona(TEMPLATES_LUGAR[t].mapa, z.letra);
        expect(segs.length).toBeGreaterThanOrEqual(4);
        for (const [x0, y0, x1, y1] of segs) {
          for (const x of [x0, x1]) expect(x).toBeGreaterThanOrEqual(z.col0 * TILE);
          for (const x of [x0, x1]) expect(x).toBeLessThanOrEqual((z.col1 + 1) * TILE);
          for (const y of [y0, y1]) expect(y).toBeGreaterThanOrEqual(z.lin0 * TILE);
          for (const y of [y0, y1]) expect(y).toBeLessThanOrEqual((z.lin1 + 1) * TILE);
        }
      }
    });
  }
});

describe("resolucaoMundo", () => {
  it("cobre o zoom (não inteiro) e a densidade da tela, entre 1 e 4", () => {
    expect(resolucaoMundo(1, 1)).toBe(1);
    expect(resolucaoMundo(1.2, 1)).toBe(2);
    expect(resolucaoMundo(2.5, 2)).toBe(4);
    expect(resolucaoMundo(3, 3)).toBe(4);
  });
});
