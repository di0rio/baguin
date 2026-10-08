import { NOME_MAX, type ConfigDto } from "@baguin/shared";
import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { api } from "../api";
import { AvatarCanvas } from "../avatar/AvatarCanvas";
import { authClient, caminhoSeguro } from "../auth";
import { BotaoTema } from "../components/cabecalho";
import { Carregando } from "../components/carregando";
import { Erro } from "../components/erro";
import { Assinatura, Logo, Marca } from "../components/marca";
import { Discord, Google } from "../components/provedores";
import { Button } from "../components/ui/button";
import { Field, FieldError, FieldLabel } from "../components/ui/field";
import { Form } from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../components/ui/tabs";
import { PECAS_VITRINE } from "../avatar/aleatorio";
import { useSessao } from "../sessao";

const NOMES = { discord: "Discord", google: "Google" } as const;

type Modo = "cadastrar" | "entrar";

export function Entrar() {
  const [busca] = useSearchParams();
  const voltar = caminhoSeguro(busca.get("voltar"));
  const { eu, recarregar } = useSessao();
  const [config, setConfig] = useState<ConfigDto | null>(null);
  const [erroConfig, setErroConfig] = useState(false);
  const [modo, setModo] = useState<Modo>("cadastrar");
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

  async function enviar() {
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

  const provedores = config?.provedores ?? [];
  const cadastrando = modo === "cadastrar";

  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r p-10 lg:flex">
        <Marca />
        <div className="flex max-w-lg flex-col gap-4">
          <h1 className="text-balance font-bold font-heading text-5xl tracking-[-0.03em]">um cantinho na internet pra ficar junto.</h1>
          <p className="text-pretty text-lg text-muted-foreground leading-relaxed">
            Crie um Espaço, monte seu Avatar e converse com a galera de pertinho, como se estivessem na mesma sala.
          </p>
        </div>
        <div aria-hidden className="relative -mx-2 flex items-end justify-center gap-3 pt-6">
          <div className="absolute inset-x-6 bottom-1 h-3 rounded-[50%] bg-foreground/10" />
          {PECAS_VITRINE.map((p, i) => (
            <AvatarCanvas key={i} pecas={p} dir="baixo" escala={6} className={i % 2 ? "translate-y-0" : "-translate-y-2"} />
          ))}
        </div>
      </aside>

      <div className="flex min-h-svh flex-col">
        <div className="flex h-16 items-center justify-end px-4 sm:px-6 lg:px-8">
          <BotaoTema />
        </div>
        <main className="flex flex-1 items-start justify-center px-4 pb-8 sm:items-center sm:px-6">
          <div className="tom-alto flex w-full max-w-sm flex-col gap-7 rounded-2xl bg-card p-6 sm:p-8">
            <div className="flex flex-col gap-3 max-lg:items-center max-lg:text-center">
              <Logo className="size-10 lg:hidden" />
              <h2 className="font-bold font-heading text-2xl tracking-[-0.03em]">{cadastrando ? "bem-vindo ao Baguin" : "que bom te ver de novo"}</h2>
              <p className="text-pretty text-muted-foreground">{cadastrando ? "Crie sua conta pra montar seu Avatar e entrar num Espaço." : "Entre pra voltar pros seus Espaços."}</p>
            </div>

            {erroConfig && (
              <div className="flex flex-col gap-3">
                <Erro>Não consegui falar com o servidor. Ele está rodando?</Erro>
                <Button variant="outline" onClick={() => location.reload()}>
                  Tentar de novo
                </Button>
              </div>
            )}

            {provedores.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {provedores.map((p) => (
                  <Button
                    key={p}
                    size="lg"
                    variant="outline"
                    className="w-full"
                    onClick={() => void authClient.signIn.social({ provider: p, callbackURL: voltar })}
                  >
                    {p === "discord" ? <Discord size={20} /> : <Google size={20} />}
                    Continuar com {NOMES[p]}
                  </Button>
                ))}
              </div>
            )}

            {config?.devLogin && (
              <div className="flex flex-col gap-5">
                {provedores.length > 0 && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    ou entre com e-mail
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <Tabs
                  value={modo}
                  onValueChange={(v) => {
                    setModo(v as Modo);
                    setErro("");
                  }}
                >
                  <TabsList className="w-full">
                    <TabsTab className="flex-1" value="cadastrar">
                      Cadastrar
                    </TabsTab>
                    <TabsTab className="flex-1" value="entrar">
                      Entrar
                    </TabsTab>
                  </TabsList>
                  <TabsPanel value={modo} className="pt-3">
                    <Form className="gap-4" onSubmit={() => void enviar()}>
                      {cadastrando && (
                        <Field>
                          <FieldLabel>Nome</FieldLabel>
                          <Input name="nome" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={NOME_MAX} autoComplete="nickname" placeholder="Como a galera te chama" />
                          <FieldError match="valueMissing">Diga como a galera te chama.</FieldError>
                        </Field>
                      )}
                      <Field>
                        <FieldLabel>E-mail</FieldLabel>
                        <Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="voce@exemplo.com" />
                        <FieldError>Confere o e-mail, parece que algo faltou.</FieldError>
                      </Field>
                      <Field>
                        <FieldLabel>Senha</FieldLabel>
                        <Input
                          name="senha"
                          type="password"
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          required
                          minLength={8}
                          autoComplete={cadastrando ? "new-password" : "current-password"}
                          placeholder="Pelo menos 8 caracteres"
                        />
                        <FieldError>A senha precisa ter pelo menos 8 caracteres.</FieldError>
                      </Field>
                      {erro && <Erro>{erro}</Erro>}
                      <Button type="submit" variant="brand" size="lg" loading={enviando} className="w-full">
                        {cadastrando ? "Criar conta" : "Entrar"}
                      </Button>
                    </Form>
                  </TabsPanel>
                </Tabs>
              </div>
            )}

            {config && !config.devLogin && provedores.length === 0 && <Erro>Nenhuma forma de login está configurada neste servidor.</Erro>}
          </div>
        </main>
        <footer className="flex h-14 items-center px-4 sm:px-6 lg:px-8">
          <Assinatura />
        </footer>
      </div>
    </div>
  );
}
