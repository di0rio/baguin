import { BALAO_MAX } from "@baguin/shared";
import { ArrowUp, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Kbd } from "../../components/ui/kbd";
import { cn } from "../../lib/utils";
import type { Sala } from "../sala";
import { horaCurta, useAte } from "./hooks";
import { HUD } from "./superficie";

const emCampo = (el: Element | null) => !!el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
/** a contagem só aparece perto do limite */
const PERTO = Math.floor(BALAO_MAX * 0.8);
const POSICAO = "absolute bottom-[5.5rem] left-1/2 z-10 -translate-x-1/2";

/**
 * Campo de Balão: Enter abre/envia, Esc fecha. Enquanto aberto a atividade é "digitando".
 * Abre na hora (sem animação e sem botão): quem aperta Enter já está com a mão no teclado.
 */
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
      <div className={cn(POSICAO, HUD, "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm")} role="status">
        <VolumeX className="size-4 text-muted-foreground" aria-hidden />
        Você está silenciado até {horaCurta(silenciadoAte)}
      </div>
    );
  }
  if (!aberto) return null;
  return (
    <form className={cn(POSICAO, "flex w-[min(30rem,calc(100%-1.5rem))] flex-col items-center gap-2")} onSubmit={enviar}>
      <div className={cn(HUD, "flex w-full items-center gap-2 rounded-full ps-4 pe-1.5 py-1.5 focus-within:ring-2 focus-within:ring-ring")}>
        <Input
          ref={ref}
          value={texto}
          maxLength={BALAO_MAX}
          placeholder="Diga algo pra quem está perto..."
          aria-label="Balão"
          autoComplete="off"
          className="h-8 rounded-none border-0 bg-transparent px-0 focus-visible:ring-0"
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
          <span className={cn("shrink-0 text-muted-foreground text-xs tabular-nums", texto.length >= BALAO_MAX && "text-destructive-foreground")}>
            {texto.length}/{BALAO_MAX}
          </span>
        )}
        <Button type="submit" variant="brand" size="icon-sm" className="shrink-0 rounded-full" aria-label="Enviar Balão" disabled={!texto.trim()} onMouseDown={(e) => e.preventDefault()}>
          <ArrowUp />
        </Button>
      </div>
      <p className={cn(HUD, "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-muted-foreground text-xs")}>
        <Kbd>Enter</Kbd> envia <span aria-hidden>·</span> <Kbd>Esc</Kbd> fecha
      </p>
    </form>
  );
}
