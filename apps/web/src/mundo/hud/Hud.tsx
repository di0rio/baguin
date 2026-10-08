import type { EspacoDetalheDto } from "@baguin/shared";
import { ArrowLeft, BellOff, ChevronRight, Menu as MenuIcon, Mic, MicOff, MonitorSmartphone, UserPlus, Users, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { AlertDialog, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from "../../components/ui/alert-dialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuPopup,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Kbd } from "../../components/ui/kbd";
import { Sheet, SheetPopup } from "../../components/ui/sheet";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../../components/ui/tooltip";
import { toastManager } from "../../lib/toast";
import { cn } from "../../lib/utils";
import type { Sala } from "../sala";
import type { Voz } from "../voz";
import { CampoBalao } from "./CampoBalao";
import { useHud, useVoz } from "./hooks";
import { PainelConvites } from "./PainelConvites";
import { PainelMembros } from "./PainelMembros";
import { HUD } from "./superficie";

type Painel = "membros" | "convites";

const AVISO_MS = 7000;

/** Atalho que abre o menu (Não perturbe, Membros, Convites). */
const TECLA_MENU = "m";

const emCampo = (el: Element | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

/** Tecla apertada: afunda a 0,97 em 100 ms (sobrescreve a escala e a duração do Button). */
const TECLA = "size-11 rounded-full duration-100 motion-safe:active:scale-[0.97]";

/** Dica de um controle: texto e, se houver, a tecla de atalho. */
function Dica({ texto, atalho }: { texto: string; atalho?: string }) {
  return (
    <span className="flex items-center gap-2 py-0.5">
      {texto}
      {atalho && <Kbd>{atalho}</Kbd>}
    </span>
  );
}

export function Hud({ sala, voz, detalhe: inicial }: { sala: Sala; voz: Voz; detalhe: EspacoDetalheDto }) {
  const hud = useHud(sala);
  const vozEstado = useVoz(voz);
  const [detalhe, setDetalhe] = useState(inicial);
  const [painel, setPainel] = useState<Painel | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const meuPapel = detalhe.eu.papel;
  const podeConvidar = meuPapel === "dono" || meuPapel === "moderador";
  // o painel mantém o conteúdo enquanto anima a saída
  const ultimoPainel = useRef<Painel>("membros");
  if (painel) ultimoPainel.current = painel;
  const painelMostrado = painel ?? ultimoPainel.current;

  useEffect(() => sala.on("aviso", (texto) => void toastManager.add({ type: "info", title: texto, timeout: AVISO_MS })), [sala]);

  // "Entrando..." e "Reconectando..." ficam num toast fixo enquanto durarem
  const conectando = hud.status === "conectando" || hud.status === "reconectando";
  const reconectando = hud.status === "reconectando";
  useEffect(() => {
    if (!conectando) return;
    const id = toastManager.add({ type: "loading", title: reconectando ? "Conexão perdida. Reconectando…" : "Entrando no Espaço…", timeout: 0 });
    return () => toastManager.close(id);
  }, [conectando, reconectando]);

  // M abre o menu (fora de campos de texto; fechar é com Esc ou escolhendo um item)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== TECLA_MENU || e.ctrlKey || e.metaKey || e.altKey || e.repeat || emCampo(document.activeElement)) return;
      e.preventDefault();
      setMenuAberto(true);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  const atualizar = useCallback((d: EspacoDetalheDto) => setDetalhe(d), []);
  const alternar = (p: Painel) => setPainel((atual) => (atual === p ? null : p));

  const micLigado = vozEstado.microfone === "ligado";
  const falando = micLigado && vozEstado.falando.has(sala.contaId);
  const micDica = !vozEstado.disponivel ? (vozEstado.motivo ?? "Voz indisponível") : micLigado ? "Desligar o microfone" : "Ligar o microfone";
  const modal = hud.status === "outra-aba" ? "outra-aba" : hud.status === "desconectado" ? "desconectado" : null;
  // mantém o conteúdo do diálogo enquanto anima a saída
  const ultimoModal = useRef<"outra-aba" | "desconectado">("desconectado");
  if (modal) ultimoModal.current = modal;
  const modalMostrado = modal ?? ultimoModal.current;

  return (
    <div className="pointer-events-none absolute inset-0 text-foreground">
      <header className={cn(HUD, "pointer-events-auto absolute top-3 left-3 z-10 flex h-12 max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-full ps-1.5 pe-4")}>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" className="rounded-full" aria-label="Voltar aos Espaços" nativeButton={false} render={<Link to="/" />} />}>
            <ArrowLeft />
          </TooltipTrigger>
          <TooltipPopup side="bottom">Voltar aos Espaços</TooltipPopup>
        </Tooltip>
        <div className="ms-1 flex min-w-0 items-center gap-1.5 text-sm">
          <strong className="max-w-[22ch] truncate font-bold">{detalhe.espaco.nome}</strong>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 truncate font-medium text-muted-foreground">{hud.lugar?.nome ?? "…"}</span>
        </div>
        {hud.lugar && (
          <Badge variant={hud.lugar.ambiente === "foco" ? "default" : "outline"} className="ms-2 shrink-0" title="Ambiente do Lugar">
            {hud.lugar.ambiente === "foco" ? "Foco" : "Resenha"}
          </Badge>
        )}
      </header>

      <Sheet
        open={painel !== null}
        modal={false}
        disablePointerDismissal
        onOpenChange={(aberto, detalhes) => {
          if (aberto) return;
          // Esc fecha o painel, a menos que o campo de Balão já tenha tratado a tecla (menus e diálogos aninhados o Base UI resolve)
          if (detalhes.reason === "escape-key" && detalhes.event.defaultPrevented) return;
          setPainel(null);
        }}
      >
        <SheetPopup
          side="right"
          backdrop={false}
          viewportClassName="p-3 max-sm:pb-[5.75rem]"
          className={cn(HUD, "w-full max-w-sm self-start sm:w-[24rem]")}
          aria-label={painelMostrado === "convites" ? "Convites" : "Membros"}
        >
          {painelMostrado === "membros" && (
            <PainelMembros espacoId={detalhe.espaco.id} contaId={sala.contaId} meuPapel={meuPapel} presentes={hud.presentes} membros={detalhe.membros} onAtualizado={atualizar} />
          )}
          {painelMostrado === "convites" && podeConvidar && <PainelConvites espacoId={detalhe.espaco.id} />}
        </SheetPopup>
      </Sheet>

      <CampoBalao sala={sala} silenciadoAte={hud.silenciadoAte} />

      {/* fixos: só o microfone e o menu ao lado dele */}
      <div role="group" aria-label="Controles" className={cn(HUD, "pointer-events-auto absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full p-1.5")}>
        <Tooltip>
          <TooltipTrigger
            aria-label="Microfone"
            onClick={() => voz.alternarMicrofone()}
            render={
              <Button
                variant={micLigado ? "brand" : "ghost"}
                size="icon"
                aria-pressed={micLigado}
                disabled={!vozEstado.disponivel}
                data-falando={falando ? "" : undefined}
                data-voz-conectado={vozEstado.conectado}
                className={cn(TECLA, "relative data-falando:outline-2 data-falando:outline-offset-2 data-falando:outline-brand")}
              />
            }
          >
            {micLigado ? <Mic /> : <MicOff />}
            {vozEstado.conectado && <span className="absolute right-1 bottom-1 size-2 rounded-full bg-success ring-2 ring-papel dark:ring-background" title="Conectado à voz" />}
          </TooltipTrigger>
          <TooltipPopup side="top" sideOffset={10} className="max-w-64">
            <Dica texto={micDica} />
          </TooltipPopup>
        </Tooltip>

        <DropdownMenu open={menuAberto} onOpenChange={setMenuAberto}>
          <Tooltip>
            <TooltipTrigger
              aria-label="Menu"
              render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon" className={cn(TECLA, "relative")} />} />}
            >
              <MenuIcon />
              {hud.naoPerturbe && (
                <span className="absolute -top-0.5 -right-0.5 grid size-4.5 place-items-center rounded-full bg-foreground text-background ring-2 ring-papel dark:ring-background" title="Não perturbe ligado">
                  <BellOff className="size-2.5" />
                </span>
              )}
            </TooltipTrigger>
            <TooltipPopup side="top" sideOffset={10}>
              <Dica texto="Menu" atalho={TECLA_MENU.toUpperCase()} />
            </TooltipPopup>
          </Tooltip>
          <DropdownMenuPopup side="top" align="center" sideOffset={12} className={cn(HUD, "w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl p-1.5")}>
            <DropdownMenuCheckboxItem checked={hud.naoPerturbe} onCheckedChange={() => sala.alternarNaoPerturbe()} className="h-auto py-1.5">
              <span className="flex flex-col">
                <span>Não perturbe</span>
                <span className="text-muted-foreground text-xs">Ninguém te ouve nem vê seus Balões, e você não ouve ninguém.</span>
              </span>
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => alternar("membros")}>
              <Users />
              Membros
              {hud.presentes.length > 0 && (
                <DropdownMenuShortcut aria-label={`${hud.presentes.length} neste Lugar`} className="tabular-nums">
                  {hud.presentes.length}
                </DropdownMenuShortcut>
              )}
            </DropdownMenuItem>
            {podeConvidar && (
              <DropdownMenuItem onClick={() => alternar("convites")}>
                <UserPlus />
                Convites
              </DropdownMenuItem>
            )}
          </DropdownMenuPopup>
        </DropdownMenu>
      </div>

      {/* sem onOpenChange: o diálogo não fecha por Esc nem clique fora, só pela ação */}
      <AlertDialog open={modal !== null}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <span className={cn("mb-1 grid size-10 place-items-center rounded-full", modalMostrado === "desconectado" ? "bg-destructive/10 text-destructive-foreground" : "bg-muted text-foreground")}>
              {modalMostrado === "desconectado" ? <WifiOff className="size-5" /> : <MonitorSmartphone className="size-5" />}
            </span>
            <AlertDialogTitle>{modalMostrado === "desconectado" ? "sem conexão" : "você entrou em outra aba"}</AlertDialogTitle>
            <AlertDialogDescription>{modalMostrado === "desconectado" ? "Não consegui voltar ao Espaço." : "Este Avatar só pode estar em um lugar por vez."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="brand" autoFocus onClick={() => sala.reconectar()}>
              {modalMostrado === "desconectado" ? "Tentar de novo" : "Reconectar aqui"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}
