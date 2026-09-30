import type { ConfigDto } from "@baguin/shared";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router";
import { api } from "../api";
import { authClient, caminhoSeguro } from "../auth";
import { Erro, Marca } from "../componentes";
import { Carregando, useSessao } from "../sessao";

const NOMES = { discord: "Discord", google: "Google" } as const;

export function Entrar() {
  const [busca] = useSearchParams();
  const voltar = caminhoSeguro(busca.get("voltar"));
  const { eu, recarregar } = useSessao();
  const [config, setConfig] = useState<ConfigDto | null>(null);
  const [erroConfig, setErroConfig] = useState(false);
  const [modo, setModo] = useState<"cadastrar" | "entrar">("cadastrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.config().then(setConfig, () => setErroConfig(true));
  }, []);

  if (eu) return <Navigate to={voltar} replace />;
  if (eu === undefined || (!config && !erroConfig)) return <Carregando />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const r =
      modo === "cadastrar"
        ? await authClient.signUp.email({ name: nome.trim(), email, password: senha })
        : await authClient.signIn.email({ email, password: senha });
    setEnviando(false);
    if (r.error) {
      setErro(r.error.message || "Não deu certo. Confere os dados?");
      return;
    }
    await recarregar();
  }

  return (
    <div className="entrar">
      <div className="cartao entrar-cartao">
        <div className="entrar-marca">
          <Marca />
          <p>Um cantinho na internet pra encontrar a galera, bater papo e ficar junto.</p>
        </div>

        {erroConfig && <Erro>Não consegui falar com o servidor. Ele está rodando?</Erro>}

        {config && config.provedores.length > 0 && (
          <div className="provedores">
            {config.provedores.map((p) => (
              <button
                key={p}
                className="primario grande"
                onClick={() => void authClient.signIn.social({ provider: p, callbackURL: voltar })}
              >
                Entrar com {NOMES[p]}
              </button>
            ))}
          </div>
        )}

        {config?.devLogin && (
          <>
            {config.provedores.length > 0 && <div className="separador">ou (modo dev)</div>}
            <div className="abas" role="tablist">
              {(["cadastrar", "entrar"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={modo === m}
                  className={modo === m ? "aba ativa" : "aba"}
                  onClick={() => {
                    setModo(m);
                    setErro("");
                  }}
                >
                  {m === "cadastrar" ? "Cadastrar" : "Entrar"}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => void enviar(e)} className="form">
              {modo === "cadastrar" && (
                <label>
                  Nome
                  <input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={40} autoComplete="nickname" />
                </label>
              )}
              <label>
                E-mail
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={modo === "cadastrar" ? "new-password" : "current-password"}
                />
              </label>
              {erro && <Erro>{erro}</Erro>}
              <button className="primario grande" disabled={enviando}>
                {modo === "cadastrar" ? "Criar conta" : "Entrar"}
              </button>
            </form>
          </>
        )}

        {config && !config.devLogin && config.provedores.length === 0 && (
          <Erro>Nenhuma forma de login está configurada neste servidor.</Erro>
        )}
      </div>
    </div>
  );
}
