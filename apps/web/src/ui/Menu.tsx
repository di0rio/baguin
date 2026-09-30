import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Presenca } from "./presenca";

type Props = {
  /** conteúdo do botão que abre o menu */
  gatilho: ReactNode;
  rotulo: string;
  className?: string;
  /** o menu segue o tema do contexto: claro (páginas) ou escuro (HUD) */
  tema?: "claro" | "escuro";
  desabilitado?: boolean;
  children: (fechar: () => void) => ReactNode;
};

type Pos = { top?: number; bottom?: number; right: number; origem: string };

/**
 * Menu em popover: abre no portal (não é cortado por painéis com rolagem), escala a partir do
 * gatilho (origem acompanha o lado para onde abre), fecha com Esc, clique fora ou ao escolher um item.
 */
export function Menu({ gatilho, rotulo, className = "", tema = "claro", desabilitado, children }: Props) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<Pos>({ right: 0, origem: "top right" });
  const botao = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const fechar = () => setAberto(false);

  useLayoutEffect(() => {
    if (!aberto || !botao.current) return;
    const r = botao.current.getBoundingClientRect();
    const right = Math.max(8, window.innerWidth - r.right);
    const abaixo = window.innerHeight - r.bottom;
    // sem espaço embaixo: abre para cima
    setPos(abaixo < 200 && r.top > abaixo ? { bottom: window.innerHeight - r.top + 6, right, origem: "bottom right" } : { top: r.bottom + 6, right, origem: "top right" });
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (!pop.current?.contains(alvo) && !botao.current?.contains(alvo)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setAberto(false);
        botao.current?.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const itens = [...(pop.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])];
        if (!itens.length) return;
        e.preventDefault();
        const i = itens.indexOf(document.activeElement as HTMLElement);
        itens[(i + (e.key === "ArrowDown" ? 1 : -1) + itens.length) % itens.length].focus();
      }
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  // foca o primeiro item ao abrir por teclado
  useEffect(() => {
    if (aberto) requestAnimationFrame(() => pop.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true }));
  }, [aberto]);

  return (
    <>
      <button
        ref={botao}
        type="button"
        className={className}
        aria-label={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        disabled={desabilitado}
        onClick={() => setAberto((v) => !v)}
      >
        {gatilho}
      </button>
      {createPortal(
        <Presenca aberto={aberto} ms={180} className={`menu ${tema === "escuro" ? "chrome" : ""}`} role="menu" aria-label={rotulo}>
          <MenuConteudo pos={pos} refPop={pop}>
            {children(fechar)}
          </MenuConteudo>
        </Presenca>,
        document.body,
      )}
    </>
  );
}

function MenuConteudo({ pos, refPop, children }: { pos: Pos; refPop: React.RefObject<HTMLDivElement | null>; children: ReactNode }) {
  return (
    <div ref={refPop} className="menu-corpo" style={{ top: pos.top, bottom: pos.bottom, right: pos.right, transformOrigin: pos.origem }}>
      {children}
    </div>
  );
}
