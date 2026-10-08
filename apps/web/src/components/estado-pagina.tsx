import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { CONTENEDOR, Pagina } from "./cabecalho";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";

const TONS = { neutro: "", perigo: "text-destructive-foreground", aviso: "" } as const;

/** Página de estado (erro, Convite inválido...): ícone, título, texto e ações num cartão centralizado, em tom alto. */
export function EstadoPagina({
  icone,
  tom = "neutro",
  titulo,
  children,
  acoes,
}: {
  icone: ReactNode;
  tom?: keyof typeof TONS;
  titulo: string;
  children?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <Pagina>
      <div className={cn(CONTENEDOR, "flex justify-center py-12 sm:py-20")}>
        <Empty className="tom-alto max-w-lg flex-none rounded-2xl bg-card py-12 md:py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon" className={TONS[tom]}>
              {icone}
            </EmptyMedia>
            <EmptyTitle>{titulo}</EmptyTitle>
            {children && <EmptyDescription>{children}</EmptyDescription>}
          </EmptyHeader>
          {acoes && <EmptyContent>{acoes}</EmptyContent>}
        </Empty>
      </div>
    </Pagina>
  );
}
