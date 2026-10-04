import { describe, expect, it } from "vitest";
import { criarLimitador } from "./limite.js";

describe("criarLimitador", () => {
  it("recusa acima do máximo na janela e libera na seguinte", () => {
    let t = 0;
    const pode = criarLimitador(2, 1000, () => t);
    expect(pode("a")).toBe(true);
    expect(pode("a")).toBe(true);
    expect(pode("a")).toBe(false);
    expect(pode("b")).toBe(true); // chaves independentes
    t = 1000;
    expect(pode("a")).toBe(true);
  });
});
