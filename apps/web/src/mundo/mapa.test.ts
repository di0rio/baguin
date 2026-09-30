import { TEMPLATES, TEMPLATES_LUGAR } from "@baguin/shared";
import { describe, expect, it } from "vitest";
import { portasDoMapa, zonasDoMapa } from "./mapa";

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
