import type { ConviteInfoDto } from "@baguin/shared";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiErro, api } from "../api";
import { Erro, Pagina } from "../componentes";
import { Carregando } from "../sessao";

function mensagemAceite(e: unknown) {
  if (e instanceof ApiErro) {
    if (e.status === 403) return "Você foi banido deste Espaço, então não dá pra entrar por esse Convite.";
    if (e.status === 410) return "Esse Convite expirou, foi revogado ou já foi usado o máximo de vezes. Peça um novo pra quem te convidou.";
    if (e.status === 404) return "Não encontramos esse Convite.";
    return e.message;
  }
  return "Algo deu errado. Tenta de novo?";
}

export function Convite() {
  const { codigo = "" } = useParams();
  const nav = useNavigate();
  const [info, setInfo] = useState<ConviteInfoDto | null>(null);
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    api.convite(codigo).then(setInfo, (e: unknown) => setErro(mensagemAceite(e)));
  }, [codigo]);

  async function entrar() {
    setErro("");
    setEntrando(true);
    try {
      const { espacoId } = await api.aceitarConvite(codigo);
      nav(`/e/${espacoId}`, { replace: true });
    } catch (e) {
      setErro(mensagemAceite(e));
      setEntrando(false);
    }
  }

  return (
    <Pagina estreita>
      <div className="cartao convite">
        {!info && !erro && <Carregando />}
        {info && (
          <>
            <p className="etiqueta">Você foi convidado para</p>
            <h1 className="convite-nome">{info.espacoNome}</h1>
            {info.valido ? (
              <button className="primario grande" onClick={() => void entrar()} disabled={entrando}>
                Entrar no Espaço
              </button>
            ) : (
              <p className="vazio">Esse Convite não vale mais (expirou, foi revogado ou esgotou). Peça um novo pra quem te convidou.</p>
            )}
          </>
        )}
        {erro && <Erro>{erro}</Erro>}
        <p className="rodape-link">
          <Link to="/">Voltar pro início</Link>
        </p>
      </div>
    </Pagina>
  );
}
