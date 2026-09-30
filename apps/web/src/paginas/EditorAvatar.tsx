import { CATALOGO, PECAS_PADRAO, type Direcao, type Pecas } from "@baguin/shared";
import { ChevronLeft, ChevronRight, Dices, Footprints, RotateCw } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "../api";
import { AvatarCanvas } from "../avatar/AvatarCanvas";
import { aleatorio } from "../avatar/aleatorio";
import { PALETAS, ORDEM_DIRECOES } from "../avatar/renderizar";
import { caminhoSeguro } from "../auth";
import { Erro, Pagina } from "../componentes";
import { AvatarMini } from "../ui/AvatarMini";
import { useSessao } from "../sessao";

const NOME_DIRECAO: Record<Direcao, string> = { baixo: "frente", esquerda: "esquerda", direita: "direita", cima: "costas" };
const NOME_CABELO: Record<string, string> = {
  careca: "Careca",
  curto: "Curto",
  moicano: "Moicano",
  longo: "Longo",
  rabo: "Rabo de cavalo",
  blackpower: "Black power",
};
const NOME_ROUPA: Record<string, string> = { camiseta: "Camiseta", moletom: "Moletom", regata: "Regata" };
const NOME_ACESSORIO: Record<string, string> = {
  nenhum: "Nenhum",
  oculos: "Óculos",
  bone: "Boné",
  fone: "Fone",
  chapeu: "Chapéu",
};

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="grupo" role="group" aria-labelledby={id}>
      <span id={id} className="grupo-titulo">
        {titulo}
      </span>
      {children}
    </div>
  );
}

function Cores({ paleta, valor, onEscolher, rotulo }: { paleta: readonly string[]; valor: number; onEscolher: (i: number) => void; rotulo: string }) {
  return (
    <div className="cores" role="radiogroup" aria-label={rotulo}>
      {paleta.map((cor, i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={valor === i}
          aria-label={`${rotulo} ${i + 1}`}
          className={valor === i ? "cor ativa" : "cor"}
          style={{ background: cor }}
          onClick={() => onEscolher(i)}
        />
      ))}
    </div>
  );
}

/** Opções de estilo com uma miniatura de cada uma, desenhada pelo renderizador com as peças atuais. */
function Opcoes<T extends string>({
  opcoes,
  valor,
  nomes,
  onEscolher,
  miniatura,
  corte,
}: {
  opcoes: readonly T[];
  valor: T;
  nomes: Record<string, string>;
  onEscolher: (v: T) => void;
  miniatura: (o: T) => Pecas;
  corte: "cabeca" | "torso";
}) {
  return (
    <div className="opcoes">
      {opcoes.map((o) => (
        <button key={o} type="button" className="chip" aria-pressed={valor === o} onClick={() => onEscolher(o)}>
          <span className="chip-foto">
            <AvatarMini pecas={miniatura(o)} escala={3} corte={corte} />
          </span>
          {nomes[o]}
        </button>
      ))}
    </div>
  );
}

