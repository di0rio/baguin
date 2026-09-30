import { useEffect, useRef, useState, type ReactNode } from "react";

const ATRASO_MS = 350;
/** janela em que a próxima dica aparece na hora (quem já está explorando a barra não espera) */
const JANELA_MS = 400;
let fechouEm = 0;
let abertas = 0;

/**
 * Tooltip acima do gatilho. Aparece após um atraso no hover (só com mouse) ou no foco de teclado;
 * se outra dica acabou de fechar, aparece sem atraso e sem animação. Transição de 180ms a partir do gatilho.
 */
export function Dica({ texto, atalho, children, className = "" }: { texto: ReactNode; atalho?: string; children: ReactNode; className?: string }) {
  const [aberta, setAberta] = useState(false);
  const [instantanea, setInstantanea] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const contada = useRef(false);

  const fechar = () => {
    clearTimeout(timer.current);
    setAberta(false);
    if (contada.current) {
      contada.current = false;
      abertas--;
      fechouEm = Date.now();
    }
  };
  const abrir = (imediato = false) => {
    clearTimeout(timer.current);
    const pular = imediato || abertas > 0 || Date.now() - fechouEm < JANELA_MS;
    const mostrar = () => {
      setInstantanea(pular);
      setAberta(true);
      if (!contada.current) {
        contada.current = true;
        abertas++;
      }
    };
    if (pular) mostrar();
    else timer.current = setTimeout(mostrar, ATRASO_MS);
  };

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberta]);
  // desmontar com a dica aberta não pode deixar o contador preso
  useEffect(
    () => () => {
      if (contada.current) abertas--;
    },
    [],
  );

  return (
    <span
      className={`dica-gatilho ${className}`}
      onPointerEnter={(e) => e.pointerType === "mouse" && abrir()}
      onPointerLeave={fechar}
      onPointerDown={fechar}
      onFocus={(e) => e.target.matches(":focus-visible") && abrir(true)}
      onBlur={fechar}
    >
      {children}
      <span role="tooltip" className="dica" data-aberta={aberta} data-instantanea={instantanea}>
        {texto}
        {atalho && <kbd>{atalho}</kbd>}
      </span>
    </span>
  );
}
