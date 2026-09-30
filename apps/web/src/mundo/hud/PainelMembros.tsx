import type { EspacoDetalheDto, MembroDto, Papel } from "@baguin/shared";
import { Ban, BellOff, MoreHorizontal, Shield, ShieldOff, UserMinus, UserX, UserCheck, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { AvatarBolha } from "../../ui/AvatarMini";
import { Menu } from "../../ui/Menu";
import { Modal } from "../../ui/Modal";
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
  onFechar: () => void;
};

/** Painel de Membros: quem está no Lugar, todos os Membros e as ações permitidas ao Papel. */
export function PainelMembros({ espacoId, contaId, meuPapel, presentes, membros, onAtualizado, onFechar }: Props) {
  const [bloqueados, setBloqueados] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState<Acao | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const moderador = meuPapel === "dono" || meuPapel === "moderador";

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
      <header className="painel-topo">
        <h2>Membros</h2>
        <button type="button" className="icone pequeno sem-borda" onClick={onFechar} aria-label="Fechar painel">
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </header>
      <div className="painel-corpo">
        {erro && (
          <p className="alerta" role="alert">
            {erro}
          </p>
        )}

        <section aria-label="Neste Lugar">
          <h3>Neste Lugar · {presentes.length}</h3>
          <ul className="simples">
            {presentes.map((p) => (
              <li key={p.contaId} className="linha-membro">
                <span className="avatar-status">
                  <AvatarBolha pecas={p.pecas} nome={p.nome} />
                  <span className={`status ${p.naoPerturbe ? "np" : "on"}`} />
                </span>
                <span className="membro-info">
                  <span className="nome-membro">
                    {p.nome}
                    {p.contaId === contaId && <span className="texto-2"> (você)</span>}
                  </span>
                  {(p.naoPerturbe || p.silenciadoAte > agora) && (
                    <span className="membro-sub">
                      {p.naoPerturbe && (
                        <span className="sub-item">
                          <BellOff size={12} strokeWidth={2} aria-hidden /> Não perturbe
                        </span>
                      )}
                      {p.silenciadoAte > agora && (
                        <span className="sub-item">
                          <VolumeX size={12} strokeWidth={2} aria-hidden /> Silenciado
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Todos os Membros">
          <h3>Todos · {membros.length}</h3>
          <ul className="simples">
            {membros.map((m) => {
              const bloqueado = bloqueados.has(m.contaId);
              const silenciadoAte = m.silenciadoAte ? new Date(m.silenciadoAte).getTime() : 0;
              const presente = aqui.get(m.contaId);
              const papel = rotuloPapel(m.papel);
              const agir = podeAgir(m);
              const donoAtribui = meuPapel === "dono" && m.papel !== "dono";
              const temMenu = m.contaId !== contaId;
              return (
                <li key={m.contaId} className="linha-membro">
                  <span className="avatar-status">
                    <AvatarBolha pecas={presente?.pecas} nome={m.nome} />
                    {presente && <span className="status on" title="Neste Lugar" />}
                  </span>
                  <span className="membro-info">
                    <span className="nome-membro">
                      {m.nome}
                      {m.contaId === contaId && <span className="texto-2"> (você)</span>}
                    </span>
                    {(papel || silenciadoAte > agora || bloqueado) && (
                      <span className="membro-sub">
                        {papel && <span className="selo papel">{papel}</span>}
                        {silenciadoAte > agora && (
                          <span className="sub-item">
                            <VolumeX size={12} strokeWidth={2} aria-hidden /> até {horaCurta(silenciadoAte)}
                          </span>
                        )}
                        {bloqueado && (
                          <span className="sub-item">
                            <UserX size={12} strokeWidth={2} aria-hidden /> Bloqueado
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  {temMenu && (
                    <Menu rotulo={`Ações para ${m.nome}`} tema="escuro" desabilitado={ocupado} className="icone pequeno sem-borda" gatilho={<MoreHorizontal size={18} strokeWidth={2} aria-hidden />}>
                      {(fechar) => (
                        <>
                          <button
                            role="menuitem"
                            className="menu-item"
                            onClick={() => {
                              fechar();
                              void executar(() => (bloqueado ? api.desbloquear(m.contaId) : api.bloquear(m.contaId)));
                            }}
                          >
                            {bloqueado ? <UserCheck size={18} strokeWidth={2} aria-hidden /> : <UserX size={18} strokeWidth={2} aria-hidden />}
                            {bloqueado ? "Desbloquear" : "Bloquear"}
                          </button>
                          {donoAtribui && (
                            <button
                              role="menuitem"
                              className="menu-item"
                              onClick={() => {
                                fechar();
                                void executar(() => api.definirPapel(espacoId, m.contaId, m.papel === "moderador" ? null : "moderador"));
                              }}
                            >
                              {m.papel === "moderador" ? <ShieldOff size={18} strokeWidth={2} aria-hidden /> : <Shield size={18} strokeWidth={2} aria-hidden />}
                              {m.papel === "moderador" ? "Remover Moderador" : "Tornar Moderador"}
                            </button>
                          )}
                          {agir && (
                            <>
                              <div className="menu-sep" role="separator" />
                              <div className="menu-titulo">Silenciar por</div>
                              {MINUTOS.map((min) => (
                                <button
                                  key={min}
                                  role="menuitem"
                                  className="menu-item"
                                  onClick={() => {
                                    fechar();
                                    void executar(() => api.silenciar(espacoId, m.contaId, min));
                                  }}
                                >
                                  <VolumeX size={18} strokeWidth={2} aria-hidden />
                                  {rotuloMin(min)}
                                </button>
                              ))}
                              <div className="menu-sep" role="separator" />
                              <button
                                role="menuitem"
                                className="menu-item perigo-item"
                                onClick={() => {
                                  fechar();
                                  setConfirmar({ tipo: "remover", membro: m });
                                }}
                              >
                                <UserMinus size={18} strokeWidth={2} aria-hidden />
                                Remover do Espaço
                              </button>
                              <button
                                role="menuitem"
                                className="menu-item perigo-item"
                                onClick={() => {
                                  fechar();
                                  setConfirmar({ tipo: "banir", membro: m });
                                }}
                              >
                                <Ban size={18} strokeWidth={2} aria-hidden />
                                Banir
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </Menu>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <Modal aberto={confirmar !== null} titulo="Confirmação" onFechar={() => setConfirmar(null)}>
        {confirmar && (
          <>
            <span className="estado-icone perigo-suave">{confirmar.tipo === "remover" ? <UserMinus size={26} strokeWidth={2} aria-hidden /> : <Ban size={26} strokeWidth={2} aria-hidden />}</span>
            <h2>{confirmar.tipo === "remover" ? `Remover ${confirmar.membro.nome}?` : `Banir ${confirmar.membro.nome}?`}</h2>
            <p>
              {confirmar.tipo === "remover"
                ? `${confirmar.membro.nome} sai do Espaço, mas poderá voltar com um novo Convite.`
                : `${confirmar.membro.nome} sai do Espaço e não poderá voltar.`}
            </p>
            <div className="modal-acoes">
              <button className="secundario" data-foco-inicial onClick={() => setConfirmar(null)}>
                Cancelar
              </button>
              <button
                className="perigo"
                disabled={ocupado}
                onClick={() => void executar(() => (confirmar.tipo === "remover" ? api.remover(espacoId, confirmar.membro.contaId) : api.banir(espacoId, confirmar.membro.contaId)))}
              >
                {confirmar.tipo === "remover" ? "Remover" : "Banir"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
