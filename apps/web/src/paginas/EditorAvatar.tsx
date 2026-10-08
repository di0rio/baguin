import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { CATALOGO, PECAS_PADRAO, type Direcao, type Pecas } from "@baguin/shared";
import { Dices, Footprints, RotateCw } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "../api";
import { AvatarCanvas } from "../avatar/AvatarCanvas";
import { aleatorio } from "../avatar/aleatorio";
import { ORDEM_DIRECOES, type Corte } from "../avatar/renderizar";
import { caminhoSeguro } from "../auth";
import { AvatarMini } from "../components/avatar-mini";
import { CONTENEDOR, Pagina, Topo } from "../components/cabecalho";
import { Erro } from "../components/erro";
import { Button } from "../components/ui/button";
import { RadioGroup } from "../components/ui/radio-group";
import { Separator } from "../components/ui/separator";
import { Toggle } from "../components/ui/toggle";
import { cn } from "../lib/utils";
import { useSessao } from "../sessao";

const NOME_DIRECAO: Record<Direcao, string> = { baixo: "Frente", esquerda: "Esquerda", direita: "Direita", cima: "Costas" };
const NOME_ALTURA: Record<string, string> = { baixo: "Baixo", medio: "Médio", alto: "Alto" };
const NOME_CABELO: Record<string, string> = {
  espetado: "Espetado",
  redondo: "Redondo",
  longo: "Longo",
  chanel: "Chanel",
  tigela: "Tigela",
  coque: "Coque",
  moicano: "Moicano",
  careca: "Careca",
};
const NOME_ROSTO: Record<string, string> = { sono: "Sono", feliz: "Feliz", bravo: "Bravo", sorrisao: "Sorrisão", desconfiado: "Desconfiado", fofo: "Fofo" };
const NOME_PREENCHIMENTO: Record<string, string> = { papel: "Papel", tinta: "Tinta", listra: "Listra", bolinha: "Bolinha", xadrez: "Xadrez" };
const NOME_ACESSORIO: Record<string, string> = { nenhum: "Nenhum", oculos: "Óculos", bone: "Boné", fone: "Fone", touca: "Touca" };
/** Escala (px de tela por px do mundo) da miniatura de cada recorte: a cabeça é grande, o torso e as pernas são faixas. */
const ESCALA_MINI: Record<Corte, number> = { cabeca: 3, torso: 6, pernas: 6, corpo: 1.9 };

/** Opção de um `RadioGroup` do cd/ui que vira tile, amostra ou aba: o `Radio` do cd é só a bolinha, então o corpo vem do primitivo. */
function Opcao({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      className={cn(
        "cursor-pointer select-none outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-instant ease-out motion-safe:active:scale-[0.97]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        className,
      )}
      {...props}
    />
  );
}

/** Seção de uma categoria: título, escolha atual à direita e o conteúdo (formas e Preenchimentos). */
function Grupo({ titulo, atual, children }: { titulo: string; atual?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="flex flex-col gap-3" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="font-bold text-sm tracking-tight">
          {titulo}
        </h2>
        {atual && <span className="text-muted-foreground text-sm">{atual}</span>}
      </div>
      {children}
    </section>
  );
}

/** Formas e Preenchimentos, cada um com uma miniatura desenhada pelo renderizador com as Peças atuais. */
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
  corte: Corte;
  rotulo: string;
}) {
  return (
    <RadioGroup aria-label={rotulo} value={valor} onValueChange={(v) => onEscolher(v as T)} className="grid w-full grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
      {opcoes.map((o) => (
        <Opcao
          key={o}
          value={o}
          className="flex flex-col items-center justify-start gap-1.5 rounded-xl border bg-muted px-1 pt-2.5 pb-2 text-muted-foreground text-xs hover:bg-accent data-checked:border-foreground data-checked:bg-background data-checked:text-foreground data-checked:ring-1 data-checked:ring-foreground"
        >
          <span className="grid h-16 w-full place-items-center rounded-lg bg-[#f6f4ee]">
            <AvatarMini pecas={miniatura(o)} escala={ESCALA_MINI[corte]} corte={corte} />
          </span>
          <span className="max-w-full text-balance text-center leading-tight">{nomes[o]}</span>
        </Opcao>
      ))}
    </RadioGroup>
  );
}

