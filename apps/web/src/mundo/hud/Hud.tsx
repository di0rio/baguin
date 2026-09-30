import type { EspacoDetalheDto } from "@baguin/shared";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import type { Sala } from "../sala";
import type { Voz } from "../voz";
import { CampoBalao } from "./CampoBalao";
import { useHud, useVoz } from "./hooks";
import { PainelConvites } from "./PainelConvites";
import { PainelMembros } from "./PainelMembros";

type Painel = "membros" | "convites" | null;
type Aviso = { id: number; texto: string };

export function Hud({ sala, voz, detalhe: inicial }: { sala: Sala; voz: Voz; detalhe: EspacoDetalheDto }) {
  const hud = useHud(sala);
  const vozEstado = useVoz(voz);
  const [detalhe, setDetalhe] = useState(inicial);
  const [painel, setPainel] = useState<Painel>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const meuPapel = detalhe.eu.papel;
  const podeConvidar = meuPapel === "dono" || meuPapel === "moderador";

  useEffect(
    () =>
      sala.on("aviso", (texto) => {
        const id = Date.now() + Math.random();
        setAvisos((a) => [...a, { id, texto }]);
        setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 7000);
      }),
    [sala],
  );

  const atualizar = useCallback((d: EspacoDetalheDto) => setDetalhe(d), []);
  const alternar = (p: Exclude<Painel, null>) => setPainel((atual) => (atual === p ? null : p));

  return (
    <div className="hud">
      <header className="hud-topo">
        <Link to="/" className="fantasma">
          ← Espaços
        </Link>
        <div className="hud-titulo">
          <strong className="hud-espaco">{detalhe.espaco.nome}</strong>
          <span className="hud-lugar">{hud.lugar?.nome ?? "…"}</span>
          {hud.lugar && (
            <span className={`selo ${hud.lugar.ambiente}`} title="Ambiente do Lugar">
              {hud.lugar.ambiente === "foco" ? "Foco" : "Resenha"}
            </span>
          )}
        </div>
        <div className="hud-acoes">
          <button
            className={`secundario ${vozEstado.microfone === "ligado" ? "ativo" : ""}`}
            disabled={!vozEstado.disponivel}
            aria-pressed={vozEstado.microfone === "ligado"}
            title={vozEstado.motivo ?? "Ligar/desligar o microfone"}
            data-voz-conectado={vozEstado.conectado}
            onClick={() => voz.alternarMicrofone()}
          >
            {vozEstado.conectado && <span className="voz-ponto" title="Conectado à voz" />}
            {vozEstado.microfone === "ligado" ? "🎙️ Mic ligado" : "🎙️ Mic mudo"}
            {vozEstado.motivo && <small className="voz-motivo"> · {vozEstado.motivo}</small>}
          </button>
          <button
            className={`secundario ${hud.naoPerturbe ? "ativo" : ""}`}
            aria-pressed={hud.naoPerturbe}
            onClick={() => sala.alternarNaoPerturbe()}
            title="Ninguém te ouve nem vê seus Balões, e você não ouve ninguém"
          >
            🔕 Não perturbe
          </button>
          <button className={`secundario ${painel === "membros" ? "ativo" : ""}`} onClick={() => alternar("membros")}>
            👥 Membros
          </button>
          {podeConvidar && (
            <button className={`secundario ${painel === "convites" ? "ativo" : ""}`} onClick={() => alternar("convites")}>
              ✉️ Convites
            </button>
          )}
        </div>
      </header>

      <div className="hud-corpo">
        {painel === "membros" && (
          <PainelMembros
            espacoId={detalhe.espaco.id}
            contaId={sala.contaId}
            meuPapel={meuPapel}
            presentes={hud.presentes}
            membros={detalhe.membros}
            onAtualizado={atualizar}
            onFechar={() => setPainel(null)}
          />
        )}
        {painel === "convites" && podeConvidar && <PainelConvites espacoId={detalhe.espaco.id} onFechar={() => setPainel(null)} />}

        <div className="avisos" role="status" aria-live="polite">
          {avisos.map((a) => (
            <div key={a.id} className="aviso">
              {a.texto}
            </div>
          ))}
      </div>

      <CampoBalao sala={sala} silenciadoAte={hud.silenciadoAte} />

      {hud.status === "conectando" && <p className="hud-status">Entrando no Espaço…</p>}
      {hud.status === "reconectando" && <p className="hud-status">Conexão perdida. Reconectando…</p>}
      </div>
      {hud.status === "outra-aba" && (
        <div className="hud-modal">
          <div className="cartao">
            <h2>Você entrou em outra aba</h2>
            <p>Este Avatar só pode estar em um lugar por vez.</p>
            <button className="primario" onClick={() => sala.reconectar()}>
              Reconectar aqui
            </button>
          </div>
        </div>
      )}
      {hud.status === "desconectado" && (
        <div className="hud-modal">
          <div className="cartao">
            <h2>Sem conexão</h2>
            <p>Não consegui voltar ao Espaço.</p>
            <button className="primario" onClick={() => sala.reconectar()}>
              Tentar de novo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
