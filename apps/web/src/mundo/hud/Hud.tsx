import type { EspacoDetalheDto } from "@baguin/shared";
import { ArrowLeft, Bell, BellOff, ChevronRight, Info, Loader2, Mic, MicOff, MessageCircle, MonitorSmartphone, UserPlus, Users, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Dica } from "../../ui/Dica";
import { Modal } from "../../ui/Modal";
import { Presenca } from "../../ui/presenca";
import type { Sala } from "../sala";
import type { Voz } from "../voz";
import { CampoBalao } from "./CampoBalao";
import { horaCurta, useAte, useHud, useVoz } from "./hooks";
import { PainelConvites } from "./PainelConvites";
import { PainelMembros } from "./PainelMembros";

type Painel = "membros" | "convites" | null;
type Aviso = { id: number; texto: string; vivo: boolean };

const AVISO_MS = 7000;
const SAIDA_MS = 240;

/** Botão redondo da barra de controle, com dica. */
function Controle({
  rotulo,
  dica,
  atalho,
  tom,
  ...props
}: {
  rotulo: string;
  dica: ReactNode;
  atalho?: string;
  tom?: "perigo";
  children: ReactNode;
  disabled?: boolean;
  "aria-pressed"?: boolean;
  "aria-expanded"?: boolean;
  onClick: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  "data-voz-conectado"?: boolean;
}) {
  return (
    <Dica texto={dica} atalho={atalho}>
      <button type="button" className="ctl" data-tom={tom} aria-label={rotulo} {...props} />
    </Dica>
  );
}

