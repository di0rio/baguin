import type { EspacoDto } from "@baguin/shared";
import { ArrowRight, DoorOpen, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { api } from "../api";
import { CapaEspaco } from "../components/capa-espaco";
import { CONTENEDOR, Pagina, Topo } from "../components/cabecalho";
import { Erro } from "../components/erro";
import { Button } from "../components/ui/button";
import { Dialog, DialogClose, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../components/ui/empty";
import { Field, FieldLabel } from "../components/ui/field";
import { Form } from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { cn } from "../lib/utils";

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });

function CartaoEspaco({ espaco }: { espaco: EspacoDto }) {
  return (
    <li>
      <Link
        to={`/e/${espaco.id}`}
        aria-label={`Entrar em ${espaco.nome}`}
        className="group flex flex-col gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="relative">
          <CapaEspaco id={espaco.id} />
          <span className="absolute right-3 bottom-3 grid size-8 place-items-center rounded-full bg-background/85 text-foreground opacity-0 shadow-sm backdrop-blur transition-[opacity,translate] duration-200 ease-smooth group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 translate-y-1">
            <ArrowRight className="size-4" />
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-0.5">
          <h2 className="truncate font-semibold tracking-tight">{espaco.nome}</h2>
          <p className="text-sm text-muted-foreground">Criado em {data(espaco.criadoEm)}</p>
        </div>
      </Link>
    </li>
  );
}

function Esqueleto() {
  return (
    <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Carregando Espaços">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[16/9] rounded-xl" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3.5 w-1/3" />
        </li>
      ))}
    </ul>
  );
}

export function Inicio() {
  const nav = useNavigate();
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso;
  const [espacos, setEspacos] = useState<EspacoDto[] | null>(null);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [criarAberto, setCriarAberto] = useState(false);
  const [erroCriar, setErroCriar] = useState("");
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    api.espacos().then(setEspacos, (e: Error) => setErro(e.message));
  }, []);

  async function criar() {
    if (!nome.trim()) return;
    setErroCriar("");
    setCriando(true);
    try {
      const d = await api.criarEspaco(nome.trim());
      nav(`/e/${d.espaco.id}`);
    } catch (err) {
      setErroCriar((err as Error).message);
      setCriando(false);
    }
  }

  const abrirCriar = () => {
    setErroCriar("");
    setCriarAberto(true);
  };

  return (
    <Pagina>
      <Topo titulo="Seus Espaços" descricao="Entre num Espaço pra encontrar a galera ou crie um novo.">
        <div>
          <Button size="lg" onClick={abrirCriar}>
            <Plus />
            Criar Espaço
          </Button>
        </div>
      </Topo>

      <div className={cn(CONTENEDOR, "flex flex-col gap-6 py-10")}>
        {aviso && <Erro>{aviso}</Erro>}
        {erro && <Erro>{erro}</Erro>}
        {!espacos && !erro && <Esqueleto />}

        {espacos && espacos.length === 0 && (
          <Empty className="rounded-2xl border border-dashed border-input">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <DoorOpen />
              </EmptyMedia>
              <EmptyTitle>Você ainda não está em nenhum Espaço</EmptyTitle>
              <EmptyDescription>Crie o primeiro agora ou peça um Convite pra alguém que já tem um Espaço.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={abrirCriar}>
                <Plus />
                Criar Espaço
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {espacos && espacos.length > 0 && (
          <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {espacos.map((e) => (
              <CartaoEspaco key={e.id} espaco={e} />
            ))}
          </ul>
        )}
      </div>

      <Dialog open={criarAberto} onOpenChange={setCriarAberto}>
        <DialogPopup className="sm:max-w-md">
          <Form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              void criar();
            }}
          >
            <DialogHeader>
              <DialogTitle>Criar um Espaço</DialogTitle>
              <DialogDescription>Dê um nome pro lugar onde a galera vai se encontrar. Depois é só mandar um Convite.</DialogDescription>
            </DialogHeader>
            <DialogPanel>
              <Field>
                <FieldLabel>Nome do Espaço</FieldLabel>
                <Input autoFocus size="lg" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: QG da galera" maxLength={60} autoComplete="off" />
              </Field>
              {erroCriar && <Erro className="mt-4">{erroCriar}</Erro>}
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
              <Button type="submit" loading={criando} disabled={!nome.trim()}>
                Criar Espaço
              </Button>
            </DialogFooter>
          </Form>
        </DialogPopup>
      </Dialog>
    </Pagina>
  );
}
