import { BALAO_MAX } from "@baguin/shared";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Sala } from "../sala";
import { horaCurta, useAte } from "./hooks";

const emCampo = (el: Element | null) => !!el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);

/** Campo de Balão: Enter abre/envia, Esc fecha. Enquanto aberto a atividade é "digitando". */
export function CampoBalao({ sala, silenciadoAte }: { sala: Sala; silenciadoAte: number }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const silenciado = useAte(silenciadoAte);

  // Enter abre o campo (se nenhum outro campo tem o foco)
  useEffect(() => {
    if (aberto || silenciado) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || emCampo(document.activeElement)) return;
      e.preventDefault();
      setAberto(true);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberto, silenciado]);

  useEffect(() => {
    if (!aberto) return;
    sala.setDigitando(true);
    ref.current?.focus();
    return () => sala.setDigitando(false);
  }, [aberto, sala]);

  // silenciado no meio da digitação: fecha
  useEffect(() => {
    if (silenciado) setAberto(false);
  }, [silenciado]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (t && sala.enviarBalao(t)) setTexto("");
    if (t) setAberto(false);
  }

  if (silenciado) {
    return (
      <div className="balao-campo dica silenciado" role="status">
        🔇 Você está silenciado até {horaCurta(silenciadoAte)}
      </div>
    );
  }
  if (!aberto) {
    return (
      <button className="balao-campo dica" onClick={() => setAberto(true)}>
        <kbd>Enter</kbd> para falar
      </button>
    );
  }
  return (
    <form className="balao-campo" onSubmit={enviar}>
      <input
        ref={ref}
        value={texto}
        maxLength={BALAO_MAX}
        placeholder="Diga algo pra quem está perto..."
        aria-label="Balão"
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setTexto("");
            setAberto(false);
          }
        }}
        onBlur={() => setAberto(false)}
      />
      <span className="etiqueta">Enter envia · Esc fecha</span>
    </form>
  );
}
