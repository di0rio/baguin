import { BALAO_MAX } from "@baguin/shared";
import { ArrowUp, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../../components/ui/input-group";
import { Kbd } from "../../components/ui/kbd";
import { cn } from "../../lib/utils";
import type { Sala } from "../sala";
import { horaCurta, useAte } from "./hooks";
import { VIDRO } from "./superficie";

const emCampo = (el: Element | null) => !!el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
/** a contagem só aparece perto do limite */
const PERTO = Math.floor(BALAO_MAX * 0.8);
const POSICAO = "absolute bottom-[5.5rem] left-1/2 z-10 -translate-x-1/2";

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
      <div className={cn(POSICAO, VIDRO, "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm")} role="status">
        <VolumeX className="size-4 text-muted-foreground" aria-hidden />
        Você está silenciado até {horaCurta(silenciadoAte)}
      </div>
    );
  }
  if (!aberto) return null;
  return (
    <form className={cn(POSICAO, "flex w-[min(30rem,calc(100%-1.5rem))] flex-col items-center gap-2")} onSubmit={enviar}>
      <InputGroup className={cn(VIDRO, "rounded-full has-focus-visible:border-ring")}>
        <InputGroupInput
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
        <InputGroupAddon align="inline-end" className="gap-2">
          {texto.length >= PERTO && (
            <span className={cn("text-xs tabular-nums text-muted-foreground", texto.length >= BALAO_MAX && "text-destructive-foreground")}>
              {texto.length}/{BALAO_MAX}
            </span>
          )}
          <Button type="submit" size="icon-sm" className="rounded-full" aria-label="Enviar Balão" disabled={!texto.trim()} onMouseDown={(e) => e.preventDefault()}>
            <ArrowUp />
          </Button>
        </InputGroupAddon>
      </InputGroup>
      <p className={cn(VIDRO, "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted-foreground")}>
        <Kbd>Enter</Kbd> envia <span aria-hidden>·</span> <Kbd>Esc</Kbd> fecha
      </p>
    </form>
  );
}
