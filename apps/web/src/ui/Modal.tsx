import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Presenca } from "./presenca";

type Props = {
  aberto: boolean;
  titulo: string;
  /** sem `onFechar` o modal não fecha por Esc nem clique no fundo (ex.: estado de conexão) */
  onFechar?: () => void;
  children: ReactNode;
};

/** Modal centralizado com fundo escurecido. Entra com escala 0.96 + opacidade (220ms). */
export function Modal({ aberto, titulo, onFechar, children }: Props) {
  return createPortal(
    <Presenca aberto={aberto} ms={220} className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
      <Corpo onFechar={onFechar}>{children}</Corpo>
    </Presenca>,
    document.body,
  );
}

function Corpo({ onFechar, children }: { onFechar?: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("[data-foco-inicial], button, input")?.focus({ preventScroll: true });
    return () => anterior?.focus?.({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (!onFechar) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onFechar();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [onFechar]);
  return (
    <>
      <div className="modal-fundo" onClick={onFechar} />
      <div className="modal-cartao" ref={ref}>
        {children}
      </div>
    </>
  );
}
