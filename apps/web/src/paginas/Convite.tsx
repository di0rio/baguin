import type { ConviteInfoDto } from "@baguin/shared";
import { useEffect, useState } from "react";
import { Ban, Clock, HelpCircle, PartyPopper } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiErro, api } from "../api";
import { Erro, Estado, Pagina } from "../componentes";
import { Carregando } from "../sessao";

type Falha = { tipo: "banido" | "expirado" | "inexistente" | "outro"; mensagem: string };

function falhaDe(e: unknown): Falha {
  if (e instanceof ApiErro) {
    if (e.status === 403) return { tipo: "banido", mensagem: "Você foi banido deste Espaço, então não dá pra entrar por esse Convite." };
    if (e.status === 410)
      return { tipo: "expirado", mensagem: "Esse Convite expirou, foi revogado ou já foi usado o máximo de vezes. Peça um novo pra quem te convidou." };
    if (e.status === 404) return { tipo: "inexistente", mensagem: "Não encontramos esse Convite. Confere se o link está completo." };
    return { tipo: "outro", mensagem: e.message };
  }
  return { tipo: "outro", mensagem: "Algo deu errado. Tenta de novo?" };
}

const VoltarInicio = () => (
  <Link to="/" className="secundario cheio">
    Voltar pro início
  </Link>
);

export function Convite() {
  const { codigo = "" } = useParams();
  const nav = useNavigate();
  const [info, setInfo] = useState<ConviteInfoDto | null>(null);
  const [falha, setFalha] = useState<Falha | null>(null);
  const [erroEntrar, setErroEntrar] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    api.convite(codigo).then(setInfo, (e: unknown) => setFalha(falhaDe(e)));
  }, [codigo]);

  async function entrar() {
    setErroEntrar("");
    setEntrando(true);
    try {
      const { espacoId } = await api.aceitarConvite(codigo);
      nav(`/e/${espacoId}`, { replace: true });
    } catch (e) {
      const f = falhaDe(e);
      // banido/expirado trocam o cartão inteiro; o resto aparece como erro no botão
      if (f.tipo === "banido" || f.tipo === "expirado") setFalha(f);
      else setErroEntrar(f.mensagem);
      setEntrando(false);
    }
  }

  if (!info && !falha) return <Carregando texto="Abrindo o Convite..." />;

  return (
    <Pagina estreita>
      <div className="cartao">
        {falha?.tipo === "banido" && (
          <Estado icone={<Ban size={26} strokeWidth={2} aria-hidden />} tom="perigo" titulo="Você não pode entrar neste Espaço" acoes={<VoltarInicio />}>
            {falha.mensagem}
          </Estado>
        )}
        {falha?.tipo === "expirado" && (
          <Estado icone={<Clock size={26} strokeWidth={2} aria-hidden />} tom="aviso" titulo="Este Convite não vale mais" acoes={<VoltarInicio />}>
            {falha.mensagem}
          </Estado>
        )}
        {(falha?.tipo === "inexistente" || falha?.tipo === "outro") && (
          <Estado icone={<HelpCircle size={26} strokeWidth={2} aria-hidden />} tom="perigo" titulo="Não deu pra abrir o Convite" acoes={<VoltarInicio />}>
            {falha.mensagem}
          </Estado>
        )}
        {info && !falha && info.valido && (
          <div className="convite">
            <span className="estado-icone">
              <PartyPopper size={26} strokeWidth={2} aria-hidden />
            </span>
            <p className="rotulo">Você foi convidado para</p>
            <h1>{info.espacoNome}</h1>
            <p className="lead">Entre pra encontrar a galera, conversar e ficar junto.</p>
            <div className="acoes-estado">
              {erroEntrar && <Erro>{erroEntrar}</Erro>}
              <button className="primario grande cheio" onClick={() => void entrar()} disabled={entrando}>
                Entrar no Espaço
              </button>
              <Link to="/" className="fantasma cheio">
                Agora não
              </Link>
            </div>
          </div>
        )}
        {info && !falha && !info.valido && (
          <Estado icone={<Clock size={26} strokeWidth={2} aria-hidden />} tom="aviso" titulo={`O Convite para ${info.espacoNome} não vale mais`} acoes={<VoltarInicio />}>
            Ele expirou, foi revogado ou já foi usado o máximo de vezes. Peça um novo pra quem te convidou.
          </Estado>
        )}
      </div>
    </Pagina>
  );
}
