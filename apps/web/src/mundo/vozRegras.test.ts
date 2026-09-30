import { chaveBloqueio, TILE } from "@baguin/shared";
import { describe, expect, it } from "vitest";
import {
  alvosDeVoz,
  decidirConexao,
  devePublicarMic,
  esperaBackoff,
  GRACA_DESCONEXAO_MS,
  suavizar,
} from "./vozRegras";

const lugar = { template: "sala", ambiente: "resenha" } as const; // Alcance 7 tiles, Zona "a" nas linhas 5-9, colunas 8-19
const av = (contaId: string, x: number, y: number, naoPerturbe = false) => ({ contaId, x, y, naoPerturbe });
const nenhum = new Set<string>();
const eu = av("eu", 5 * TILE, 12 * TILE);

describe("alvosDeVoz", () => {
  it("longe: ninguém", () => {
    expect(alvosDeVoz(eu, [av("b", 25 * TILE, 12 * TILE)], lugar, nenhum).size).toBe(0);
  });
  it("perto: volume cresce ao se aproximar", () => {
    const longe = alvosDeVoz(eu, [av("b", 10 * TILE, 12 * TILE)], lugar, nenhum).get("b")!;
    const perto = alvosDeVoz(eu, [av("b", 6 * TILE, 12 * TILE)], lugar, nenhum).get("b")!;
    expect(longe).toBeGreaterThan(0);
    expect(perto).toBeGreaterThan(longe);
  });
  it("Zona isola: quem está na Zona não ouve quem está fora, e dentro o volume é cheio", () => {
    const naZona = av("z", 10 * TILE, 6 * TILE);
    expect(alvosDeVoz(av("eu", 10 * TILE, 11 * TILE), [naZona], lugar, nenhum).size).toBe(0);
    expect(alvosDeVoz(av("eu", 12 * TILE, 6 * TILE), [naZona], lugar, nenhum).get("z")).toBe(1);
  });
  it("Não perturbe (meu ou do outro) e Bloqueio zeram", () => {
    const b = av("b", 6 * TILE, 12 * TILE);
    expect(alvosDeVoz({ ...eu, naoPerturbe: true }, [b], lugar, nenhum).size).toBe(0);
    expect(alvosDeVoz(eu, [{ ...b, naoPerturbe: true }], lugar, nenhum).size).toBe(0);
    expect(alvosDeVoz(eu, [b], lugar, new Set([chaveBloqueio("eu", "b")])).size).toBe(0);
  });
});

describe("decidirConexao", () => {
  const base = { conectado: false, conectando: false, temAlvos: false, agora: 1000, vazioDesde: null, proximaTentativa: 0 };
  it("não conecta sozinho", () => expect(decidirConexao(base).acao).toBe("nada"));
  it("conecta quando há alguém, respeitando backoff e conexão em andamento", () => {
    expect(decidirConexao({ ...base, temAlvos: true }).acao).toBe("conectar");
    expect(decidirConexao({ ...base, temAlvos: true, proximaTentativa: 5000 }).acao).toBe("nada");
    expect(decidirConexao({ ...base, temAlvos: true, conectando: true }).acao).toBe("nada");
    expect(decidirConexao({ ...base, temAlvos: true, conectado: true }).acao).toBe("nada");
  });
  it("desconecta só 30 s depois de esvaziar; voltar alguém zera a contagem", () => {
    const c = { ...base, conectado: true };
    const a = decidirConexao(c);
    expect(a).toEqual({ acao: "nada", vazioDesde: 1000 });
    const b = decidirConexao({ ...c, vazioDesde: a.vazioDesde, agora: 1000 + GRACA_DESCONEXAO_MS - 1 });
    expect(b.acao).toBe("nada");
    expect(decidirConexao({ ...c, vazioDesde: 1000, agora: 1000 + GRACA_DESCONEXAO_MS }).acao).toBe("desconectar");
    expect(decidirConexao({ ...c, temAlvos: true, vazioDesde: 1000, agora: 99999 })).toEqual({ acao: "nada", vazioDesde: null });
  });
});

describe("esperaBackoff", () => {
  it("5 s dobrando até 60 s", () => {
    expect([1, 2, 3, 4, 5, 9].map(esperaBackoff)).toEqual([5000, 10000, 20000, 40000, 60000, 60000]);
  });
});

describe("suavizar", () => {
  it("anda no máximo um passo e para no alvo", () => {
    expect(suavizar(0, 1, 0.25)).toBe(0.25);
    expect(suavizar(1, 0, 0.25)).toBe(0.75);
    expect(suavizar(0.9, 1, 0.25)).toBe(1);
    expect(suavizar(0.5, 0.5, 0.25)).toBe(0.5);
  });
});

describe("devePublicarMic", () => {
  const ok = { conectado: true, preferencia: "ligado", silenciado: false, naoPerturbe: false, bloqueado: false } as const;
  it("publica no caso feliz", () => expect(devePublicarMic(ok)).toBe(true));
  it.each([
    { conectado: false },
    { preferencia: "mudo" },
    { silenciado: true },
    { naoPerturbe: true },
    { bloqueado: true },
  ] as const)("não publica com %o", (o) => expect(devePublicarMic({ ...ok, ...o })).toBe(false));
});
