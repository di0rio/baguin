import type { ConviteDto } from "@baguin/shared";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../api";

const link = (codigo: string) => `${window.location.origin}/convite/${codigo}`;

/** Painel de Convites (Dono/Moderador): gerar, copiar link, revogar. */
export function PainelConvites({ espacoId, onFechar }: { espacoId: string; onFechar: () => void }) {
  const [convites, setConvites] = useState<ConviteDto[] | null>(null);
  const [horas, setHoras] = useState(24);
  const [usosMax, setUsosMax] = useState(5);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState("");

  const carregar = useCallback(() => {
    api.convites(espacoId).then(setConvites, (e: Error) => setErro(e.message));
  }, [espacoId]);
  useEffect(carregar, [carregar]);

  async function criar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    try {
      await api.criarConvite(espacoId, horas, usosMax);
      carregar();
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(link(codigo));
      setCopiado(codigo);
      setTimeout(() => setCopiado(""), 2000);
    } catch {
      setErro("Não deu para copiar. Selecione o link e copie manualmente.");
    }
  }

  async function revogar(codigo: string) {
    try {
      await api.revogarConvite(codigo);
      carregar();
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  return (
    <aside className="painel" aria-label="Convites">
      <header className="painel-topo">
        <h2>Convites</h2>
        <button className="fantasma" onClick={onFechar} aria-label="Fechar painel">
          ✕
        </button>
      </header>
      {erro && <p className="erro">{erro}</p>}

      <form className="form" onSubmit={(e) => void criar(e)}>
        <div className="linha-form">
          <label>
            Validade (horas)
            <input type="number" min={1} max={720} value={horas} onChange={(e) => setHoras(Number(e.target.value))} />
          </label>
          <label>
            Usos
            <input type="number" min={1} max={100} value={usosMax} onChange={(e) => setUsosMax(Number(e.target.value))} />
          </label>
        </div>
        <button className="primario">Gerar Convite</button>
      </form>

      <h3>Ativos</h3>
      {convites && convites.length === 0 && <p className="vazio">Nenhum Convite ativo.</p>}
      <ul className="simples">
        {convites?.map((c) => (
          <li key={c.codigo} className="convite-item">
            <code className="convite-link">{link(c.codigo)}</code>
            <span className="etiqueta">
              {c.usos}/{c.usosMax} usos · expira {new Date(c.expiraEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </span>
            <div className="acoes">
              <button className="fantasma" onClick={() => void copiar(c.codigo)}>
                {copiado === c.codigo ? "Copiado!" : "Copiar link"}
              </button>
              <button className="fantasma perigo" onClick={() => void revogar(c.codigo)}>
                Revogar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
