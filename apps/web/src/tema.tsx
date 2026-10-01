import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const CHAVE = "baguin-tema";

type Tema = { escuro: boolean; alternar: () => void };
const Ctx = createContext<Tema | null>(null);

const lerEscuro = () => document.documentElement.classList.contains("dark");

/** Claro por padrão; a escolha fica só neste navegador. O index.html aplica a classe antes da primeira pintura. */
export function TemaProvider({ children }: { children: ReactNode }) {
  const [escuro, setEscuro] = useState(lerEscuro);

  const alternar = useCallback(() => {
    const raiz = document.documentElement;
    const proximo = !raiz.classList.contains("dark");
    // sem transições espalhadas durante a troca
    raiz.dataset.trocandoTema = "";
    raiz.classList.toggle("dark", proximo);
    requestAnimationFrame(() => requestAnimationFrame(() => delete raiz.dataset.trocandoTema));
    try {
      localStorage.setItem(CHAVE, proximo ? "dark" : "light");
    } catch {
      /* armazenamento bloqueado: a troca vale só nesta sessão */
    }
    setEscuro(proximo);
  }, []);

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", escuro ? "#0d0d0d" : "#f5f5f5");
  }, [escuro]);

  const valor = useMemo(() => ({ escuro, alternar }), [escuro, alternar]);
  return <Ctx value={valor}>{children}</Ctx>;
}

export function useTema() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTema fora do TemaProvider");
  return v;
}
