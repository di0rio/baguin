import { useEffect, useState, useSyncExternalStore } from "react";
import type { HudEstado, Sala } from "../sala";
import type { Voz, VozEstado } from "../voz";

export const useHud = (sala: Sala): HudEstado => useSyncExternalStore(sala.assinar, sala.estado);
export const useVoz = (voz: Voz): VozEstado => useSyncExternalStore(voz.assinar, voz.estado);

/** Relógio que só re-renderiza quando `ate` (epoch ms) é alcançado. Devolve se ainda está no futuro. */
export function useAte(ate: number): boolean {
  const [, forcar] = useState(0);
  useEffect(() => {
    const falta = ate - Date.now();
    if (falta <= 0) return;
    const t = setTimeout(() => forcar((n) => n + 1), falta + 50);
    return () => clearTimeout(t);
  }, [ate]);
  return ate > Date.now();
}

export const horaCurta = (ms: number) => new Date(ms).toLocaleTimeString("pt-BR", { timeStyle: "short" });
