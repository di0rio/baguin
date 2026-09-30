import type { EspacoDetalheDto, MembroDto, Papel } from "@baguin/shared";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import type { Presente } from "../sala";
import { horaCurta } from "./hooks";

type Acao = { tipo: "remover" | "banir"; membro: MembroDto };

const MINUTOS = [5, 15, 60];
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
  const podeAgir = (m: MembroDto) =>
    moderador && m.contaId !== contaId && m.papel !== "dono" && (meuPapel === "dono" || m.papel === null);
  const agora = Date.now();

  return (
    <aside className="painel" aria-label="Membros">
      <header className="painel-topo">
        <h2>Membros</h2>
        <button className="fantasma" onClick={onFechar} aria-label="Fechar painel">
          ✕
        </button>
      </header>
      {erro && <p className="erro">{erro}</p>}

      <h3>Neste Lugar ({presentes.length})</h3>
      <ul className="simples">
        {presentes.map((p) => (
          <li key={p.contaId} className="linha-membro">
            <span className="ponto ligado" />
            <span className="nome-membro">
              {p.nome}
              {p.contaId === contaId && <span className="etiqueta"> (você)</span>}
            </span>
            {p.naoPerturbe && <span title="Não perturbe">🔕</span>}
            {p.silenciadoAte > agora && <span title="Silenciado">🔇</span>}
          </li>
        ))}
      </ul>

      <h3>Todos os Membros ({membros.length})</h3>
      <ul className="simples">
        {membros.map((m) => {
          const bloqueado = bloqueados.has(m.contaId);
          const silenciadoAte = m.silenciadoAte ? new Date(m.silenciadoAte).getTime() : 0;
          const pergunta = confirmar?.membro.contaId === m.contaId ? confirmar : null;
          return (
            <li key={m.contaId} className="membro">
              <div className="linha-membro">
                <span className={`ponto ${aqui.has(m.contaId) ? "ligado" : ""}`} title={aqui.has(m.contaId) ? "Neste Lugar" : ""} />
                <span className="nome-membro">
                  {m.nome}
                  {m.contaId === contaId && <span className="etiqueta"> (você)</span>}
                </span>
                {rotuloPapel(m.papel) && <span className="selo papel">{rotuloPapel(m.papel)}</span>}
                {silenciadoAte > agora && <span className="etiqueta">🔇 até {horaCurta(silenciadoAte)}</span>}
              </div>
              {m.contaId !== contaId && (
                <div className="acoes">
                  <button
                    className="fantasma"
                    disabled={ocupado}
                    onClick={() => void executar(() => (bloqueado ? api.desbloquear(m.contaId) : api.bloquear(m.contaId)))}
                  >
                    {bloqueado ? "Desbloquear" : "Bloquear"}
                  </button>
                  {meuPapel === "dono" && m.papel !== "dono" && (
                    <button
                      className="fantasma"
                      disabled={ocupado}
                      onClick={() => void executar(() => api.definirPapel(espacoId, m.contaId, m.papel === "moderador" ? null : "moderador"))}
                    >
                      {m.papel === "moderador" ? "Remover Moderador" : "Tornar Moderador"}
                    </button>
                  )}
                  {podeAgir(m) && (
                    <>
                      <label className="silenciar">
                        <span className="sr-only">Silenciar {m.nome}</span>
                        <select
                          disabled={ocupado}
                          value=""
                          aria-label={`Silenciar ${m.nome}`}
                          onChange={(e) => {
                            const min = Number(e.target.value);
                            if (min) void executar(() => api.silenciar(espacoId, m.contaId, min));
                          }}
                        >
                          <option value="">Silenciar…</option>
                          {MINUTOS.map((min) => (
                            <option key={min} value={min}>
                              {min} min
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="fantasma perigo" disabled={ocupado} onClick={() => setConfirmar({ tipo: "remover", membro: m })}>
                        Remover
                      </button>
                      <button className="fantasma perigo" disabled={ocupado} onClick={() => setConfirmar({ tipo: "banir", membro: m })}>
                        Banir
                      </button>
                    </>
                  )}
                </div>
              )}
              {pergunta && (
                <div className="confirmar" role="alertdialog" aria-label="Confirmação">
                  <p>
                    {pergunta.tipo === "remover"
                      ? `Remover ${m.nome} do Espaço? Ele poderá voltar com um novo Convite.`
                      : `Banir ${m.nome}? Ele não poderá voltar a este Espaço.`}
                  </p>
                  <div className="acoes">
                    <button
                      className="primario"
                      disabled={ocupado}
                      onClick={() =>
                        void executar(() => (pergunta.tipo === "remover" ? api.remover(espacoId, m.contaId) : api.banir(espacoId, m.contaId)))
                      }
                    >
                      {pergunta.tipo === "remover" ? "Remover" : "Banir"}
                    </button>
                    <button className="fantasma" onClick={() => setConfirmar(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
