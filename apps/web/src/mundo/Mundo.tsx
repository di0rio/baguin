import type { EspacoDetalheDto } from "@baguin/shared";
import { Link } from "react-router";
import { Pagina } from "../componentes";

/** Placeholder: a parte 2 monta aqui o Phaser + HUD do Espaço. */
export function Mundo({ detalhe }: { detalhe: EspacoDetalheDto }) {
  // TODO(parte 2): Phaser (Lugar, Avatares), cliente Colyseus (VITE_COLYSEUS_URL), HUD e voz LiveKit.
  const { espaco, lugares, membros, eu } = detalhe;
  return (
    <Pagina>
      <Link to="/">← Meus Espaços</Link>
      <h1>{espaco.nome}</h1>
      <p className="etiqueta">Aqui vai o mundo (em construção). Seu Papel: {eu.papel ?? "Membro"}</p>
      <div className="grade-2">
        <section className="cartao">
          <h2>Lugares</h2>
          <ul className="simples">
            {lugares.map((l) => (
              <li key={l.id}>
                {l.nome} <span className="etiqueta">({l.template}, {l.ambiente})</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="cartao">
          <h2>Membros ({membros.length})</h2>
          <ul className="simples">
            {membros.map((m) => (
              <li key={m.contaId}>
                {m.nome} {m.papel && <span className="etiqueta">({m.papel})</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Pagina>
  );
}
