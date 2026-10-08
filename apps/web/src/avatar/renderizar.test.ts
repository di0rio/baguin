import { CATALOGO, DIRECOES, PECAS_PADRAO, type Pecas } from "@baguin/shared";
import { describe, expect, it } from "vitest";
import {
  FRAME_A,
  FRAME_L,
  ORDEM_DIRECOES,
  PAPEL,
  ROSTOS,
  TINTA,
  deslocamentoDe,
  montarAvatar,
  pintarAvatar,
  poseDe,
  regiaoDe,
  vistaDe,
  type Desenho,
  type Op,
  type ParteId,
  type Vista,
} from "./renderizar";

const VISTAS: Vista[] = ["frente", "costas", "lado"];
const com = (extra: Partial<Pecas>): Pecas => ({ ...PECAS_PADRAO, ...extra });
const opsDe = (d: Desenho, id: ParteId) => d.partes.find((p) => p.id === id)!.ops;
const todasOps = (d: Desenho) => d.partes.flatMap((p) => p.ops);

const todas: Pecas[] = [];
for (const estilo of CATALOGO.cabelos)
  for (const acessorio of CATALOGO.acessorios)
    for (const preenchimento of CATALOGO.lisos)
      todas.push(com({ cabelo: { estilo, preenchimento }, acessorio, roupa: { preenchimento: CATALOGO.estampas[todas.length % 3] } }));

describe("vistas", () => {
  it("baixo é frente, cima é costas, esquerda e direita são o lado (direita espelhada)", () => {
    expect(vistaDe("baixo")).toEqual({ vista: "frente", espelhar: false });
    expect(vistaDe("cima")).toEqual({ vista: "costas", espelhar: false });
    expect(vistaDe("esquerda")).toEqual({ vista: "lado", espelhar: false });
    expect(vistaDe("direita")).toEqual({ vista: "lado", espelhar: true });
    expect([...ORDEM_DIRECOES].sort()).toEqual([...DIRECOES].sort());
  });
});

