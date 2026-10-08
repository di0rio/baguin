import type { ConviteDto } from "@baguin/shared";
import { Check, Copy, Link2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { Erro } from "../../components/erro";
import { Button } from "../../components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../../components/ui/empty";
import { Field, FieldLabel } from "../../components/ui/field";
import { Form } from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { SheetDescription, SheetHeader, SheetPanel, SheetTitle } from "../../components/ui/sheet";
import { toastManager } from "../../lib/toast";
import { cn } from "../../lib/utils";

const link = (codigo: string) => `${window.location.origin}/convite/${codigo}`;

/** Painel de Convites (Dono/Moderador): gerar, copiar link, revogar. */
export function PainelConvites({ espacoId }: { espacoId: string }) {
  const [convites, setConvites] = useState<ConviteDto[] | null>(null);
  const [horas, setHoras] = useState(24);
  const [usosMax, setUsosMax] = useState(5);
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState("");

  const carregar = useCallback(() => {
    api.convites(espacoId).then(setConvites, (e: Error) => setErro(e.message));
  }, [espacoId]);
  useEffect(carregar, [carregar]);

  async function criar() {
    setErro("");
    setGerando(true);
    try {
      await api.criarConvite(espacoId, horas, usosMax);
      carregar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setGerando(false);
    }
  }

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(link(codigo));
      setCopiado(codigo);
      toastManager.add({ type: "success", title: "Link copiado", timeout: 2500 });
      setTimeout(() => setCopiado(""), 2000);
    } catch {
      setErro("Não deu para copiar. Selecione o link e copie manualmente.");
    }
  }

  async function revogar(codigo: string) {
    try {
      await api.revogarConvite(codigo);
      carregar();
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  return (
    <>
      <SheetHeader className="p-5 pb-3">
        <SheetTitle>convites</SheetTitle>
        <SheetDescription>Gere um link e mande pra quem você quer chamar.</SheetDescription>
      </SheetHeader>
      <SheetPanel className="flex flex-col gap-6 p-5 pt-2">
        {erro && <Erro>{erro}</Erro>}

        <Form className="gap-3" onSubmit={() => void criar()}>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Validade (horas)</FieldLabel>
              <Input type="number" name="horas" min={1} max={720} value={horas} onChange={(e) => setHoras(Number(e.target.value))} />
            </Field>
            <Field>
              <FieldLabel>Usos</FieldLabel>
              <Input type="number" name="usos" min={1} max={100} value={usosMax} onChange={(e) => setUsosMax(Number(e.target.value))} />
            </Field>
          </div>
          <Button type="submit" variant="brand" loading={gerando}>
            <Plus />
            Gerar Convite
          </Button>
        </Form>

        <section aria-label="Convites ativos" className="flex flex-col gap-3">
          <h3 className="font-bold text-sm">ativos{convites ? ` · ${convites.length}` : ""}</h3>
          {convites && convites.length === 0 && (
            <Empty className="rounded-xl border border-dashed py-8 md:py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Link2 />
                </EmptyMedia>
                <EmptyTitle className="text-base">nenhum convite ativo</EmptyTitle>
                <EmptyDescription>Gere um e mande o link pra quem você quer chamar.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          <ul className="flex flex-col gap-2.5">
            {convites?.map((c) => (
              <li key={c.codigo} className="flex flex-col gap-2.5 rounded-xl border bg-card p-3">
                <code className="truncate rounded-md bg-muted px-2 py-1.5 font-mono text-xs">{link(c.codigo)}</code>
                <span className="text-xs text-muted-foreground">
                  {c.usos}/{c.usosMax} usos · expira {new Date(c.expiraEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className={cn("flex-1", copiado === c.codigo && "text-success-foreground")} onClick={() => void copiar(c.codigo)}>
                    {copiado === c.codigo ? <Check /> : <Copy />}
                    {copiado === c.codigo ? "Copiado" : "Copiar link"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive-foreground" onClick={() => void revogar(c.codigo)}>
                    <Trash2 />
                    Revogar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </SheetPanel>
    </>
  );
}
