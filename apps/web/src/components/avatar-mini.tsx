import type { Pecas } from "@baguin/shared";
import type { CSSProperties } from "react";
import { AvatarCanvas } from "../avatar/AvatarCanvas";
import type { Corte } from "../avatar/renderizar";
import { cn } from "../lib/utils";
import { Avatar } from "./ui/avatar";

/** Miniatura do Avatar (pose parada), recortada em `corte`. `escala`: px de tela por px lógico do mundo. */
export function AvatarMini({ pecas, escala = 2, corte = "cabeca", className }: { pecas: Pecas; escala?: number; corte?: Corte; className?: string }) {
  return <AvatarCanvas pecas={pecas} escala={escala} corte={corte} className={cn("block shrink-0", className)} />;
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
        <AvatarMini pecas={pecas} escala={tamanho / 20} corte="cabeca" />
      ) : (
        <span className="self-center text-xs font-semibold text-foreground/70">{nome.trim().charAt(0).toUpperCase()}</span>
      )}
    </Avatar>
  );
}
