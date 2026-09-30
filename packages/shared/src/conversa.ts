import { TILE, zonaEm, type Ambiente, type Template } from "./lugares.js";

export type ContextoLugar = { template: Template; ambiente: Ambiente };
export type Ouvinte = { contaId: string; x: number; y: number; naoPerturbe: boolean };

export const alcancePx = (ambiente: Ambiente): number => (ambiente === "foco" ? 3 : 7) * TILE;

/** Chave simétrica de um Bloqueio entre duas Contas. */
export const chaveBloqueio = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

const dist = (a: Ouvinte, b: Ouvinte) => Math.hypot(a.x - b.x, a.y - b.y);

/** Sempre simétrico: podemSeOuvir(a, b) === podemSeOuvir(b, a). `bloqueados` = chaves de chaveBloqueio. */
export function podemSeOuvir(
  a: Ouvinte,
  b: Ouvinte,
  lugar: ContextoLugar,
  bloqueados: ReadonlySet<string>,
): boolean {
  if (a.naoPerturbe || b.naoPerturbe) return false;
  if (bloqueados.has(chaveBloqueio(a.contaId, b.contaId))) return false;
  const za = zonaEm(lugar.template, a.x, a.y);
  const zb = zonaEm(lugar.template, b.x, b.y);
  if (za !== null || zb !== null) return za === zb;
  return dist(a, b) <= alcancePx(lugar.ambiente);
}

/** Volume de 0 a 1 (só faz sentido se podemSeOuvir). */
export function volume(a: Ouvinte, b: Ouvinte, lugar: ContextoLugar): number {
  const za = zonaEm(lugar.template, a.x, a.y);
  if (za !== null && za === zonaEm(lugar.template, b.x, b.y)) return 1;
  return Math.min(1, Math.max(0, 1 - dist(a, b) / alcancePx(lugar.ambiente)));
}