export function Hud({ sala, voz, detalhe: inicial }: { sala: Sala; voz: Voz; detalhe: EspacoDetalheDto }) {
  const hud = useHud(sala);
  const vozEstado = useVoz(voz);
  const [detalhe, setDetalhe] = useState(inicial);
  const [painel, setPainel] = useState<Painel>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [balaoAberto, setBalaoAberto] = useState(false);
  const meuPapel = detalhe.eu.papel;
  const podeConvidar = meuPapel === "dono" || meuPapel === "moderador";
  const silenciado = useAte(hud.silenciadoAte);

  useEffect(
    () =>
      sala.on("aviso", (texto) => {
        const id = Date.now() + Math.random();
        setAvisos((a) => [...a, { id, texto, vivo: true }]);
        // sai pelo mesmo lado por onde entrou, depois some da lista
        setTimeout(() => setAvisos((a) => a.map((x) => (x.id === id ? { ...x, vivo: false } : x))), AVISO_MS);
        setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), AVISO_MS + SAIDA_MS + 60);
      }),
    [sala],
  );

  // Esc fecha o painel (a menos que um menu, modal ou o campo de Balão já tenha tratado a tecla)
  useEffect(() => {
    if (!painel) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) setPainel(null);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [painel]);

  const atualizar = useCallback((d: EspacoDetalheDto) => setDetalhe(d), []);
  const alternar = (p: Exclude<Painel, null>) => setPainel((atual) => (atual === p ? null : p));

  const micLigado = vozEstado.microfone === "ligado";
  const micDica = !vozEstado.disponivel ? (vozEstado.motivo ?? "Voz indisponível") : micLigado ? "Desligar o microfone" : "Ligar o microfone";
  const modal = hud.status === "outra-aba" ? "outra-aba" : hud.status === "desconectado" ? "desconectado" : null;
  const conectando = hud.status === "conectando" || hud.status === "reconectando";

  return (
    <div className="hud chrome">
      <header className="hud-topo vidro">
        <Dica texto="Voltar aos Espaços" className="hud-voltar-dica">
          <Link to="/" className="ctl pequeno" aria-label="Voltar aos Espaços">
            <ArrowLeft size={18} strokeWidth={2} aria-hidden />
          </Link>
        </Dica>
        <div className="hud-titulo">
          <strong className="hud-espaco">{detalhe.espaco.nome}</strong>
          <ChevronRight size={14} strokeWidth={2} className="hud-sep" aria-hidden />
          <span className="hud-lugar">{hud.lugar?.nome ?? "…"}</span>
        </div>
        {hud.lugar && (
          <span className={`selo ${hud.lugar.ambiente}`} title="Ambiente do Lugar">
            {hud.lugar.ambiente === "foco" ? "Foco" : "Resenha"}
          </span>
        )}
      </header>

      <div className="hud-avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <Presenca key={a.id} aberto={a.vivo} ms={SAIDA_MS} className="toast vidro">
            <Info size={18} strokeWidth={2} aria-hidden />
            <span>{a.texto}</span>
          </Presenca>
        ))}
        <Presenca aberto={conectando} ms={SAIDA_MS} className="toast vidro">
          <Loader2 size={18} strokeWidth={2} className="giro-icone" aria-hidden />
          <span>{hud.status === "reconectando" ? "Conexão perdida. Reconectando…" : "Entrando no Espaço…"}</span>
        </Presenca>
      </div>

      <Presenca aberto={painel !== null} ms={SAIDA_MS} className="painel vidro" role="complementary" aria-label={painel === "convites" ? "Convites" : "Membros"}>
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
      </Presenca>

      <CampoBalao sala={sala} silenciadoAte={hud.silenciadoAte} aberto={balaoAberto} setAberto={setBalaoAberto} />

      <nav className="hud-barra vidro" aria-label="Controles">
        <Controle
          rotulo="Microfone"
          dica={micDica}
          disabled={!vozEstado.disponivel}
          aria-pressed={micLigado}
          tom={vozEstado.disponivel && !micLigado ? "perigo" : undefined}
          data-voz-conectado={vozEstado.conectado}
          onClick={() => voz.alternarMicrofone()}
        >
          {micLigado ? <Mic size={20} strokeWidth={2} aria-hidden /> : <MicOff size={20} strokeWidth={2} aria-hidden />}
          {vozEstado.conectado && <span className="voz-ponto" title="Conectado à voz" />}
        </Controle>
        <Controle
          rotulo="Não perturbe"
          dica="Não perturbe: ninguém te ouve nem vê seus Balões, e você não ouve ninguém"
          aria-pressed={hud.naoPerturbe}
          tom={hud.naoPerturbe ? "perigo" : undefined}
          onClick={() => sala.alternarNaoPerturbe()}
        >
          {hud.naoPerturbe ? <BellOff size={20} strokeWidth={2} aria-hidden /> : <Bell size={20} strokeWidth={2} aria-hidden />}
        </Controle>

        <span className="ctl-sep" aria-hidden />

        <Controle
          rotulo="Balão"
          dica={silenciado ? `Você está silenciado até ${horaCurta(hud.silenciadoAte)}` : "Falar em um Balão"}
          atalho={silenciado ? undefined : "Enter"}
          disabled={silenciado}
          aria-pressed={balaoAberto}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setBalaoAberto((v) => !v)}
        >
          <MessageCircle size={20} strokeWidth={2} aria-hidden />
        </Controle>
        <Controle rotulo="Membros" dica="Membros" aria-expanded={painel === "membros"} onClick={() => alternar("membros")}>
          <Users size={20} strokeWidth={2} aria-hidden />
          {hud.presentes.length > 0 && <span className="ctl-contagem">{hud.presentes.length}</span>}
        </Controle>
        {podeConvidar && (
          <Controle rotulo="Convites" dica="Convites" aria-expanded={painel === "convites"} onClick={() => alternar("convites")}>
            <UserPlus size={20} strokeWidth={2} aria-hidden />
          </Controle>
        )}
      </nav>

      <Modal aberto={modal !== null} titulo={modal === "desconectado" ? "Sem conexão" : "Você entrou em outra aba"}>
        {modal === "desconectado" ? (
          <>
            <span className="estado-icone perigo-suave">
              <WifiOff size={26} strokeWidth={2} aria-hidden />
            </span>
            <h2>Sem conexão</h2>
            <p>Não consegui voltar ao Espaço.</p>
            <div className="modal-acoes">
              <button className="primario" onClick={() => sala.reconectar()}>
                Tentar de novo
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="estado-icone">
              <MonitorSmartphone size={26} strokeWidth={2} aria-hidden />
            </span>
            <h2>Você entrou em outra aba</h2>
            <p>Este Avatar só pode estar em um lugar por vez.</p>
            <div className="modal-acoes">
              <button className="primario" onClick={() => sala.reconectar()}>
                Reconectar aqui
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
