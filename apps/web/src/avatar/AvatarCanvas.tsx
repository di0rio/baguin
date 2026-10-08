import type { Direcao, Pecas } from "@baguin/shared";
import { useEffect, useMemo, useRef } from "react";
import { ESPESSURA_MUNDO, UNIDADE, montarAvatar, pintarAvatar, poseDe, regiaoDe, vistaDe, type Corte, type Movimento } from "./renderizar";

type Props = {
  pecas: Pecas;
  dir?: Direcao;
  movimento?: Movimento;
  /** Anima (respira parado, caminha, dança). Sem isto, mostra a pose inicial. */
  animado?: boolean;
  /** Px de tela por px lógico do mundo: o Avatar inteiro tem 27 × 32 px lógicos. */
  escala?: number;
  /** Região mostrada; padrão, o Avatar inteiro. */
  corte?: Corte;
  espessura?: number;
  /** Sombra no chão (só faz sentido no corpo inteiro). */
  sombra?: boolean;
  className?: string;
};

const reduzirMovimento = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Desenha o Avatar vetorial num canvas nítido (sem pixelar) do tamanho pedido. */
export function AvatarCanvas({ pecas, dir = "baixo", movimento = "parado", animado = false, escala = 4, corte = "corpo", espessura = ESPESSURA_MUNDO, sombra = false, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chave = JSON.stringify(pecas);
  const { vista, espelhar } = vistaDe(dir);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const desenho = useMemo(() => montarAvatar(pecas, vista), [chave, vista]);
  const regiao = regiaoDe(corte, pecas.altura);
  const largura = ((regiao.x1 - regiao.x0) / UNIDADE) * escala;
  const altura = ((regiao.y1 - regiao.y0) / UNIDADE) * escala;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(largura * dpr);
    canvas.height = Math.ceil(altura * dpr);
    const k = (escala / UNIDADE) * dpr;
    const reduzir = reduzirMovimento();
    let id = 0;
    const desenhar = (ms: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(k, 0, 0, k, -regiao.x0 * k, -regiao.y0 * k);
      pintarAvatar(ctx, desenho, poseDe(movimento, ms, vista, reduzir), { espessura, espelhar, sombra });
    };
    if (animado) {
      const inicio = performance.now();
      const quadro = (agora: number) => {
        desenhar(agora - inicio);
        id = requestAnimationFrame(quadro);
      };
      id = requestAnimationFrame(quadro);
    } else {
      desenhar(0);
    }
    return () => cancelAnimationFrame(id);
  }, [desenho, vista, espelhar, movimento, animado, escala, espessura, sombra, largura, altura, regiao.x0, regiao.y0]);

  return <canvas ref={ref} className={className} style={{ width: largura, height: altura, imageRendering: "auto" }} aria-hidden />;
}
