import type { EspacoDetalheDto } from "@baguin/shared";
import { ArrowLeft, Bell, BellOff, ChevronRight, Mic, MicOff, MessageCircle, MonitorSmartphone, UserPlus, Users, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Link } from "react-router";
import { AlertDialog, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from "../../components/ui/alert-dialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Kbd } from "../../components/ui/kbd";
import { Sheet, SheetPopup } from "../../components/ui/sheet";
import { toastManager } from "../../components/ui/toast";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "../../components/ui/toolbar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../../components/ui/tooltip";
import { cn } from "../../lib/utils";
import type { Sala } from "../sala";
import type { Voz } from "../voz";
import { CampoBalao } from "./CampoBalao";
import { horaCurta, useAte, useHud, useVoz } from "./hooks";
import { PainelConvites } from "./PainelConvites";
import { PainelMembros } from "./PainelMembros";
import { VIDRO } from "./superficie";

type Painel = "membros" | "convites";

const AVISO_MS = 7000;

/** Botão redondo da barra de controle, com dica (e atalho, quando houver). */
function Controle({
  rotulo,
  dica,
  atalho,
  tom,
  children,
  className,
  ...props
}: {
  rotulo: string;
  dica: ReactNode;
  atalho?: string;
  /** mic mudo e Não perturbe: tom de alerta */
  tom?: "perigo";
  children: ReactNode;
} & Omit<ComponentProps<typeof Button>, "children">) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <ToolbarButton
            render={
              <Button
                variant="ghost"
                size="icon-xl"
                aria-label={rotulo}
                data-tom={tom}
                className={cn(
                  "relative rounded-full aria-expanded:bg-accent aria-pressed:bg-accent data-[tom=perigo]:bg-destructive/12 data-[tom=perigo]:text-destructive-foreground hover:data-[tom=perigo]:bg-destructive/20",
                  className,
                )}
                {...props}
              />
            }
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup side="top" sideOffset={10} className="max-w-64">
        <span className="flex items-center gap-2 py-0.5">
          {dica}
          {atalho && <Kbd>{atalho}</Kbd>}
        </span>
      </TooltipPopup>
    </Tooltip>
  );
}