describe("desenho do Avatar", () => {
  it("todas as combinações têm partes em ordem, formas válidas e só as duas tintas", () => {
    for (const p of todas)
      for (const vista of VISTAS) {
        const d = montarAvatar(p, vista);
        expect(d.partes[0].id).toBe("sombra");
        expect(d.partes.map((x) => x.id)).toEqual(expect.arrayContaining(["pernaA", "pernaB", "tronco", "cabeca", "cabeloAtras", "bracoA", "bracoB"]));
        for (const op of todasOps(d)) {
          expect(op.d).toMatch(/^M/);
          expect(op.fill === undefined || op.fill === TINTA || op.fill === PAPEL).toBe(true);
          expect(op.cor === undefined || op.cor === TINTA || op.cor === PAPEL).toBe(true);
        }
        for (const parte of d.partes) {
          expect(parte.caixa.x1).toBeGreaterThan(parte.caixa.x0);
          expect(parte.caixa.y1).toBeGreaterThan(parte.caixa.y0);
        }
      }
  });

  it("o quadro lógico tem o tamanho do Avatar no mundo", () => {
    expect(FRAME_L).toBe(27);
    expect(FRAME_A).toBe(32);
  });

  it("a Altura muda tronco, pernas e braços, não a cabeça", () => {
    const [baixo, medio, alto] = CATALOGO.alturas.map((altura) => montarAvatar(com({ altura }), "frente"));
    const caixa = (d: Desenho, id: ParteId) => d.partes.find((p) => p.id === id)!.caixa;
    for (const id of ["pernaA", "tronco", "bracoA"] as const) {
      const h = (d: Desenho) => caixa(d, id).y1 - caixa(d, id).y0;
      expect(h(baixo)).toBeLessThan(h(medio));
      expect(h(medio)).toBeLessThan(h(alto));
    }
    // a cabeça é a mesma forma, só desloca
    expect(opsDe(baixo, "cabeca")).toEqual(opsDe(alto, "cabeca"));
    expect(baixo.partes.find((p) => p.id === "cabeca")!.dy).toBeGreaterThan(0);
    expect(alto.partes.find((p) => p.id === "cabeca")!.dy).toBeLessThan(0);
    expect(deslocamentoDe("medio")).toBe(0);
    // o quadril (onde o tronco encontra as pernas) sobe com a perna
    expect(alto.quadril.y).toBeLessThan(baixo.quadril.y);
  });

  it("Preenchimento da roupa: papel e tinta lisos, estampas sobre papel e recortadas no tronco", () => {
    const tronco = (preenchimento: Pecas["roupa"]["preenchimento"]) => opsDe(montarAvatar(com({ roupa: { preenchimento } }), "frente"), "tronco");
    expect(tronco("papel")[0].fill).toBe(PAPEL);
    expect(tronco("tinta")[0].fill).toBe(TINTA);
    for (const e of CATALOGO.estampas) {
      const ops = tronco(e);
      expect(ops[0].fill).toBe(PAPEL);
      expect(ops.some((o: Op) => o.clip)).toBe(true);
    }
  });

  it("braço é sempre papel; a calça segue o Preenchimento", () => {
    const d = montarAvatar(com({ calca: { preenchimento: "tinta" } }), "frente");
    expect(opsDe(d, "pernaA")[0].fill).toBe(TINTA);
    expect(opsDe(d, "bracoA")[0].fill).toBe(PAPEL);
    expect(opsDe(montarAvatar(com({ calca: { preenchimento: "papel" } }), "frente"), "pernaB")[0].fill).toBe(PAPEL);
  });

  it("boné e touca trocam o cabelo pela versão de baixo e escondem coque e crista", () => {
    const coque = com({ cabelo: { estilo: "coque", preenchimento: "tinta" } });
    expect(opsDe(montarAvatar(coque, "frente"), "cabeloAtras")).toHaveLength(2); // coque + silhueta
    for (const acessorio of ["bone", "touca"] as const) {
      const comChapeu = opsDe(montarAvatar({ ...coque, acessorio }, "frente"), "cabeloAtras");
      expect(comChapeu).toHaveLength(1); // só a versão de baixo, sem coque
      expect(comChapeu[0].d).not.toBe(opsDe(montarAvatar(coque, "frente"), "cabeloAtras")[1].d);
    }
    const moicano = com({ cabelo: { estilo: "moicano", preenchimento: "tinta" } });
    const crista = (p: Pecas) => opsDe(montarAvatar(p, "frente"), "cabeca").filter((o) => o.d.startsWith("M108 100C102 76")).length;
    expect(crista(moicano)).toBe(1);
    expect(crista({ ...moicano, acessorio: "bone" })).toBe(0);
    expect(crista({ ...moicano, acessorio: "touca" })).toBe(0);
  });

  it("a cor do acessório é sempre o contrário da do cabelo", () => {
    const fone = (preenchimento: "papel" | "tinta") => opsDe(montarAvatar(com({ cabelo: { estilo: "longo", preenchimento }, acessorio: "fone" }), "frente"), "cabeca");
    const escuro = fone("tinta");
    const claro = fone("papel");
    // cabelo em tinta: o arco vira tubo claro (contorno de 13 mais miolo de papel) e os fones são papel
    expect(escuro.some((o) => o.traco === 13)).toBe(true);
    expect(escuro.some((o) => o.cor === PAPEL && o.traco === 5)).toBe(true);
    expect(escuro.filter((o) => o.fill === PAPEL).length).toBeGreaterThanOrEqual(2);
    // cabelo em papel: arco escuro, sem tubo claro
    expect(claro.some((o) => o.traco === 13)).toBe(false);
    expect(claro.some((o) => o.traco === 8)).toBe(true);
    expect(claro.filter((o) => o.fill === TINTA).length).toBeGreaterThanOrEqual(2);
    // careca não tem cabelo: acessório em tinta
    const careca = montarAvatar(com({ cabelo: { estilo: "careca", preenchimento: "papel" }, acessorio: "bone" }), "frente");
    expect(opsDe(careca, "cabeca").at(-2)!.fill).toBe(TINTA);
  });

  it("o arco do fone acompanha a altura do cabelo", () => {
    const arco = (estilo: Pecas["cabelo"]["estilo"]) =>
      opsDe(montarAvatar(com({ cabelo: { estilo, preenchimento: "papel" }, acessorio: "fone" }), "frente"), "cabeca").find((o) => o.traco === 8)!.d;
    expect(arco("espetado")).not.toBe(arco("coque"));
    expect(arco("espetado")).toContain(" 16 ");
    expect(arco("coque")).toContain(" 26 ");
  });

  it("de costas não tem rosto; de lado o rosto vai para a frente", () => {
    const rosto = ROSTOS[PECAS_PADRAO.rosto];
    const frente = opsDe(montarAvatar(PECAS_PADRAO, "frente"), "cabeca");
    const costas = opsDe(montarAvatar(PECAS_PADRAO, "costas"), "cabeca");
    const lado = opsDe(montarAvatar(PECAS_PADRAO, "lado"), "cabeca");
    for (const op of [...rosto.olhos, ...rosto.boca]) {
      expect(frente.some((o) => o.d === op.d)).toBe(true);
      expect(costas.some((o) => o.d === op.d)).toBe(false);
      expect(lado.find((o) => o.d === op.d)?.m).toBeDefined();
    }
  });

  it("o rosto é parametrizável: um rosto de fora entra no lugar do escolhido", () => {
    const d = montarAvatar(PECAS_PADRAO, "frente", { olhos: [], boca: [{ d: "M0 0L1 1", traco: 5 }] });
    expect(opsDe(d, "cabeca").some((o) => o.d === "M0 0L1 1")).toBe(true);
    expect(opsDe(d, "cabeca").some((o) => o.d === ROSTOS.sono.boca[0].d)).toBe(false);
  });

  it("todos os rostos do catálogo existem", () => {
    for (const r of CATALOGO.rostos) expect(ROSTOS[r].olhos.length + ROSTOS[r].boca.length).toBeGreaterThan(0);
  });

  it("miniaturas recortam dentro do quadro e acompanham a Altura", () => {
    for (const altura of CATALOGO.alturas)
      for (const corte of ["corpo", "cabeca", "torso", "pernas"] as const) {
        const r = regiaoDe(corte, altura);
        expect(r.x1).toBeGreaterThan(r.x0);
        expect(r.y1).toBeGreaterThan(r.y0);
      }
    expect(regiaoDe("cabeca", "alto").y0).toBeLessThan(regiaoDe("cabeca", "baixo").y0);
  });
});

