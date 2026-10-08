import { describe, expect, it } from "vitest";
import { CLARA, MUNDO, rgb, usarPaleta } from "./paleta";

const brilho = (c: string) => {
  const [r, g, b] = rgb(c);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

describe("paleta do mundo", () => {
  it("só tinta e papel: todo tom é neutro, menos o amarelo reservado", () => {
    for (const [nome, c] of Object.entries(CLARA)) {
      const [r, g, b] = rgb(c);
      if (nome === "amarelo") expect(c).toBe("#FFD23F");
      else expect(Math.max(r, g, b) - Math.min(r, g, b), nome).toBeLessThanOrEqual(24);
    }
  });

  it("parede mais clara que o chão, sombra chapada mais escura que ele", () => {
    expect(brilho(CLARA.parede)).toBeGreaterThan(brilho(CLARA.chao));
    expect(brilho(CLARA.chao)).toBeGreaterThan(brilho(CLARA.meio));
    expect(brilho(CLARA.meio)).toBeGreaterThan(brilho(CLARA.sombra));
    expect(CLARA.tinta).toBe("#000000");
    expect(CLARA.papel).toBe("#FFFFFF");
  });

  it("usarPaleta troca os tons no objeto único lido por quem desenha", () => {
    usarPaleta({ ...CLARA, chao: "#1C1C1C" });
    expect(MUNDO.chao).toBe("#1C1C1C");
    usarPaleta(CLARA);
    expect(MUNDO.chao).toBe(CLARA.chao);
  });
});