export function Hud({ sala, voz, detalhe: inicial }: { sala: Sala; voz: Voz; detalhe: EspacoDetalheDto }) {
  const hud = useHud(sala);
  const vozEstado = useVoz(voz);
  const [detalhe, setDetalhe] = useState(inicial);
  const [painel, setPainel] = useState<Painel | null>(null);
  const [balaoAberto, setBalaoAberto] = useState(false);
  const meuPapel = detalhe.eu.papel;
  const podeConvidar = meuPapel === "dono" || meuPapel === "moderador";
  const silenciado = useAte(hud.silenciadoAte);
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

  // Esc fecha o painel (a menos que um menu, diálogo ou o campo de Balão já tenha tratado a tecla)
  useEffect(() => {
    if (!painel) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) setPainel(null);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [painel]);

  const atualizar = useCallback((d: EspacoDetalheDto) => setDetalhe(d), []);
  const alternar = (p: Painel) => setPainel((atual) => (atual === p ? null : p));

  const micLigado = vozEstado.microfone === "ligado";
  const micDica = !vozEstado.disponivel ? (vozEstado.motivo ?? "Voz indisponível") : micLigado ? "Desligar o microfone" : "Ligar o microfone";
  const modal = hud.status === "outra-aba" ? "outra-aba" : hud.status === "desconectado" ? "desconectado" : null;
  // mantém o conteúdo do diálogo enquanto anima a saída
  const ultimoModal = useRef<"outra-aba" | "desconectado">("desconectado");
  if (modal) ultimoModal.current = modal;
  const modalMostrado = modal ?? ultimoModal.current;

  return (
    <div className="pointer-events-none absolute inset-0 text-foreground">
      <header className={cn(VIDRO, "pointer-events-auto absolute top-3 left-3 z-10 flex h-12 max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-full ps-1.5 pe-4")}>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" className="rounded-full" aria-label="Voltar aos Espaços" render={<Link to="/" />} />}>
            <ArrowLeft />
          </TooltipTrigger>
          <TooltipPopup side="bottom">Voltar aos Espaços</TooltipPopup>
        </Tooltip>
        <div className="ms-1 flex min-w-0 items-center gap-1.5 text-sm">
          <strong className="max-w-[22ch] truncate font-semibold">{detalhe.espaco.nome}</strong>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 truncate font-medium text-muted-foreground">{hud.lugar?.nome ?? "…"}</span>
        </div>
        {hud.lugar && (
          <Badge variant={hud.lugar.ambiente === "foco" ? "warning" : "success"} size="lg" className="ms-2 shrink-0" title="Ambiente do Lugar">
            {hud.lugar.ambiente === "foco" ? "Foco" : "Resenha"}
          </Badge>
        )}
      </header>

      <Sheet
        open={painel !== null}
        modal={false}
        disablePointerDismissal
        onOpenChange={(aberto, detalhes) => {
          // o Esc é tratado acima, depois que menus, diálogos e o campo de Balão tiverem a vez
          if (!aberto && detalhes.reason !== "escape-key") setPainel(null);
        }}
      >
        <SheetPopup
          side="right"
          variant="inset"
          backdrop={false}
          viewportClassName="p-3 max-sm:pb-[5.75rem]"
          className={cn(VIDRO, "w-full max-w-sm self-start bg-background/90 sm:w-[24rem]")}
          aria-label={painelMostrado === "convites" ? "Convites" : "Membros"}
        >
          {painelMostrado === "membros" && (
            <PainelMembros espacoId={detalhe.espaco.id} contaId={sala.contaId} meuPapel={meuPapel} presentes={hud.presentes} membros={detalhe.membros} onAtualizado={atualizar} />
          )}
          {painelMostrado === "convites" && podeConvidar && <PainelConvites espacoId={detalhe.espaco.id} />}
        </SheetPopup>
      </Sheet>

      <CampoBalao sala={sala} silenciadoAte={hud.silenciadoAte} aberto={balaoAberto} setAberto={setBalaoAberto} />

      <Toolbar aria-label="Controles" className={cn(VIDRO, "pointer-events-auto absolute bottom-4 left-1/2 z-10 -translate-x-1/2 items-center gap-1 rounded-full bg-background/80 p-1.5")}>
        <Controle
          rotulo="Microfone"
          dica={micDica}
          disabled={!vozEstado.disponivel}
          aria-pressed={micLigado}
          tom={vozEstado.disponivel && !micLigado ? "perigo" : undefined}
          data-voz-conectado={vozEstado.conectado}
          onClick={() => voz.alternarMicrofone()}
        >
          {micLigado ? <Mic /> : <MicOff />}
          {vozEstado.conectado && <span className="absolute right-1.5 bottom-1.5 size-2 rounded-full bg-success ring-2 ring-background" title="Conectado à voz" />}
        </Controle>
        <Controle
          rotulo="Não perturbe"
          dica="Não perturbe: ninguém te ouve nem vê seus Balões, e você não ouve ninguém"
          aria-pressed={hud.naoPerturbe}
          tom={hud.naoPerturbe ? "perigo" : undefined}
          onClick={() => sala.alternarNaoPerturbe()}
        >
          {hud.naoPerturbe ? <BellOff /> : <Bell />}
        </Controle>

        <ToolbarSeparator className="mx-1" />

        <Controle
          rotulo="Balão"
          dica={silenciado ? `Você está silenciado até ${horaCurta(hud.silenciadoAte)}` : "Falar em um Balão"}
          atalho={silenciado ? undefined : "Enter"}
          disabled={silenciado}
          aria-pressed={balaoAberto}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setBalaoAberto((v) => !v)}
        >
          <MessageCircle />
        </Controle>
        <Controle rotulo="Membros" dica="Membros" aria-expanded={painel === "membros"} onClick={() => alternar("membros")}>
          <Users />
          {hud.presentes.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[0.6875rem] font-semibold text-primary-foreground tabular-nums ring-2 ring-background">
              {hud.presentes.length}
            </span>
          )}
        </Controle>
        {podeConvidar && (
          <Controle rotulo="Convites" dica="Convites" aria-expanded={painel === "convites"} onClick={() => alternar("convites")}>
            <UserPlus />
          </Controle>
        )}
      </Toolbar>

      {/* sem onOpenChange: o diálogo não fecha por Esc nem clique fora, só pela ação */}
      <AlertDialog open={modal !== null}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <span className={cn("mb-1 grid size-10 place-items-center rounded-full", modalMostrado === "desconectado" ? "bg-destructive/10 text-destructive-foreground" : "bg-primary/10 text-primary")}>
              {modalMostrado === "desconectado" ? <WifiOff className="size-5" /> : <MonitorSmartphone className="size-5" />}
            </span>
            <AlertDialogTitle>{modalMostrado === "desconectado" ? "Sem conexão" : "Você entrou em outra aba"}</AlertDialogTitle>
            <AlertDialogDescription>{modalMostrado === "desconectado" ? "Não consegui voltar ao Espaço." : "Este Avatar só pode estar em um lugar por vez."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button autoFocus onClick={() => sala.reconectar()}>
              {modalMostrado === "desconectado" ? "Tentar de novo" : "Reconectar aqui"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}