describe("marionete", () => {
  it("parado respira: o tronco sobe e desce, nada mais mexe", () => {
    const dys = [0, 400, 800, 1600].map((t) => poseDe("parado", t, "frente").superior.dy);
    expect(dys[0]).toBeCloseTo(0);
    expect(Math.min(...dys)).toBeLessThan(-2.9);
    expect(Math.max(...dys)).toBeLessThanOrEqual(0);
    expect(poseDe("parado", 800, "frente").partes).toEqual({});
    expect(poseDe("parado", 800, "frente", true).superior).toEqual({ dx: 0, dy: 0, rot: 0 });
  });

  it("andando alterna as pernas e balança os braços (de frente levanta, de lado gira)", () => {
    const meio = poseDe("andando", 150, "frente").partes;
    expect(meio.pernaA!.dy + meio.pernaB!.dy).toBeCloseTo(-7);
    const a = poseDe("andando", 0, "frente").partes;
    const b = poseDe("andando", 300, "frente").partes;
    expect(a.pernaA!.dy).toBeCloseTo(0);
    expect(b.pernaA!.dy).toBeCloseTo(-7);
    expect(a.pernaB!.dy).toBeCloseTo(-7);
    expect(a.bracoA!.rot).toBeLessThan(0);
    expect(b.bracoA!.rot).toBeGreaterThan(0);
    expect(b.bracoB!.rot).toBeCloseTo(-b.bracoA!.rot);
    const l = poseDe("andando", 300, "lado").partes;
    expect(l.pernaA!.rot).toBeCloseTo(-l.pernaB!.rot);
    expect(l.bracoB!.rot).toBeCloseTo(l.pernaA!.rot); // braço de perto contra a perna de perto
  });

  it("dançando inclina o tronco e levanta os braços", () => {
    const p = poseDe("dancando", 420, "frente");
    expect(Math.abs(p.superior.rot)).toBeGreaterThan(0.05);
    expect(p.partes.bracoA!.rot).toBeGreaterThan(0.7);
    expect(p.partes.bracoB!.rot).toBeLessThan(-0.7);
    const inclinacao = [0, 210, 420].map((ms) => poseDe("dancando", ms, "frente").superior.rot);
    expect(inclinacao[0]).toBeLessThan(0);
    expect(inclinacao[2]).toBeGreaterThan(0);
  });
});

/** Contexto de mentira que guarda as chamadas, para conferir a pintura sem um canvas de verdade. */
function contextoFalso() {
  const chamadas: string[] = [];
  const alvo = new Proxy(
    {},
    {
      get: (_, nome: string) => (...args: unknown[]) => void chamadas.push(`${nome}:${args.length}`),
      set: (_, nome: string, v) => (chamadas.push(`set ${nome}=${String(v)}`), true),
    },
  );
  return { ctx: alvo as unknown as CanvasRenderingContext2D, chamadas };
}

describe("pintura", () => {
  const global = globalThis as unknown as { Path2D?: unknown };
  const antes = global.Path2D;
  const prepara = () => {
    global.Path2D = class {
      addPath() {}
    };
  };
  const limpa = () => {
    global.Path2D = antes;
  };

  it("pinta todas as vistas e movimentos, com traço grosso e sem alisar pixels", () => {
    prepara();
    try {
      for (const vista of VISTAS)
        for (const mov of ["parado", "andando", "dancando"] as const) {
          const { ctx, chamadas } = contextoFalso();
          pintarAvatar(ctx, montarAvatar(PECAS_PADRAO, vista), poseDe(mov, 123, vista), { espessura: 1.45, espelhar: vista === "lado" });
          expect(chamadas.filter((c) => c.startsWith("stroke:")).length).toBeGreaterThanOrEqual(8);
          expect(chamadas.filter((c) => c.startsWith("fill:")).length).toBeGreaterThan(5);
          expect(chamadas).toContain("set lineWidth=10.15");
          expect(chamadas.some((c) => c.includes("imageSmoothing"))).toBe(false);
        }
    } finally {
      limpa();
    }
  });

  it("sem sombra, a sombra não é pintada", () => {
    prepara();
    try {
      const d = montarAvatar(PECAS_PADRAO, "frente");
      const com = contextoFalso();
      const sem = contextoFalso();
      pintarAvatar(com.ctx, d, poseDe("parado", 0, "frente"), { sombra: true });
      pintarAvatar(sem.ctx, d, poseDe("parado", 0, "frente"), { sombra: false });
      const preenchimentos = (c: string[]) => c.filter((x) => x.startsWith("fill:")).length;
      expect(preenchimentos(com.chamadas)).toBe(preenchimentos(sem.chamadas) + 1);
    } finally {
      limpa();
    }
  });
});
