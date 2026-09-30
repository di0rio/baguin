import { CATALOGO, DIRECOES, PECAS_PADRAO, type Pecas } from "@baguin/shared";
import { describe, expect, it } from "vitest";
import { FRAME_A, FRAME_L, ORDEM_DIRECOES, desenharQuadro, quadro } from "./renderizar";

const todas: Pecas[] = [];
for (const estilo of CATALOGO.cabeloEstilos)
  for (const roupa of CATALOGO.roupaEstilos)
    for (const acessorio of CATALOGO.acessorios)
      todas.push({ ...PECAS_PADRAO, cabelo: { estilo, cor: 3 }, roupa: { estilo: roupa, cor: 5 }, acessorio });

describe("renderizador de Avatar", () => {
  it("indexa quadros em linhas de 3, na ordem baixo/esquerda/direita/cima", () => {
    expect(quadro("baixo", 0)).toBe(0);
    expect(quadro("esquerda", 1)).toBe(4);
    expect(quadro("direita", 2)).toBe(8);
    expect(quadro("cima", 0)).toBe(9);
    expect([...ORDEM_DIRECOES].sort()).toEqual([...DIRECOES].sort());
  });

  it("cabe no quadro (corpo não encosta na borda) em todas as combinações", () => {
    for (const p of todas) {
      for (const dir of ORDEM_DIRECOES) {
        for (let f = 0; f < 3; f++) {
          const g = desenharQuadro(p, dir, f);
          const cru = desenharQuadro(p, dir, f, false);
          expect(g).toHaveLength(FRAME_L * FRAME_A);
          expect(g.some(Boolean)).toBe(true);
          // o corpo em si deixa 1px livre em volta para o contorno
          for (let x = 0; x < FRAME_L; x++) expect(cru[x]).toBeFalsy();
          for (let y = 0; y < FRAME_A; y++) {
            expect(cru[y * FRAME_L]).toBeFalsy();
            expect(cru[y * FRAME_L + FRAME_L - 1]).toBeFalsy();
          }
        }
      }
    }
  });

  it("direita é o espelho de esquerda", () => {
    const e = desenharQuadro(PECAS_PADRAO, "esquerda", 1);
    const d = desenharQuadro(PECAS_PADRAO, "direita", 1);
    for (let y = 0; y < FRAME_A; y++)
      for (let x = 0; x < FRAME_L; x++) expect(Boolean(d[y * FRAME_L + x])).toBe(Boolean(e[y * FRAME_L + (FRAME_L - 1 - x)]));
  });

  it("o contorno é ameixa-azulado suave, nunca preto", () => {
    for (const dir of ORDEM_DIRECOES) {
      const com = desenharQuadro(PECAS_PADRAO, dir, 0);
      const sem = desenharQuadro(PECAS_PADRAO, dir, 0, false);
      com.forEach((c, i) => {
        if (!c || sem[i] || c.length > 7) return; // só pixels de contorno (sombra no chão é translúcida)
        const [r, g, b] = [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
        expect(Math.max(r, g, b), `contorno ${c}`).toBeGreaterThanOrEqual(0x40);
        expect(b, `contorno ${c}`).toBeGreaterThanOrEqual(0x3a); // sempre com fundo azul-arroxeado
      });
    }
  });
});
