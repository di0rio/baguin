import { CATALOGO, type Pecas } from "@baguin/shared";

/** Sorteia usando `rnd` (0 <= x < 1). */
function sortear(rnd: () => number): Pecas {
  const de = <T>(lista: readonly T[]): T => lista[Math.floor(rnd() * lista.length)];
  return {
    altura: de(CATALOGO.alturas),
    cabelo: { estilo: de(CATALOGO.cabelos), preenchimento: de(CATALOGO.lisos) },
    roupa: { preenchimento: de([...CATALOGO.lisos, ...CATALOGO.estampas]) },
    calca: { preenchimento: de(CATALOGO.lisos) },
    rosto: de(CATALOGO.rostos),
    acessorio: de(CATALOGO.acessorios),
  };
}

export const aleatorio = (): Pecas => sortear(Math.random);

/** Gerador determinístico (mulberry32): o mesmo texto sempre dá os mesmos Avatares. */
function semente(texto: string) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Avatares estáveis para decorar a capa de um Espaço. */
export function galeraDe(texto: string, quantos: number): Pecas[] {
  const rnd = semente(texto);
  return Array.from({ length: quantos }, () => sortear(rnd));
}

/** Galera de exemplo da vitrine do login (só decoração). */
export const PECAS_VITRINE: Pecas[] = [
  { altura: "baixo", cabelo: { estilo: "coque", preenchimento: "tinta" }, roupa: { preenchimento: "bolinha" }, calca: { preenchimento: "tinta" }, rosto: "feliz", acessorio: "oculos" },
  { altura: "medio", cabelo: { estilo: "espetado", preenchimento: "tinta" }, roupa: { preenchimento: "listra" }, calca: { preenchimento: "tinta" }, rosto: "sono", acessorio: "nenhum" },
  { altura: "alto", cabelo: { estilo: "chanel", preenchimento: "papel" }, roupa: { preenchimento: "tinta" }, calca: { preenchimento: "papel" }, rosto: "fofo", acessorio: "fone" },
  { altura: "medio", cabelo: { estilo: "careca", preenchimento: "tinta" }, roupa: { preenchimento: "xadrez" }, calca: { preenchimento: "tinta" }, rosto: "desconfiado", acessorio: "bone" },
];
