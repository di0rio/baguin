import type { ConviteDto } from "@baguin/shared";
import { Check, Copy, Link2, Plus, Trash2, X } from "lucide-react";
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
    <>
      <header className="painel-topo">
        <h2>Convites</h2>
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

        <form className="form" onSubmit={(e) => void criar(e)}>
          <div className="grade-campos">
            <label>
              Validade (horas)
              <input type="number" min={1} max={720} value={horas} onChange={(e) => setHoras(Number(e.target.value))} />
            </label>
            <label>
              Usos
              <input type="number" min={1} max={100} value={usosMax} onChange={(e) => setUsosMax(Number(e.target.value))} />
            </label>
          </div>
          <button className="primario cheio">
            <Plus size={18} strokeWidth={2} aria-hidden />
            Gerar Convite
          </button>
        </form>

        <section aria-label="Convites ativos">
          <h3>Ativos{convites ? ` · ${convites.length}` : ""}</h3>
          {convites && convites.length === 0 && (
            <div className="painel-vazio">
              <Link2 size={20} strokeWidth={2} aria-hidden />
              <p>Nenhum Convite ativo. Gere um e mande o link pra quem você quer chamar.</p>
            </div>
          )}
          <ul className="simples convites-lista">
            {convites?.map((c) => (
              <li key={c.codigo} className="convite-item">
                <code className="convite-link">{link(c.codigo)}</code>
                <span className="convite-meta">
                  {c.usos}/{c.usosMax} usos · expira {new Date(c.expiraEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </span>
                <div className="convite-acoes">
                  <button type="button" className="secundario pequeno copiar" data-copiado={copiado === c.codigo} onClick={() => void copiar(c.codigo)}>
                    <span className="copiar-estado copiar-normal">
                      <Copy size={16} strokeWidth={2} aria-hidden /> Copiar link
                    </span>
                    <span className="copiar-estado copiar-ok" aria-live="polite">
                      <Check size={16} strokeWidth={2.25} aria-hidden /> Copiado!
                    </span>
                  </button>
                  <button type="button" className="fantasma perigo pequeno" onClick={() => void revogar(c.codigo)}>
                    <Trash2 size={16} strokeWidth={2} aria-hidden />
                    Revogar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
