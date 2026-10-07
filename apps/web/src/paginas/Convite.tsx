import type { ConviteInfoDto } from "@baguin/shared";
import { useEffect, useState } from "react";
import { Ban, Clock, HelpCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiErro, api } from "../api";
import { CapaEspaco } from "../components/capa-espaco";
import { Carregando } from "../components/carregando";
import { Erro } from "../components/erro";
import { EstadoPagina } from "../components/estado-pagina";
import { CONTENEDOR, Pagina } from "../components/cabecalho";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

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
  <Button variant="outline" render={<Link to="/" />}>
    Voltar pro início
  </Button>
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

  if (falha?.tipo === "banido")
    return (
      <EstadoPagina icone={<Ban />} tom="perigo" titulo="Você não pode entrar neste Espaço" acoes={<VoltarInicio />}>
        {falha.mensagem}
      </EstadoPagina>
    );
  if (falha?.tipo === "expirado")
    return (
      <EstadoPagina icone={<Clock />} tom="aviso" titulo="Este Convite não vale mais" acoes={<VoltarInicio />}>
        {falha.mensagem}
      </EstadoPagina>
    );
  if (falha)
    return (
      <EstadoPagina icone={<HelpCircle />} tom="perigo" titulo="Não deu pra abrir o Convite" acoes={<VoltarInicio />}>
        {falha.mensagem}
      </EstadoPagina>
    );
  if (info && !info.valido)
    return (
      <EstadoPagina icone={<Clock />} tom="aviso" titulo={`O Convite para ${info.espacoNome} não vale mais`} acoes={<VoltarInicio />}>
        Ele expirou, foi revogado ou já foi usado o máximo de vezes. Peça um novo pra quem te convidou.
      </EstadoPagina>
    );

  return (
    <Pagina>
      <div className={cn(CONTENEDOR, "flex justify-center py-10 sm:py-16")}>
        <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border bg-card p-3 pb-6 shadow-xs/5">
          <CapaEspaco id={info!.espacoNome} />
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">Você foi convidado para</p>
            <h1 className="text-balance font-heading text-3xl font-semibold tracking-[-0.03em]">{info!.espacoNome}</h1>
            <p className="text-pretty text-muted-foreground">Entre pra encontrar a galera, conversar e ficar junto.</p>
          </div>
          <div className="flex flex-col gap-2.5 px-4">
            {erroEntrar && <Erro>{erroEntrar}</Erro>}
            <Button size="xl" onClick={() => void entrar()} loading={entrando}>
              Entrar no Espaço
            </Button>
            <Button size="xl" variant="ghost" render={<Link to="/" />}>
              Agora não
            </Button>
          </div>
        </div>
      </div>
    </Pagina>
  );
}
