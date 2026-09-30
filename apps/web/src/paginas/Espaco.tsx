import type { EspacoDetalheDto } from "@baguin/shared";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiErro, api } from "../api";
import { Erro, Pagina } from "../componentes";
import { Mundo } from "../mundo/Mundo";
import { Carregando } from "../sessao";

export function Espaco() {
  const { espacoId = "" } = useParams();
  const [detalhe, setDetalhe] = useState<EspacoDetalheDto | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setDetalhe(null);
    setErro("");
    api.espaco(espacoId).then(setDetalhe, (e: unknown) => {
      if (e instanceof ApiErro && (e.status === 403 || e.status === 404)) {
        setErro("Você não faz parte deste Espaço (ou ele não existe).");
      } else {
        setErro(e instanceof Error ? e.message : "Erro inesperado");
      }
    });
  }, [espacoId]);

  if (erro) {
    return (
      <Pagina estreita>
        <Erro>{erro}</Erro>
        <Link to="/">Voltar pro início</Link>
      </Pagina>
    );
  }
  if (!detalhe) return <Carregando texto="Abrindo o Espaço..." />;
  return <Mundo detalhe={detalhe} />;
}
