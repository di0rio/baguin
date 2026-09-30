import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({ baseURL: window.location.origin });

/** Só aceita caminhos internos como destino de retorno (evita open redirect). */
export function caminhoSeguro(v: string | null | undefined): string {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}
