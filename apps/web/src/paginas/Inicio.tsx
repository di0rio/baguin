import type { EspacoDto } from "@baguin/shared";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { api } from "../api";
import { Erro, Pagina } from "../componentes";
import { Carregando } from "../sessao";

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
      <section>
        {aviso && <Erro>{aviso}</Erro>}
        <h1>Seus Espaços</h1>
        {erro && <Erro>{erro}</Erro>}
        {!espacos && !erro && <Carregando />}
        {espacos && espacos.length === 0 && (
          <p className="vazio">Você ainda não está em nenhum Espaço. Crie o primeiro aí embaixo ou peça um Convite pra alguém.</p>
        )}
        {espacos && espacos.length > 0 && (
          <ul className="lista-espacos">
            {espacos.map((e) => (
              <li key={e.id}>
                <Link to={`/e/${e.id}`} className="cartao espaco-item">
                  <span className="espaco-nome">{e.nome}</span>
                  <span className="espaco-ir">Entrar →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cartao">
        <h2>Criar um Espaço</h2>
        <form onSubmit={(e) => void criar(e)} className="linha-form">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do Espaço (ex.: QG da galera)"
            maxLength={60}
            aria-label="Nome do Espaço"
          />
          <button className="primario" disabled={criando || !nome.trim()}>
            Criar
          </button>
        </form>
      </section>

      <p className="rodape-link">
        <Link to="/avatar">Editar meu Avatar</Link>
      </p>
    </Pagina>
  );
}
