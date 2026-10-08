import { Spinner } from "./ui/spinner";

/** Estado de carregamento da página inteira. */
export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <div className="grid min-h-svh place-items-center bg-background">
      <div className="flex items-center gap-2.5 text-muted-foreground text-sm">
        <Spinner label={texto} />
        {texto}
      </div>
    </div>
  );
}
