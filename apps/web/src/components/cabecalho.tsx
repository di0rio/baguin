import { ChevronDown, LogOut, Moon, Pencil, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { cn } from "../lib/utils";
import { useSessao } from "../sessao";
import { useTema } from "../tema";
import { AvatarBolha } from "./avatar-mini";
import { Marca } from "./marca";
import { Button } from "./ui/button";
import { Menu, MenuLinkItem, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "./ui/menu";

/** Largura única do cabeçalho, do miolo e dos blocos de página. */
export const CONTENEDOR = "mx-auto w-full max-w-6xl px-4 sm:px-6";

/** Claro/escuro: os dois ícones ficam empilhados e trocam por fade + leve giro. */
export function BotaoTema() {
  const { escuro, alternar } = useTema();
  const rotulo = escuro ? "Usar tema claro" : "Usar tema escuro";
  const icone = "col-start-1 row-start-1 transition-[opacity,rotate,scale] duration-200 ease-smooth";
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
    <Menu>
      <MenuTrigger render={<Button variant="ghost" className="h-10 gap-2 ps-1.5 pe-2 sm:h-10" aria-label="Menu da conta" />}>
        <AvatarBolha pecas={eu.avatar} nome={eu.conta.nome} tamanho={30} />
        <span className="max-w-32 truncate text-sm font-medium max-sm:hidden">{eu.conta.nome}</span>
        <ChevronDown className="opacity-60" />
      </MenuTrigger>
      <MenuPopup align="end" className="min-w-48">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{eu.conta.nome}</p>
          <p className="text-xs text-muted-foreground">Sua Conta</p>
        </div>
        <MenuSeparator />
        <MenuLinkItem render={<Link to="/avatar" />}>
          <Pencil className="size-4 opacity-70" />
          Editar Avatar
        </MenuLinkItem>
        <MenuItem onClick={() => void sair().then(() => nav("/entrar"))}>
          <LogOut className="size-4 opacity-70" />
          Sair
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

export function Cabecalho() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
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

/** Esqueleto das páginas com login: cabeçalho fixo e miolo. Cada página aplica CONTENEDOR no próprio miolo. */
export function Pagina({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <Cabecalho />
      <main className="flex-1">{children}</main>
    </div>
  );
}

/** Topo das páginas: brilho radial na cor primária (como o SiteHero do blog), título e descrição. */
export function Topo({ titulo, descricao, compacto = false, children }: { titulo: ReactNode; descricao?: ReactNode; compacto?: boolean; children?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden border-b">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 90% at 90% 0%, color-mix(in oklch, var(--primary) 24%, transparent), transparent 70%), radial-gradient(45% 70% at 5% 100%, color-mix(in oklch, var(--primary) 11%, transparent), transparent 70%)",
        }}
      />
      <div className={cn(CONTENEDOR, "flex flex-col justify-end gap-6", compacto ? "pt-8 pb-7" : "pt-10 pb-9 sm:min-h-64")}>
        <div className="flex max-w-2xl flex-col gap-3">
          <h1 className={cn("text-balance font-heading font-semibold tracking-[-0.03em]", compacto ? "text-3xl lg:text-4xl" : "text-4xl lg:text-5xl")}>{titulo}</h1>
          {descricao && <p className={cn("text-pretty leading-relaxed text-muted-foreground", compacto ? "text-base" : "text-lg")}>{descricao}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
