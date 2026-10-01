import type { Pecas } from "@baguin/shared";
import type { CSSProperties } from "react";
import { AvatarCanvas } from "../avatar/AvatarCanvas";
import { FRAME_A, FRAME_L } from "../avatar/renderizar";
import { cn } from "../lib/utils";
import { Avatar } from "./ui/avatar";

type Corte = "cabeca" | "torso" | "corpo";

/** Fração da altura do quadro onde o recorte começa / termina. */
const CORTES: Record<Corte, [number, number]> = {
  cabeca: [0, 0.56],
  torso: [0.34, 0.9],
  corpo: [0, 1],
};

/**
 * Miniatura recortada do Avatar (quadro parado). Usa as constantes do renderizador,
 * então segue funcionando se o tamanho do quadro mudar.
 */
export function AvatarMini({ pecas, escala = 2, corte = "cabeca", className }: { pecas: Pecas; escala?: number; corte?: Corte; className?: string }) {
  const [de, ate] = CORTES[corte];
  const altura = Math.round(FRAME_A * escala * (ate - de));
  const deslocamento = Math.round(FRAME_A * escala * de);
  return (
    <span className={cn("block shrink-0 overflow-hidden", className)} style={{ width: FRAME_L * escala, height: altura }} aria-hidden>
      <span className="flex" style={{ marginTop: -deslocamento }}>
        <AvatarCanvas pecas={pecas} escala={escala} />
      </span>
    </span>
  );
}

/** Matiz (0–359) estável para um texto: dá a cada Espaço e Membro a sua cor pastel. */
export const matizDe = (texto: string) => {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h * 47) % 360;
};

/** Fundo pastel (claro) / profundo (escuro) a partir de `--matiz`. */
export const FUNDO_PASTEL = "bg-[oklch(0.93_0.05_var(--matiz))] dark:bg-[oklch(0.36_0.07_var(--matiz))]";
export const estiloMatiz = (texto: string) => ({ "--matiz": matizDe(texto) }) as CSSProperties;

/** Bolha redonda com a cabeça do Avatar; sem Avatar conhecido, mostra a inicial do nome. */
export function AvatarBolha({ pecas, nome, tamanho = 32, className }: { pecas?: Pecas | null; nome: string; tamanho?: number; className?: string }) {
  return (
    <Avatar className={cn("items-end justify-center", FUNDO_PASTEL, className)} style={{ ...estiloMatiz(nome), width: tamanho, height: tamanho }}>
      {pecas ? (
        <AvatarMini pecas={pecas} escala={Math.max(1, Math.round(tamanho / 20))} corte="cabeca" className="mt-[8%]" />
      ) : (
        <span className="self-center text-xs font-semibold text-foreground/70">{nome.trim().charAt(0).toUpperCase()}</span>
      )}
    </Avatar>
  );
}
