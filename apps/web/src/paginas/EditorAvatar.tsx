import { CATALOGO, PECAS_PADRAO, type Direcao, type Pecas } from "@baguin/shared";
import { Dices, Footprints, RotateCw } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "../api";
import { AvatarCanvas } from "../avatar/AvatarCanvas";
import { aleatorio } from "../avatar/aleatorio";
import { ORDEM_DIRECOES, PALETAS } from "../avatar/renderizar";
import { caminhoSeguro } from "../auth";
import { AvatarMini } from "../components/avatar-mini";
import { CONTENEDOR, Pagina, Topo } from "../components/cabecalho";
import { Erro } from "../components/erro";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Toggle } from "../components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { cn } from "../lib/utils";
import { useSessao } from "../sessao";

const NOME_DIRECAO: Record<Direcao, string> = { baixo: "Frente", esquerda: "Esquerda", direita: "Direita", cima: "Costas" };
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

/** Seção de uma categoria: título, escolha atual à direita e o conteúdo (peças e cores). */
function Grupo({ titulo, atual, children }: { titulo: string; atual?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="flex flex-col gap-3" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-sm font-semibold tracking-tight">
          {titulo}
        </h2>
        {atual && <span className="text-sm text-muted-foreground">{atual}</span>}
      </div>
      {children}
    </section>
  );
}

/** Amostras de cor: uma escolha só, com anel na cor ativa. */
function Cores({ paleta, valor, onEscolher, rotulo }: { paleta: readonly string[]; valor: number; onEscolher: (i: number) => void; rotulo: string }) {
  return (
    <ToggleGroup aria-label={rotulo} value={[String(valor)]} onValueChange={(v) => v[0] !== undefined && onEscolher(Number(v[0]))} className="flex-wrap gap-2.5">
      {paleta.map((cor, i) => (
        <ToggleGroupItem
          key={i}
          value={String(i)}
          aria-label={`${rotulo} ${i + 1}`}
          style={{ background: cor }}
          className="size-8 min-w-0 rounded-full border-black/10 p-0 ring-offset-2 ring-offset-card hover:scale-110 data-pressed:ring-2 data-pressed:ring-primary sm:size-8 sm:min-w-0 dark:border-white/15"
        />
      ))}
    </ToggleGroup>
  );
}

