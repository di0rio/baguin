import { BALAO_MAX } from "@baguin/shared";
import { ArrowUp, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Sala } from "../sala";
import { horaCurta, useAte } from "./hooks";

const emCampo = (el: Element | null) => !!el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
/** a contagem só aparece perto do limite */
const PERTO = Math.floor(BALAO_MAX * 0.8);

/**
 * Campo de Balão: Enter abre/envia, Esc fecha. Enquanto aberto a atividade é "digitando".
 * Abre na hora (sem animação): quem aperta Enter já está com a mão no teclado.
 * O estado `aberto` vive no Hud porque o botão da barra também abre o campo.
 */
export function CampoBalao({
  sala,
  silenciadoAte,
  aberto,
  setAberto,
}: {
  sala: Sala;
  silenciadoAte: number;
  aberto: boolean;
  setAberto: (v: boolean) => void;
}) {
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
  }, [aberto, silenciado, setAberto]);

  useEffect(() => {
    if (!aberto) return;
    sala.setDigitando(true);
    ref.current?.focus();
    return () => sala.setDigitando(false);
  }, [aberto, sala]);

  // silenciado no meio da digitação: fecha
  useEffect(() => {
    if (silenciado) setAberto(false);
  }, [silenciado, setAberto]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (t && sala.enviarBalao(t)) setTexto("");
    if (t) setAberto(false);
  }

  if (silenciado) {
    return (
      <div className="balao-aviso vidro" role="status">
        <VolumeX size={16} strokeWidth={2} aria-hidden />
        Você está silenciado até {horaCurta(silenciadoAte)}
      </div>
    );
  }
  if (!aberto) return null;
  return (
    <form className="balao-campo vidro" onSubmit={enviar}>
      <div className="balao-linha">
        <input
          ref={ref}
          value={texto}
          maxLength={BALAO_MAX}
          placeholder="Diga algo pra quem está perto..."
          aria-label="Balão"
          autoComplete="off"
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
        {texto.length >= PERTO && (
          <span className="balao-contagem" data-limite={texto.length >= BALAO_MAX}>
            {texto.length}/{BALAO_MAX}
          </span>
        )}
        <button type="submit" className="balao-enviar" aria-label="Enviar Balão" disabled={!texto.trim()} onMouseDown={(e) => e.preventDefault()}>
          <ArrowUp size={18} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
      <p className="balao-dica">
        <kbd>Enter</kbd> envia <span aria-hidden>·</span> <kbd>Esc</kbd> fecha
      </p>
    </form>
  );
}
