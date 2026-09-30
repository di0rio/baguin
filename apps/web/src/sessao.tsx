import type { EuDto } from "@baguin/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { api } from "./api";
import { authClient } from "./auth";

type Sessao = {
  /** undefined enquanto carrega; null sem login */
  eu: EuDto | null | undefined;
  recarregar: () => Promise<EuDto | null>;
  sair: () => Promise<void>;
};

const Ctx = createContext<Sessao | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [eu, setEu] = useState<EuDto | null | undefined>(undefined);

  const recarregar = useCallback(async () => {
    const v = await api.eu().catch(() => null);
    setEu(v);
    return v;
  }, []);

  const sair = useCallback(async () => {
    await authClient.signOut();
    setEu(null);
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const valor = useMemo(() => ({ eu, recarregar, sair }), [eu, recarregar, sair]);
  return <Ctx value={valor}>{children}</Ctx>;
}

export function useSessao() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSessao fora do SessaoProvider");
  return v;
}

/**
 * Guarda de rota: sem login → /entrar; sem Avatar (quando `exigirAvatar`) → /avatar.
 * O caminho de origem viaja em `?voltar=` para sobreviver ao redirecionamento do login social.
 */
export function Protegido({ children, exigirAvatar = true }: { children: ReactNode; exigirAvatar?: boolean }) {
  const { eu } = useSessao();
  const loc = useLocation();
  if (eu === undefined) return <Carregando />;
  const voltar = encodeURIComponent(loc.pathname + loc.search);
  if (!eu) return <Navigate to={`/entrar?voltar=${voltar}`} replace />;
  if (exigirAvatar && !eu.avatar) return <Navigate to={`/avatar?voltar=${voltar}`} replace />;
  return children;
}

export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <div className="carregando" role="status">
      <span className="pulo" />
      {texto}
    </div>
  );
}
