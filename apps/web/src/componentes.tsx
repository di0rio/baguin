import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { AvatarCanvas } from "./avatar/AvatarCanvas";
import { useSessao } from "./sessao";

export const Marca = () => (
  <Link to="/" className="marca">
    Baguin
  </Link>
);

export function Cabecalho() {
  const { eu, sair } = useSessao();
  const nav = useNavigate();
  return (
    <header className="cabecalho">
      <Marca />
      {eu && (
        <div className="cabecalho-eu">
          {eu.avatar && (
            <Link to="/avatar" title="Editar Avatar" className="mini-avatar">
              <AvatarCanvas pecas={eu.avatar} escala={2} />
            </Link>
          )}
          <span className="nome">{eu.conta.nome}</span>
          <button
            className="fantasma"
            onClick={() => {
              void sair().then(() => nav("/entrar"));
            }}
          >
            Sair
          </button>
        </div>
      )}
    </header>
  );
}

export function Pagina({ children, estreita = false }: { children: ReactNode; estreita?: boolean }) {
  return (
    <div className="pagina">
      <Cabecalho />
      <main className={estreita ? "conteudo estreita" : "conteudo"}>{children}</main>
    </div>
  );
}

export const Erro = ({ children }: { children: ReactNode }) => (
  <p className="erro" role="alert">
    {children}
  </p>
);
