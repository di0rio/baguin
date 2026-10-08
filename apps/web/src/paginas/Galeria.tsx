import { CATALOGO, PECAS_PADRAO, type Pecas } from "@baguin/shared";
import { useState } from "react";
import { AvatarCanvas } from "../avatar/AvatarCanvas";
import { aleatorio } from "../avatar/aleatorio";
import { ORDEM_DIRECOES, type Movimento } from "../avatar/renderizar";

/** Só em dev: grade de Avatares para conferir o renderizador. ?todos=cabelo|rosto|roupa|acessorio|altura, ?d=baixo,cima, ?e=escala, ?mov=andando|dancando, ?fundo=#hex */
export function Galeria() {
  const [n, setN] = useState(0);
  const params = new URLSearchParams(location.search);
  const escala = Number(params.get("e") ?? 6);
  const dirs = (params.get("d")?.split(",") ?? ORDEM_DIRECOES) as typeof ORDEM_DIRECOES;
  const movimento = (params.get("mov") ?? "parado") as Movimento;
  const lista: Pecas[] = [];
  switch (params.get("todos")) {
    case "cabelo":
      for (const estilo of CATALOGO.cabelos) lista.push({ ...PECAS_PADRAO, cabelo: { ...PECAS_PADRAO.cabelo, estilo } });
      break;
    case "rosto":
      for (const rosto of CATALOGO.rostos) lista.push({ ...PECAS_PADRAO, rosto });
      break;
    case "roupa":
      for (const preenchimento of [...CATALOGO.lisos, ...CATALOGO.estampas]) lista.push({ ...PECAS_PADRAO, roupa: { preenchimento } });
      break;
    case "acessorio":
      for (const acessorio of CATALOGO.acessorios) lista.push({ ...PECAS_PADRAO, acessorio });
      break;
    case "altura":
      for (const altura of CATALOGO.alturas) lista.push({ ...PECAS_PADRAO, altura });
      break;
    default:
      for (let i = 0; i < 8; i++) lista.push(aleatorio());
  }
  return (
    <div style={{ padding: 16, background: params.get("fundo") ?? undefined }}>
      <button onClick={() => setN(n + 1)}>Sortear de novo ({n})</button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }} key={n}>
        {lista.map((p, i) => (
          <div key={i} style={{ display: "flex" }}>
            {dirs.map((d) => (
              <AvatarCanvas key={d} pecas={p} dir={d} movimento={movimento} animado={movimento !== "parado"} escala={escala} sombra />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