const PREENCHIMENTOS_ROUPA = [...CATALOGO.lisos, ...CATALOGO.estampas] as const;

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
        titulo={primeiraVez ? "monte seu avatar" : "seu avatar"}
        descricao={primeiraVez ? "É assim que a galera vai te ver por aí. Dá pra mudar depois." : "Mude o visual quando quiser. A galera vê na hora."}
      />

      <div className={cn(CONTENEDOR, "grid items-start gap-8 pt-8 pb-28 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:gap-10 lg:pb-12")}>
        <div className="flex flex-col gap-4 max-lg:contents lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-2xl border bg-card max-sm:sticky max-sm:top-[4.0625rem] max-sm:z-10 max-sm:flex">
            <div className="relative isolate grid place-items-center overflow-hidden bg-[#f6f4ee] px-4 pt-8 pb-6 max-sm:w-36 max-sm:shrink-0 max-sm:p-3 max-sm:pb-4">
              <div className="relative">
                <AvatarCanvas pecas={pecas} dir={dir} movimento={andando ? "andando" : "parado"} animado escala={escala} espessura={1} sombra className="relative" />
              </div>
            </div>
            <Separator className="max-sm:hidden" />
            <div className="flex flex-col gap-3 p-3 max-sm:flex-1 max-sm:justify-center max-sm:border-s">
              <RadioGroup
                aria-label="Direção do Avatar"
                value={dir}
                onValueChange={(v) => {
                  setGirando(false);
                  setDir(v as Direcao);
                }}
                className="grid grid-cols-4 gap-1 rounded-lg border p-0.5 max-sm:grid-cols-2"
              >
                {ORDEM_DIRECOES.map((d) => (
                  <Opcao key={d} value={d} className="grid h-8 place-items-center rounded-md px-1 text-muted-foreground text-sm hover:text-foreground data-checked:bg-foreground data-checked:text-background">
                    {NOME_DIRECAO[d]}
                  </Opcao>
                ))}
              </RadioGroup>
              <div className="grid grid-cols-2 gap-2">
                <Toggle pressed={girando} onPressedChange={setGirando} className="justify-center">
                  <RotateCw />
                  Girar
                </Toggle>
                <Toggle pressed={andando} onPressedChange={setAndando} className="justify-center">
                  <Footprints />
                  Andar
                </Toggle>
              </div>
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-3 border-t bg-background p-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
            {erro && <Erro>{erro}</Erro>}
            <div className="mx-auto flex w-full max-w-md gap-2 lg:max-w-none">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setPecas(aleatorio())}>
                <Dices />
                Aleatório
              </Button>
              <Button variant="brand" size="lg" className="flex-[1.4]" onClick={() => void salvar()} loading={salvando}>
                {primeiraVez ? "Pronto, vamos lá" : "Salvar"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-7 rounded-2xl border bg-card p-5 sm:p-6">
          <Grupo titulo="altura" atual={NOME_ALTURA[pecas.altura]}>
            <Estilos
              rotulo="Altura"
              opcoes={CATALOGO.alturas}
              nomes={NOME_ALTURA}
              valor={pecas.altura}
              corte="corpo"
              miniatura={(altura) => ({ ...pecas, altura })}
              onEscolher={(altura) => setPecas({ ...pecas, altura })}
            />
          </Grupo>
          <Separator />
          <Grupo titulo="cabelo" atual={NOME_CABELO[pecas.cabelo.estilo]}>
            <Estilos
              rotulo="Estilo de cabelo"
              opcoes={CATALOGO.cabelos}
              nomes={NOME_CABELO}
              valor={pecas.cabelo.estilo}
              corte="cabeca"
              miniatura={(estilo) => ({ ...pecas, cabelo: { ...pecas.cabelo, estilo } })}
              onEscolher={(estilo) => setPecas({ ...pecas, cabelo: { ...pecas.cabelo, estilo } })}
            />
            <Estilos
              rotulo="Preenchimento do cabelo"
              opcoes={CATALOGO.lisos}
              nomes={NOME_PREENCHIMENTO}
              valor={pecas.cabelo.preenchimento}
              corte="cabeca"
              miniatura={(preenchimento) => ({ ...pecas, cabelo: { ...pecas.cabelo, preenchimento } })}
              onEscolher={(preenchimento) => setPecas({ ...pecas, cabelo: { ...pecas.cabelo, preenchimento } })}
            />
          </Grupo>
          <Separator />
          <Grupo titulo="rosto" atual={NOME_ROSTO[pecas.rosto]}>
            <Estilos
              rotulo="Rosto"
              opcoes={CATALOGO.rostos}
              nomes={NOME_ROSTO}
              valor={pecas.rosto}
              corte="cabeca"
              miniatura={(rosto) => ({ ...pecas, rosto })}
              onEscolher={(rosto) => setPecas({ ...pecas, rosto })}
            />
          </Grupo>
          <Separator />
          <Grupo titulo="roupa" atual={NOME_PREENCHIMENTO[pecas.roupa.preenchimento]}>
            <Estilos
              rotulo="Preenchimento da roupa"
              opcoes={PREENCHIMENTOS_ROUPA}
              nomes={NOME_PREENCHIMENTO}
              valor={pecas.roupa.preenchimento}
              corte="torso"
              miniatura={(preenchimento) => ({ ...pecas, roupa: { preenchimento } })}
              onEscolher={(preenchimento) => setPecas({ ...pecas, roupa: { preenchimento } })}
            />
          </Grupo>
          <Separator />
          <Grupo titulo="calça" atual={NOME_PREENCHIMENTO[pecas.calca.preenchimento]}>
            <Estilos
              rotulo="Preenchimento da calça"
              opcoes={CATALOGO.lisos}
              nomes={NOME_PREENCHIMENTO}
              valor={pecas.calca.preenchimento}
              corte="pernas"
              miniatura={(preenchimento) => ({ ...pecas, calca: { preenchimento } })}
              onEscolher={(preenchimento) => setPecas({ ...pecas, calca: { preenchimento } })}
            />
          </Grupo>
          <Separator />
          <Grupo titulo="acessório" atual={NOME_ACESSORIO[pecas.acessorio]}>
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