/** Peças com uma miniatura de cada uma, desenhada pelo renderizador com as peças atuais. */
function Estilos<T extends string>({
  opcoes,
  valor,
  nomes,
  onEscolher,
  miniatura,
  corte,
  rotulo,
}: {
  opcoes: readonly T[];
  valor: T;
  nomes: Record<string, string>;
  onEscolher: (v: T) => void;
  miniatura: (o: T) => Pecas;
  corte: "cabeca" | "torso";
  rotulo: string;
}) {
  return (
    <ToggleGroup aria-label={rotulo} value={[valor]} onValueChange={(v) => v[0] !== undefined && onEscolher(v[0] as T)} className="grid w-full grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
      {opcoes.map((o) => (
        <ToggleGroupItem
          key={o}
          value={o}
          className="h-auto min-w-0 flex-col justify-start gap-1.5 whitespace-normal rounded-xl border-border bg-muted/60 px-1 pt-2.5 pb-2 text-xs text-muted-foreground sm:h-auto sm:min-w-0 data-pressed:border-primary data-pressed:bg-primary/8 data-pressed:text-foreground data-pressed:ring-2 data-pressed:ring-primary/30"
        >
          <span className="grid h-14 place-items-center">
            <AvatarMini pecas={miniatura(o)} escala={3} corte={corte} />
          </span>
          <span className="max-w-full text-balance text-center leading-tight">{nomes[o]}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

const calcularEscala = () => (window.innerWidth < 640 ? 5 : window.innerWidth < 1024 ? 8 : 10);

/** Escala do preview: menor em telas estreitas (no celular a prévia fica fixa no topo, ao lado dos controles). */
function useEscala() {
  const [escala, setEscala] = useState(calcularEscala);
  useEffect(() => {
    const f = () => setEscala(calcularEscala());
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
      <Topo
        compacto
        titulo={primeiraVez ? "Monte seu Avatar" : "Seu Avatar"}
        descricao={primeiraVez ? "É assim que a galera vai te ver por aí. Dá pra mudar depois." : "Mude o visual quando quiser. A galera vê na hora."}
      />

      <div className={cn(CONTENEDOR, "grid items-start gap-8 pt-8 pb-28 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:gap-10 lg:pb-12")}>
        <div className="flex flex-col gap-4 max-lg:contents lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-xs/5 max-sm:sticky max-sm:top-[4.0625rem] max-sm:z-10 max-sm:flex">
            <div className="relative isolate grid place-items-center overflow-hidden px-4 pt-8 pb-6 max-sm:w-36 max-sm:shrink-0 max-sm:p-3 max-sm:pb-4">
              <div
                aria-hidden
                className="absolute inset-0 -z-10"
                style={{
                  background:
                    "radial-gradient(60% 55% at 50% 38%, color-mix(in oklch, var(--primary) 20%, transparent), transparent 72%), linear-gradient(to bottom, transparent 62%, color-mix(in oklch, var(--primary) 7%, transparent))",
                }}
              />
              <div className="relative">
                <div aria-hidden className="absolute inset-x-[10%] -bottom-1 h-6 rounded-[50%] bg-foreground/14 blur-md" />
                <AvatarCanvas pecas={pecas} dir={dir} andando={andando} escala={escala} className="relative" />
              </div>
            </div>
            <Separator className="max-sm:hidden" />
            <div className="flex flex-col gap-3 bg-muted/40 p-3 max-sm:flex-1 max-sm:justify-center max-sm:border-s">
              <ToggleGroup
                aria-label="Direção do Avatar"
                value={[dir]}
                onValueChange={(v) => {
                  if (v[0] === undefined) return;
                  setGirando(false);
                  setDir(v[0] as Direcao);
                }}
                className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-0.5 max-sm:grid-cols-2"
              >
                {ORDEM_DIRECOES.map((d) => (
                  <ToggleGroupItem key={d} value={d} className="min-w-0 rounded-md px-1 text-muted-foreground data-pressed:bg-background data-pressed:text-foreground data-pressed:shadow-sm/5 dark:data-pressed:bg-input">
                    {NOME_DIRECAO[d]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="grid grid-cols-2 gap-2">
                <Toggle variant="outline" pressed={girando} onPressedChange={setGirando} className="justify-center data-pressed:border-primary/30 data-pressed:bg-primary/10 data-pressed:text-primary dark:data-pressed:bg-primary/15">
                  <RotateCw />
                  Girar
                </Toggle>
                <Toggle variant="outline" pressed={andando} onPressedChange={setAndando} className="justify-center data-pressed:border-primary/30 data-pressed:bg-primary/10 data-pressed:text-primary dark:data-pressed:bg-primary/15">
                  <Footprints />
                  Andar
                </Toggle>
              </div>
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-3 border-t bg-background/85 p-3 backdrop-blur-md lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            {erro && <Erro>{erro}</Erro>}
            <div className="mx-auto flex w-full max-w-md gap-2 lg:max-w-none">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setPecas(aleatorio())}>
                <Dices />
                Aleatório
              </Button>
              <Button size="lg" className="flex-[1.4]" onClick={() => void salvar()} loading={salvando}>
                {primeiraVez ? "Pronto, vamos lá" : "Salvar"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-7 rounded-2xl border bg-card p-5 shadow-xs/5 sm:p-6">
          <Grupo titulo="Pele">
            <Cores rotulo="Tom de pele" paleta={PALETAS.pele} valor={pecas.pele} onEscolher={(pele) => setPecas({ ...pecas, pele })} />
          </Grupo>
          <Separator />
          <Grupo titulo="Cabelo" atual={NOME_CABELO[pecas.cabelo.estilo]}>
            <Estilos
              rotulo="Estilo de cabelo"
              opcoes={CATALOGO.cabeloEstilos}
              nomes={NOME_CABELO}
              valor={pecas.cabelo.estilo}
              corte="cabeca"
              miniatura={(estilo) => ({ ...pecas, cabelo: { ...pecas.cabelo, estilo } })}
              onEscolher={(estilo) => setPecas({ ...pecas, cabelo: { ...pecas.cabelo, estilo } })}
            />
            <Cores rotulo="Cor do cabelo" paleta={PALETAS.cabelo} valor={pecas.cabelo.cor} onEscolher={(cor) => setPecas({ ...pecas, cabelo: { ...pecas.cabelo, cor } })} />
          </Grupo>
          <Separator />
          <Grupo titulo="Roupa" atual={NOME_ROUPA[pecas.roupa.estilo]}>
            <Estilos
              rotulo="Estilo de roupa"
              opcoes={CATALOGO.roupaEstilos}
              nomes={NOME_ROUPA}
              valor={pecas.roupa.estilo}
              corte="torso"
              miniatura={(estilo) => ({ ...pecas, roupa: { ...pecas.roupa, estilo } })}
              onEscolher={(estilo) => setPecas({ ...pecas, roupa: { ...pecas.roupa, estilo } })}
            />
            <Cores rotulo="Cor da roupa" paleta={PALETAS.roupa} valor={pecas.roupa.cor} onEscolher={(cor) => setPecas({ ...pecas, roupa: { ...pecas.roupa, cor } })} />
          </Grupo>
          <Separator />
          <Grupo titulo="Calça">
            <Cores rotulo="Cor da calça" paleta={PALETAS.calca} valor={pecas.calca} onEscolher={(calca) => setPecas({ ...pecas, calca })} />
          </Grupo>
          <Separator />
          <Grupo titulo="Acessório" atual={NOME_ACESSORIO[pecas.acessorio]}>
            <Estilos
              rotulo="Acessório"
              opcoes={CATALOGO.acessorios}
              nomes={NOME_ACESSORIO}
              valor={pecas.acessorio}
              corte="cabeca"
              miniatura={(acessorio) => ({ ...pecas, acessorio })}
              onEscolher={(acessorio) => setPecas({ ...pecas, acessorio })}
            />
          </Grupo>
        </div>
      </div>
    </Pagina>
  );
}
