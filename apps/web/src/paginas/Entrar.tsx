import { NOME_MAX, type ConfigDto, type Pecas } from "@baguin/shared";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router";
import { api } from "../api";
import { AvatarCanvas } from "../avatar/AvatarCanvas";
import { authClient, caminhoSeguro } from "../auth";
import { Erro, Marca } from "../componentes";
import { Discord, Google } from "../ui/marcas";
import { Carregando, useSessao } from "../sessao";

const NOMES = { discord: "Discord", google: "Google" } as const;

/** Galera de exemplo da vitrine (só decoração). */
const GALERA: Pecas[] = [
  { pele: 0, cabelo: { estilo: "longo", cor: 4 }, roupa: { estilo: "moletom", cor: 5 }, calca: 2, acessorio: "oculos" },
  { pele: 3, cabelo: { estilo: "curto", cor: 1 }, roupa: { estilo: "camiseta", cor: 2 }, calca: 0, acessorio: "fone" },
  { pele: 2, cabelo: { estilo: "blackpower", cor: 0 }, roupa: { estilo: "regata", cor: 7 }, calca: 3, acessorio: "nenhum" },
  { pele: 4, cabelo: { estilo: "rabo", cor: 3 }, roupa: { estilo: "camiseta", cor: 9 }, calca: 1, acessorio: "chapeu" },
];

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
      <section className="entrar-hero" aria-hidden={false}>
        <Marca grande />
        <div>
          <h1>Um cantinho na internet pra ficar junto.</h1>
          <p className="lead">Crie um Espaço, monte seu Avatar e converse com a galera de pertinho, como se estivessem na mesma sala.</p>
        </div>
        <div className="entrar-palco" aria-hidden>
          {GALERA.map((p, i) => (
            <AvatarCanvas key={i} pecas={p} dir="baixo" escala={5} />
          ))}
        </div>
      </section>

      <main className="entrar-lado">
        <div className="entrar-cartao">
          <div className="entrar-topo">
            <Marca grande />
          </div>
          <div className="entrar-cabeca">
            <h2>{modo === "cadastrar" || !config?.devLogin ? "Bem-vindo ao Baguin" : "Que bom te ver de novo"}</h2>
            <p className="lead">{config?.devLogin && modo === "entrar" ? "Entre para voltar pros seus Espaços." : "Crie sua conta pra montar seu Avatar e entrar num Espaço."}</p>
          </div>

          {erroConfig && (
            <>
              <Erro>Não consegui falar com o servidor. Ele está rodando?</Erro>
              <button className="secundario cheio" onClick={() => location.reload()}>
                Tentar de novo
              </button>
            </>
          )}

          {config && config.provedores.length > 0 && (
            <div className="provedores">
              {config.provedores.map((p) => (
                <button
                  key={p}
                  className={p === "discord" ? "primario btn-discord grande cheio" : "secundario grande cheio"}
                  onClick={() => void authClient.signIn.social({ provider: p, callbackURL: voltar })}
                >
                  {p === "discord" ? <Discord size={20} /> : <Google size={20} />}
                  Continuar com {NOMES[p]}
                </button>
              ))}
            </div>
          )}

          {config?.devLogin && (
            <>
              {config.provedores.length > 0 && (
                <div className="separador">
                  ou entre com e-mail <span className="nota-dev">dev</span>
                </div>
              )}
              <div className="segmentos" role="tablist">
                {(["cadastrar", "entrar"] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    type="button"
                    aria-selected={modo === m}
                    className="segmento"
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
                    <input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={NOME_MAX} autoComplete="nickname" placeholder="Como a galera te chama" />
                  </label>
                )}
                <label>
                  E-mail
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="voce@exemplo.com" />
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
                    placeholder="Pelo menos 8 caracteres"
                  />
                </label>
                {erro && <Erro>{erro}</Erro>}
                <button className="primario grande cheio" disabled={enviando}>
                  {modo === "cadastrar" ? "Criar conta" : "Entrar"}
                </button>
              </form>
            </>
          )}

          {config && !config.devLogin && config.provedores.length === 0 && <Erro>Nenhuma forma de login está configurada neste servidor.</Erro>}
        </div>
      </main>
    </div>
  );
}
