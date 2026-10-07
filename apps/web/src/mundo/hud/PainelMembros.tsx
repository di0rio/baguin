import type { EspacoDetalheDto, MembroDto, Papel } from "@baguin/shared";
import { Ban, BellOff, MoreHorizontal, Shield, ShieldOff, UserCheck, UserMinus, UserX, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { AvatarBolha } from "../../components/avatar-mini";
import { Erro } from "../../components/erro";
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from "../../components/ui/alert-dialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "../../components/ui/menu";
import { SheetDescription, SheetHeader, SheetPanel, SheetTitle } from "../../components/ui/sheet";
import { cn } from "../../lib/utils";
import type { Presente } from "../sala";
import { horaCurta } from "./hooks";

type Acao = { tipo: "remover" | "banir"; membro: MembroDto };

const MINUTOS = [5, 15, 60];
const rotuloMin = (min: number) => (min === 60 ? "1 hora" : `${min} min`);
const rotuloPapel = (p: Papel) => (p === "dono" ? "Dono" : p === "moderador" ? "Moderador" : null);

type Props = {
  espacoId: string;
  contaId: string;
  meuPapel: Papel;
  presentes: Presente[];
  /** chamado com os dados frescos do Espaço (Membros e Papel) */
  onAtualizado: (d: EspacoDetalheDto) => void;
  membros: MembroDto[];
};

/** Painel de Membros: quem está no Lugar, todos os Membros e as ações permitidas ao Papel. */
export function PainelMembros({ espacoId, contaId, meuPapel, presentes, membros, onAtualizado }: Props) {
  const [bloqueados, setBloqueados] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState<Acao | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const moderador = meuPapel === "dono" || meuPapel === "moderador";
  // mantém o texto da confirmação enquanto o diálogo anima a saída
  const ultima = useRef<Acao | null>(null);
  if (confirmar) ultima.current = confirmar;
  const mostrar = confirmar ?? ultima.current;

  const recarregar = useCallback(async () => {
    const [d, b] = await Promise.all([api.espaco(espacoId), api.bloqueios()]);
    onAtualizado(d);
    setBloqueados(new Set(b.contaIds));
  }, [espacoId, onAtualizado]);

  // atualiza ao abrir
  useEffect(() => {
    recarregar().catch((e: Error) => setErro(e.message));
  }, [recarregar]);

  async function executar(fn: () => Promise<unknown>) {
    setErro("");
    setOcupado(true);
    try {
      await fn();
      await recarregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
      setConfirmar(null);
    }
  }

  const aqui = new Map(presentes.map((p) => [p.contaId, p]));
  const podeAgir = (m: MembroDto) => moderador && m.contaId !== contaId && m.papel !== "dono" && (meuPapel === "dono" || m.papel === null);
  const agora = Date.now();

  return (
    <>
      <SheetHeader className="p-5 pb-3">
        <SheetTitle>Membros</SheetTitle>
        <SheetDescription>Quem está aqui agora e quem faz parte do Espaço.</SheetDescription>
      </SheetHeader>
      <SheetPanel className="flex flex-col gap-6 p-5 pt-2">
        {erro && <Erro>{erro}</Erro>}

        <section aria-label="Neste Lugar" className="flex flex-col gap-1">
          <h3 className="pb-1 text-sm font-semibold">Neste Lugar · {presentes.length}</h3>
          <ul className="flex flex-col">
            {presentes.map((p) => (
              <li key={p.contaId} className="flex items-center gap-3 py-1.5">
                <span className="relative">
                  <AvatarBolha pecas={p.pecas} nome={p.nome} tamanho={36} />
                  <span className={cn("absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-popover", p.naoPerturbe ? "bg-destructive" : "bg-success")} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {p.nome}
                    {p.contaId === contaId && <span className="font-normal text-muted-foreground"> (você)</span>}
                  </span>
                  {(p.naoPerturbe || p.silenciadoAte > agora) && (
                    <span className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                      {p.naoPerturbe && (
                        <span className="inline-flex items-center gap-1">
                          <BellOff className="size-3" aria-hidden /> Não perturbe
                        </span>
                      )}
                      {p.silenciadoAte > agora && (
                        <span className="inline-flex items-center gap-1">
                          <VolumeX className="size-3" aria-hidden /> Silenciado
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Todos os Membros" className="flex flex-col gap-1">
          <h3 className="pb-1 text-sm font-semibold">Todos · {membros.length}</h3>
          <ul className="flex flex-col">
            {membros.map((m) => {
              const bloqueado = bloqueados.has(m.contaId);
              const silenciadoAte = m.silenciadoAte ? new Date(m.silenciadoAte).getTime() : 0;
              const presente = aqui.get(m.contaId);
              const papel = rotuloPapel(m.papel);
              const agir = podeAgir(m);
              const donoAtribui = meuPapel === "dono" && m.papel !== "dono";
              const temMenu = m.contaId !== contaId;
              return (
                <li key={m.contaId} className="flex items-center gap-3 py-1.5">
                  <span className="relative">
                    <AvatarBolha pecas={presente?.pecas} nome={m.nome} tamanho={36} />
                    {presente && <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-popover bg-success" title="Neste Lugar" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {m.nome}
                      {m.contaId === contaId && <span className="font-normal text-muted-foreground"> (você)</span>}
                    </span>
                    {(papel || silenciadoAte > agora || bloqueado) && (
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {papel && <Badge variant={m.papel === "dono" ? "default" : "outline"}>{papel}</Badge>}
                        {silenciadoAte > agora && (
                          <span className="inline-flex items-center gap-1">
                            <VolumeX className="size-3" aria-hidden /> até {horaCurta(silenciadoAte)}
                          </span>
                        )}
                        {bloqueado && (
                          <span className="inline-flex items-center gap-1">
                            <UserX className="size-3" aria-hidden /> Bloqueado
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  {temMenu && (
                    <Menu>
                      <MenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Ações para ${m.nome}`} disabled={ocupado} />}>
                        <MoreHorizontal />
                      </MenuTrigger>
                      <MenuPopup align="end" className="min-w-52">
                        <MenuItem onClick={() => void executar(() => (bloqueado ? api.desbloquear(m.contaId) : api.bloquear(m.contaId)))}>
                          {bloqueado ? <UserCheck className="size-4 opacity-70" /> : <UserX className="size-4 opacity-70" />}
                          {bloqueado ? "Desbloquear" : "Bloquear"}
                        </MenuItem>
                        {donoAtribui && (
                          <MenuItem onClick={() => void executar(() => api.definirPapel(espacoId, m.contaId, m.papel === "moderador" ? null : "moderador"))}>
                            {m.papel === "moderador" ? <ShieldOff className="size-4 opacity-70" /> : <Shield className="size-4 opacity-70" />}
                            {m.papel === "moderador" ? "Remover Moderador" : "Tornar Moderador"}
                          </MenuItem>
                        )}
                        {agir && (
                          <>
                            <MenuSeparator />
                            <MenuGroup>
                              <MenuGroupLabel>Silenciar por</MenuGroupLabel>
                              {MINUTOS.map((min) => (
                                <MenuItem key={min} onClick={() => void executar(() => api.silenciar(espacoId, m.contaId, min))}>
                                  <VolumeX className="size-4 opacity-70" />
                                  {rotuloMin(min)}
                                </MenuItem>
                              ))}
                            </MenuGroup>
                            <MenuSeparator />
                            <MenuItem variant="destructive" onClick={() => setConfirmar({ tipo: "remover", membro: m })}>
                              <UserMinus className="size-4" />
                              Remover do Espaço
                            </MenuItem>
                            <MenuItem variant="destructive" onClick={() => setConfirmar({ tipo: "banir", membro: m })}>
                              <Ban className="size-4" />
                              Banir
                            </MenuItem>
                          </>
                        )}
                      </MenuPopup>
                    </Menu>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </SheetPanel>

      <AlertDialog open={confirmar !== null} onOpenChange={(aberto) => !aberto && setConfirmar(null)}>
        <AlertDialogPopup>
          {mostrar && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{mostrar.tipo === "remover" ? `Remover ${mostrar.membro.nome}?` : `Banir ${mostrar.membro.nome}?`}</AlertDialogTitle>
                <AlertDialogDescription>
                  {mostrar.tipo === "remover"
                    ? `${mostrar.membro.nome} sai do Espaço, mas poderá voltar com um novo Convite.`
                    : `${mostrar.membro.nome} sai do Espaço e não poderá voltar.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogClose render={<Button variant="outline" />}>Cancelar</AlertDialogClose>
                <Button
                  variant="destructive"
                  loading={ocupado}
                  onClick={() => void executar(() => (mostrar.tipo === "remover" ? api.remover(espacoId, mostrar.membro.contaId) : api.banir(espacoId, mostrar.membro.contaId)))}
                >
                  {mostrar.tipo === "remover" ? "Remover" : "Banir"}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
