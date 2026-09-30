import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Monta/desmonta um elemento que entra e sai por transição CSS (interrompível).
 * `visivel` vira true um quadro depois de montar, para a transição partir do estado escondido.
 */
export function usePresenca(aberto: boolean, ms: number) {
  const [montado, setMontado] = useState(aberto);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    if (aberto) {
      setMontado(true);
      let b = 0;
      const a = requestAnimationFrame(() => {
        b = requestAnimationFrame(() => setVisivel(true));
      });
      return () => {
        cancelAnimationFrame(a);
        cancelAnimationFrame(b);
      };
    }
    setVisivel(false);
    const t = setTimeout(() => setMontado(false), ms);
    return () => clearTimeout(t);
  }, [aberto, ms]);
  return { montado, visivel };
}

type Props = {
  aberto: boolean;
  ms: number;
  className?: string;
  children: ReactNode;
  /** atributos extras (role, aria-*) */
  [k: `aria-${string}`]: string | undefined;
  role?: string;
};

/** Mantém o último conteúdo visível enquanto a saída anima. `data-visivel` liga o estado final. */
export function Presenca({ aberto, ms, className, children, ...resto }: Props) {
  const { montado, visivel } = usePresenca(aberto, ms);
  const ultimo = useRef(children);
  if (aberto) ultimo.current = children;
  if (!montado) return null;
  return (
    <div className={className} data-visivel={visivel} {...resto}>
      {ultimo.current}
    </div>
  );
}
