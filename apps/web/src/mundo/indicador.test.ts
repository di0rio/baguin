import { describe, expect, it } from "vitest";
import { indicadorDe } from "./indicador";

const base = { atividade: "nenhuma", naoPerturbe: false, silenciadoAte: 0 } as const;

describe("indicadorDe", () => {
  it("vazio por padrão", () => expect(indicadorDe(base, false, 1000)).toBe(""));
  it("silenciado só enquanto vale", () => {
    expect(indicadorDe({ ...base, silenciadoAte: 2000 }, false, 1000)).toBe("🔇");
    expect(indicadorDe({ ...base, silenciadoAte: 500 }, false, 1000)).toBe("");
  });
  it("respeita a prioridade", () => {
    expect(indicadorDe({ ...base, naoPerturbe: true, atividade: "digitando" }, true, 0)).toBe("🔕");
    expect(indicadorDe({ ...base, atividade: "digitando" }, true, 0)).toBe("💬");
    expect(indicadorDe({ ...base, atividade: "ausente" }, true, 0)).toBe("🔊");
    expect(indicadorDe({ ...base, atividade: "ausente" }, false, 0)).toBe("💤");
  });
});
