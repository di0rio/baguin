import type { EspacoDto } from "@baguin/shared";
import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, DoorOpen, Plus, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { api } from "../api";
import { Erro, Pagina } from "../componentes";
import { pastelDe } from "../ui/AvatarMini";
import { Carregando } from "../sessao";

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });

function FormCriar({ nome, setNome, criando, criar, id }: { nome: string; setNome: (n: string) => void; criando: boolean; criar: (e: FormEvent) => void; id: string }) {
  return (
    <form onSubmit={criar} className="form">
      <input id={id} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: QG da galera" maxLength={60} aria-label="Nome do Espaço" />
      <button className="primario cheio" disabled={criando || !nome.trim()}>
        Criar Espaço
      </button>
    </form>
  );
}

export function Inicio() {
  const nav = useNavigate();
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso;
  const [espacos, setEspacos] = useState<EspacoDto[] | null>(null);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    api.espacos().then(setEspacos, (e: Error) => setErro(e.message));
  }, []);

  async function criar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setErro("");
    setCriando(true);
    try {
      const d = await api.criarEspaco(nome.trim());
      nav(`/e/${d.espaco.id}`);
    } catch (err) {
      setErro((err as Error).message);
      setCriando(false);
    }
  }

  return (
    <Pagina>
      <div className="titulo-pagina">
        <h1>Seus Espaços</h1>
        <p className="lead">Entre num Espaço pra encontrar a galera ou crie um novo.</p>
      </div>
      {aviso && <Erro>{aviso}</Erro>}
      {erro && <Erro>{erro}</Erro>}
      {!espacos && !erro && (
        <div role="status" className="estado">
          <span className="giro" />
        </div>
      )}

      {espacos && (
        <ul className="grade-espacos">
          {espacos.length === 0 && (
            <li className="vazio-card cartao">
              <span className="estado-icone">
                <Sparkles size={26} strokeWidth={2} aria-hidden />
              </span>
              <h2>Você ainda não está em nenhum Espaço</h2>
              <p>Crie o primeiro aqui do lado ou peça um Convite pra alguém que já tem um Espaço.</p>
            </li>
          )}
          {espacos.map((e) => (
            <li key={e.id}>
              <article className="cartao espaco-card">
                <div className="espaco-capa" style={{ background: pastelDe(e.id) }}>
                  <span className="espaco-inicial" aria-hidden>
                    {e.nome.trim().charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="espaco-info">
                  <h2 className="espaco-nome">{e.nome}</h2>
                  <span className="espaco-data">
                    <CalendarDays size={14} strokeWidth={2} aria-hidden />
                    Criado em {data(e.criadoEm)}
                  </span>
                </div>
                <div className="espaco-rodape">
                  <Link to={`/e/${e.id}`} className="primario cheio" aria-label={`Entrar em ${e.nome}`}>
                    <DoorOpen size={18} strokeWidth={2} aria-hidden />
                    Entrar
                  </Link>
                </div>
              </article>
            </li>
          ))}
          <li>
            <section className="cartao criar-card" aria-labelledby="criar-titulo">
              <span className="estado-icone">
                <Plus size={22} strokeWidth={2} aria-hidden />
              </span>
              <h2 id="criar-titulo">Criar um Espaço</h2>
              <FormCriar id="novo-espaco" nome={nome} setNome={setNome} criando={criando} criar={(e) => void criar(e)} />
            </section>
          </li>
        </ul>
      )}
    </Pagina>
  );
}
