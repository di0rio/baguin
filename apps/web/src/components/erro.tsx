import type { ReactNode } from "react";
import { Alert, AlertDescription } from "./ui/alert";

/** Erro inline (formulário, carregamento): leitor de tela anuncia na hora. */
export const Erro = ({ children, className }: { children: ReactNode; className?: string }) => (
  <Alert variant="error" tag="erro" className={className}>
    <AlertDescription className="text-foreground">{children}</AlertDescription>
  </Alert>
);
