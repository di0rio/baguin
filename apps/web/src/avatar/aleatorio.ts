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
