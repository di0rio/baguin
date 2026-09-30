import { describe, expect, it } from "vitest";
import { indicadorDe, statusDe } from "./indicador";

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

describe("statusDe", () => {
  it("online por padrão e digitando", () => {
    expect(statusDe(base)).toBe("online");
    expect(statusDe({ ...base, atividade: "digitando" })).toBe("online");
  });
  it("ausente é amarelo; Não perturbe vence e é vermelho", () => {
    expect(statusDe({ ...base, atividade: "ausente" })).toBe("ausente");
    expect(statusDe({ ...base, atividade: "ausente", naoPerturbe: true })).toBe("naoPerturbe");
  });
});
