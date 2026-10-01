import { CATALOGO, type Pecas } from "@baguin/shared";

const sorteia = <T>(lista: readonly T[]): T => lista[Math.floor(Math.random() * lista.length)];
const indice = (n: number) => Math.floor(Math.random() * n);

export const aleatorio = (): Pecas => ({
  pele: indice(CATALOGO.pele),
  cabelo: { estilo: sorteia(CATALOGO.cabeloEstilos), cor: indice(CATALOGO.cabeloCores) },
  roupa: { estilo: sorteia(CATALOGO.roupaEstilos), cor: indice(CATALOGO.roupaCores) },
  calca: indice(CATALOGO.calcaCores),
  acessorio: sorteia(CATALOGO.acessorios),
});

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
  const i = (n: number) => Math.floor(rnd() * n);
  const de = <T>(l: readonly T[]) => l[i(l.length)];
  return Array.from({ length: quantos }, () => ({
    pele: i(CATALOGO.pele),
    cabelo: { estilo: de(CATALOGO.cabeloEstilos), cor: i(CATALOGO.cabeloCores) },
    roupa: { estilo: de(CATALOGO.roupaEstilos), cor: i(CATALOGO.roupaCores) },
    calca: i(CATALOGO.calcaCores),
    acessorio: de(CATALOGO.acessorios),
  }));
}

/** Galera de exemplo da vitrine do login (só decoração). */
export const PECAS_VITRINE: Pecas[] = [
  { pele: 0, cabelo: { estilo: "longo", cor: 4 }, roupa: { estilo: "moletom", cor: 5 }, calca: 2, acessorio: "oculos" },
  { pele: 3, cabelo: { estilo: "curto", cor: 1 }, roupa: { estilo: "camiseta", cor: 2 }, calca: 0, acessorio: "fone" },
  { pele: 2, cabelo: { estilo: "blackpower", cor: 0 }, roupa: { estilo: "regata", cor: 7 }, calca: 3, acessorio: "nenhum" },
  { pele: 4, cabelo: { estilo: "rabo", cor: 3 }, roupa: { estilo: "camiseta", cor: 9 }, calca: 1, acessorio: "chapeu" },
];
