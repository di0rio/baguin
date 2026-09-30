import type { Direcao, Pecas } from "@baguin/shared";
import { useEffect, useMemo, useRef } from "react";
import { FRAME_A, FRAME_L, ORDEM_DIRECOES, renderizarSpritesheet } from "./renderizar";

// parado, passo A, parado, passo B
const CICLO = [0, 1, 0, 2];

type Props = {
  pecas: Pecas;
  dir?: Direcao;
  andando?: boolean;
  /** coluna fixa (0 parado, 1/2 passos) quando não está andando */
  quadro?: number;
  /** escala inteira: cada pixel lógico vira `escala` pixels de tela */
  escala?: number;
  className?: string;
};

/** Mostra um quadro do spritesheet do Avatar, com caminhada opcional. */
export function AvatarCanvas({ pecas, dir = "baixo", andando = false, quadro = 0, escala = 4, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chave = JSON.stringify(pecas);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sheet = useMemo(() => renderizarSpritesheet(pecas), [chave]);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const linha = ORDEM_DIRECOES.indexOf(dir);
    let passo = 0;
    const desenhar = () => {
      const col = andando ? CICLO[passo % CICLO.length] : quadro;
      ctx.clearRect(0, 0, FRAME_L, FRAME_A);
      ctx.drawImage(sheet, col * FRAME_L, linha * FRAME_A, FRAME_L, FRAME_A, 0, 0, FRAME_L, FRAME_A);
    };
    desenhar();
    if (!andando) return;
    const id = setInterval(() => {
      passo++;
      desenhar();
    }, 160);
    return () => clearInterval(id);
  }, [sheet, dir, andando, quadro]);

  return (
    <canvas
      ref={ref}
      width={FRAME_L}
      height={FRAME_A}
      className={`pixelado ${className ?? ""}`}
      style={{ width: FRAME_L * escala, height: FRAME_A * escala }}
      aria-hidden
    />
  );
}
