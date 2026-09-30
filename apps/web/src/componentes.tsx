import { AlertCircle, ChevronDown, LogOut, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { AvatarBolha } from "./ui/AvatarMini";
import { Menu } from "./ui/Menu";
import { useSessao } from "./sessao";

/** Carinha do Baguin: quadrado arredondado azul com dois olhos e um sorriso. */
export const Logo = ({ tamanho = 30 }: { tamanho?: number }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden>
    <rect width="32" height="32" rx="10" fill="var(--primaria)" />
    <circle cx="11.5" cy="13.5" r="2.2" fill="#fff" />
    <circle cx="20.5" cy="13.5" r="2.2" fill="#fff" />
    <path d="M10.5 19.5c1.4 2.2 3.3 3.2 5.5 3.2s4.1-1 5.5-3.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const Marca = ({ grande = false }: { grande?: boolean }) => (
  <Link to="/" className={grande ? "marca grande" : "marca"}>
    <Logo tamanho={grande ? 36 : 30} />
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
        <Menu
          rotulo="Menu da conta"
          className="usuario"
          gatilho={
            <>
              <AvatarBolha pecas={eu.avatar} nome={eu.conta.nome} tamanho={32} />
              <span className="usuario-nome">{eu.conta.nome}</span>
              <ChevronDown size={16} strokeWidth={2} aria-hidden />
            </>
          }
        >
          {(fechar) => (
            <>
              <button
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  fechar();
                  nav("/avatar");
                }}
              >
                <Pencil size={18} strokeWidth={2} aria-hidden />
                Editar Avatar
              </button>
              <div className="menu-sep" role="separator" />
              <button
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  fechar();
                  void sair().then(() => nav("/entrar"));
                }}
              >
                <LogOut size={18} strokeWidth={2} aria-hidden />
                Sair
              </button>
            </>
          )}
        </Menu>
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
  <p className="alerta" role="alert">
    <AlertCircle size={18} strokeWidth={2} aria-hidden />
    <span>{children}</span>
  </p>
);

/** Estado centralizado (vazio, erro, convite inválido...): ícone, título, texto e ações. */
export function Estado({
  icone,
  tom = "primaria",
  titulo,
  children,
  acoes,
}: {
  icone: ReactNode;
  tom?: "primaria" | "perigo" | "aviso";
  titulo: string;
  children?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <div className="estado">
      <span className={tom === "perigo" ? "estado-icone perigo-suave" : tom === "aviso" ? "estado-icone aviso-suave" : "estado-icone"}>{icone}</span>
      <h2>{titulo}</h2>
      {children && <p>{children}</p>}
      {acoes && <div className="acoes-estado">{acoes}</div>}
    </div>
  );
}
