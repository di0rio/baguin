import type { EspacoDetalheDto } from "@baguin/shared";
import { Suspense, lazy, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiErro, api } from "../api";
import { DoorClosed } from "lucide-react";
import { Estado, Pagina } from "../componentes";
import { Carregando } from "../sessao";

// o Phaser é grande: só baixa quando o Espaço abre
const Mundo = lazy(() => import("../mundo/Mundo").then((m) => ({ default: m.Mundo })));

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
        <div className="cartao">
          <Estado
            icone={<DoorClosed size={26} strokeWidth={2} aria-hidden />}
            tom="perigo"
            titulo="Não deu pra abrir o Espaço"
            acoes={
              <Link to="/" className="primario cheio">
                Voltar pro início
              </Link>
            }
          >
            {erro}
          </Estado>
        </div>
      </Pagina>
    );
  }
  if (!detalhe) return <Carregando texto="Abrindo o Espaço..." />;
  return (
    <Suspense fallback={<Carregando texto="Abrindo o Espaço..." />}>
      <Mundo detalhe={detalhe} />
    </Suspense>
  );
}
