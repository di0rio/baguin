import { CATALOGO, PECAS_PADRAO, type Direcao, type Pecas } from "@baguin/shared";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "../api";
import { AvatarCanvas } from "../avatar/AvatarCanvas";
import { aleatorio } from "../avatar/aleatorio";
import { PALETAS, ORDEM_DIRECOES } from "../avatar/renderizar";
import { caminhoSeguro } from "../auth";
import { Erro, Pagina } from "../componentes";
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
  return (
    <fieldset className="grupo">
      <legend>{titulo}</legend>
      {children}
    </fieldset>
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

function Opcoes<T extends string>({ opcoes, valor, nomes, onEscolher }: { opcoes: readonly T[]; valor: T; nomes: Record<string, string>; onEscolher: (v: T) => void }) {
  return (
    <div className="opcoes">
      {opcoes.map((o) => (
        <button key={o} type="button" className={valor === o ? "chip ativo" : "chip"} aria-pressed={valor === o} onClick={() => onEscolher(o)}>
          {nomes[o]}
        </button>
      ))}
    </div>
  );
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
      <h1>{primeiraVez ? "Monte seu Avatar" : "Seu Avatar"}</h1>
      {primeiraVez && <p className="etiqueta">É assim que a galera vai te ver por aí. Dá pra mudar depois.</p>}
      <div className="editor">
        <div className="cartao palco">
          <div className="palco-visor">
            <AvatarCanvas pecas={pecas} dir={dir} andando={andando} escala={10} />
          </div>
          <div className="palco-controles">
            <button type="button" className="icone" aria-label="Direção anterior" onClick={() => passoDir(-1)}>
              ◀
            </button>
            <span className="palco-dir">{NOME_DIRECAO[dir]}</span>
            <button type="button" className="icone" aria-label="Próxima direção" onClick={() => passoDir(1)}>
              ▶
            </button>
          </div>
          <div className="opcoes centro">
            <button type="button" className={girando ? "chip ativo" : "chip"} aria-pressed={girando} onClick={() => setGirando((v) => !v)}>
              Girar
            </button>
            <button type="button" className={andando ? "chip ativo" : "chip"} aria-pressed={andando} onClick={() => setAndando((v) => !v)}>
              Andar
            </button>
          </div>
        </div>

        <div className="cartao controles">
          <Grupo titulo="Pele">
            <Cores rotulo="Tom de pele" paleta={PALETAS.pele} valor={pecas.pele} onEscolher={(pele) => setPecas({ ...pecas, pele })} />
          </Grupo>
          <Grupo titulo="Cabelo">
            <Opcoes opcoes={CATALOGO.cabeloEstilos} nomes={NOME_CABELO} valor={pecas.cabelo.estilo} onEscolher={(estilo) => setPecas({ ...pecas, cabelo: { ...pecas.cabelo, estilo } })} />
            <Cores rotulo="Cor do cabelo" paleta={PALETAS.cabelo} valor={pecas.cabelo.cor} onEscolher={(cor) => setPecas({ ...pecas, cabelo: { ...pecas.cabelo, cor } })} />
          </Grupo>
          <Grupo titulo="Roupa">
            <Opcoes opcoes={CATALOGO.roupaEstilos} nomes={NOME_ROUPA} valor={pecas.roupa.estilo} onEscolher={(estilo) => setPecas({ ...pecas, roupa: { ...pecas.roupa, estilo } })} />
            <Cores rotulo="Cor da roupa" paleta={PALETAS.roupa} valor={pecas.roupa.cor} onEscolher={(cor) => setPecas({ ...pecas, roupa: { ...pecas.roupa, cor } })} />
          </Grupo>
          <Grupo titulo="Calça">
            <Cores rotulo="Cor da calça" paleta={PALETAS.calca} valor={pecas.calca} onEscolher={(calca) => setPecas({ ...pecas, calca })} />
          </Grupo>
          <Grupo titulo="Acessório">
            <Opcoes opcoes={CATALOGO.acessorios} nomes={NOME_ACESSORIO} valor={pecas.acessorio} onEscolher={(acessorio) => setPecas({ ...pecas, acessorio })} />
          </Grupo>

          {erro && <Erro>{erro}</Erro>}
          <div className="acoes">
            <button type="button" className="secundario" onClick={() => setPecas(aleatorio())}>
              🎲 Aleatório
            </button>
            <button type="button" className="primario grande" onClick={() => void salvar()} disabled={salvando}>
              {primeiraVez ? "Pronto, vamos lá" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </Pagina>
  );
}
