import { ChevronDown, LogOut, Moon, Pencil, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { cn } from "../lib/utils";
import { useSessao } from "../sessao";
import { useTema } from "../tema";
import { AvatarBolha } from "./avatar-mini";
import { Assinatura, Marca } from "./marca";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuPopup, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";

/** Largura única do cabeçalho, do miolo e dos blocos de página. */
export const CONTENEDOR = "mx-auto w-full max-w-6xl px-4 sm:px-6";

/** Claro/escuro: os dois ícones ficam empilhados e trocam por fade + leve giro. */
export function BotaoTema() {
  const { escuro, alternar } = useTema();
  const rotulo = escuro ? "Usar tema claro" : "Usar tema escuro";
  const icone = "col-start-1 row-start-1 transition-[opacity,rotate,scale] duration-base ease-out";
  return (
    <Button variant="ghost" size="icon" aria-label={rotulo} title={rotulo} onClick={alternar}>
      <span className="grid place-items-center">
        <Sun className={cn(icone, escuro ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-45 opacity-0")} />
        <Moon className={cn(icone, escuro ? "scale-75 rotate-45 opacity-0" : "scale-100 rotate-0 opacity-100")} />
      </span>
    </Button>
  );
}

function MenuConta() {
  const { eu, sair } = useSessao();
  const nav = useNavigate();
  if (!eu) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="h-10 gap-2 ps-1.5 pe-2" aria-label="Menu da conta" />}>
        <AvatarBolha pecas={eu.avatar} nome={eu.conta.nome} tamanho={30} />
        <span className="max-w-32 truncate text-sm font-medium max-sm:hidden">{eu.conta.nome}</span>
        <ChevronDown className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuPopup align="end" className="min-w-48">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{eu.conta.nome}</p>
          <p className="text-xs text-muted-foreground">Sua Conta</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/avatar" />}>
          <Pencil className="size-4 opacity-70" />
          Editar Avatar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void sair().then(() => nav("/entrar"))}>
          <LogOut className="size-4 opacity-70" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuPopup>
    </DropdownMenu>
  );
}

export function Cabecalho() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background">
      <div className={cn(CONTENEDOR, "flex h-16 items-center justify-between gap-4")}>
        <Marca />
        <div className="flex items-center gap-1">
          <BotaoTema />
          <MenuConta />
        </div>
      </div>
    </header>
  );
}

/** Rodapé das páginas com login, com a assinatura da cd. */
export function Rodape() {
  return (
    <footer className="border-t">
      <div className={cn(CONTENEDOR, "flex h-14 items-center")}>
        <Assinatura />
      </div>
    </footer>
  );
}

/** Esqueleto das páginas com login: cabeçalho fixo, miolo e rodapé com a assinatura. Cada página aplica CONTENEDOR no próprio miolo. */
export function Pagina({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <Cabecalho />
      <main className="flex-1">{children}</main>
      <Rodape />
    </div>
  );
}

/** Topo das páginas: título em minúsculas, descrição e ação. Tom baixo: sem enfeite, só tipografia. */
export function Topo({ titulo, descricao, compacto = false, children }: { titulo: ReactNode; descricao?: ReactNode; compacto?: boolean; children?: ReactNode }) {
  return (
    <section className="border-b">
      <div className={cn(CONTENEDOR, "flex flex-col justify-end gap-6", compacto ? "pt-8 pb-7" : "pt-10 pb-9")}>
        <div className="flex max-w-2xl flex-col gap-3">
          <h1 className={cn("text-balance font-bold font-heading tracking-[-0.03em]", compacto ? "text-3xl lg:text-4xl" : "text-4xl lg:text-5xl")}>{titulo}</h1>
          {descricao && <p className={cn("text-pretty text-muted-foreground leading-relaxed", compacto ? "text-base" : "text-lg")}>{descricao}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