/** Escala do preview: menor em telas estreitas. */
function useEscala() {
  const [escala, setEscala] = useState(() => (window.innerWidth < 640 ? 8 : 10));
  useEffect(() => {
    const f = () => setEscala(window.innerWidth < 640 ? 8 : 10);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return escala;
}

export function EditorAvatar() {
  const { eu, recarregar } = useSessao();
  const nav = useNavigate();
  const [busca] = useSearchParams();
  const voltar = caminhoSeguro(busca.get("voltar"));
  const primeiraVez = !eu?.avatar;
  const [pecas, setPecas] = useState<Pecas>(() => eu?.avatar ?? PECAS_PADRAO);
  const [dir, setDir] = useState<Direcao>("baixo");
  const [girando, setGirando] = useState(true);
  const [andando, setAndando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const escala = useEscala();

  // A pré-visualização gira sozinha até a pessoa escolher uma direção.
  useEffect(() => {
    if (!girando) return;
    const id = setInterval(() => setDir((d) => ORDEM_DIRECOES[(ORDEM_DIRECOES.indexOf(d) + 1) % ORDEM_DIRECOES.length]), 1800);
    return () => clearInterval(id);
  }, [girando]);

  const escolherDir = (d: Direcao) => {
    setGirando(false);
    setDir(d);
  };
  const passoDir = (n: number) => {
    const i = (ORDEM_DIRECOES.indexOf(dir) + n + ORDEM_DIRECOES.length) % ORDEM_DIRECOES.length;
    escolherDir(ORDEM_DIRECOES[i]);
  };

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      await api.salvarAvatar(pecas);
      await recarregar();
      nav(voltar, { replace: true });
    } catch (e) {
      setErro((e as Error).message);
      setSalvando(false);
    }
  }

  return (
    <Pagina>
      <div className="titulo-pagina">
        <h1>{primeiraVez ? "Monte seu Avatar" : "Seu Avatar"}</h1>
        <p className="lead">{primeiraVez ? "É assim que a galera vai te ver por aí. Dá pra mudar depois." : "Mude o visual quando quiser. A galera vê na hora."}</p>
      </div>
      <div className="editor">
        <div className="cartao palco">
          <div className="palco-visor">
            <AvatarCanvas pecas={pecas} dir={dir} andando={andando} escala={escala} />
          </div>
          <div className="palco-controles">
            <button type="button" className="icone redondo" aria-label="Direção anterior" onClick={() => passoDir(-1)}>
              <ChevronLeft size={20} strokeWidth={2} aria-hidden />
            </button>
            <span className="palco-dir" aria-live="polite">
              {NOME_DIRECAO[dir]}
            </span>
            <button type="button" className="icone redondo" aria-label="Próxima direção" onClick={() => passoDir(1)}>
              <ChevronRight size={20} strokeWidth={2} aria-hidden />
            </button>
          </div>
          <div className="segmentos palco-opcoes">
            <button type="button" className="segmento" aria-pressed={girando} onClick={() => setGirando((v) => !v)}>
              <RotateCw size={16} strokeWidth={2} aria-hidden />
              Girar
            </button>
            <button type="button" className="segmento" aria-pressed={andando} onClick={() => setAndando((v) => !v)}>
              <Footprints size={16} strokeWidth={2} aria-hidden />
              Andar
            </button>
          </div>
        </div>

        <div className="cartao controles">
          <Grupo titulo="Pele">
            <Cores rotulo="Tom de pele" paleta={PALETAS.pele} valor={pecas.pele} onEscolher={(pele) => setPecas({ ...pecas, pele })} />
          </Grupo>
          <Grupo titulo="Cabelo">
            <Opcoes
              opcoes={CATALOGO.cabeloEstilos}
              nomes={NOME_CABELO}
              valor={pecas.cabelo.estilo}
              corte="cabeca"
              miniatura={(estilo) => ({ ...pecas, cabelo: { ...pecas.cabelo, estilo } })}
              onEscolher={(estilo) => setPecas({ ...pecas, cabelo: { ...pecas.cabelo, estilo } })}
            />
            <Cores rotulo="Cor do cabelo" paleta={PALETAS.cabelo} valor={pecas.cabelo.cor} onEscolher={(cor) => setPecas({ ...pecas, cabelo: { ...pecas.cabelo, cor } })} />
          </Grupo>
          <Grupo titulo="Roupa">
            <Opcoes
              opcoes={CATALOGO.roupaEstilos}
              nomes={NOME_ROUPA}
              valor={pecas.roupa.estilo}
              corte="torso"
              miniatura={(estilo) => ({ ...pecas, roupa: { ...pecas.roupa, estilo } })}
              onEscolher={(estilo) => setPecas({ ...pecas, roupa: { ...pecas.roupa, estilo } })}
            />
            <Cores rotulo="Cor da roupa" paleta={PALETAS.roupa} valor={pecas.roupa.cor} onEscolher={(cor) => setPecas({ ...pecas, roupa: { ...pecas.roupa, cor } })} />
          </Grupo>
          <Grupo titulo="Calça">
            <Cores rotulo="Cor da calça" paleta={PALETAS.calca} valor={pecas.calca} onEscolher={(calca) => setPecas({ ...pecas, calca })} />
          </Grupo>
          <Grupo titulo="Acessório">
            <Opcoes
              opcoes={CATALOGO.acessorios}
              nomes={NOME_ACESSORIO}
              valor={pecas.acessorio}
              corte="cabeca"
              miniatura={(acessorio) => ({ ...pecas, acessorio })}
              onEscolher={(acessorio) => setPecas({ ...pecas, acessorio })}
            />
          </Grupo>

          {erro && (
            <div style={{ marginTop: 16 }}>
              <Erro>{erro}</Erro>
            </div>
          )}
          <div className="acoes">
            <button type="button" className="secundario" onClick={() => setPecas(aleatorio())}>
              <Dices size={18} strokeWidth={2} aria-hidden />
              Aleatório
            </button>
            <button type="button" className="primario" onClick={() => void salvar()} disabled={salvando}>
              {primeiraVez ? "Pronto, vamos lá" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </Pagina>
  );
}
