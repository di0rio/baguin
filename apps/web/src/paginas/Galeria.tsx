import { CATALOGO, PECAS_PADRAO, type Pecas } from "@baguin/shared";
import { useState } from "react";
import { AvatarCanvas } from "../avatar/AvatarCanvas";
import { aleatorio } from "../avatar/aleatorio";
import { ORDEM_DIRECOES } from "../avatar/renderizar";

/** Só em dev: grade de Avatares para conferir o renderizador. */
export function Galeria() {
  const [n, setN] = useState(0);
  const params = new URLSearchParams(location.search);
  const escala = Number(params.get("e") ?? 6);
  const dirs = (params.get("d")?.split(",") ?? ORDEM_DIRECOES) as typeof ORDEM_DIRECOES;
  const estilo = params.get("cabelo");
  const lista: Pecas[] = [];
  if (params.get("todos") === "cabelo") {
    for (const estilo of CATALOGO.cabeloEstilos) lista.push({ ...PECAS_PADRAO, cabelo: { estilo, cor: 1 } });
  } else if (params.get("todos") === "roupa") {
    for (const estilo of CATALOGO.roupaEstilos) lista.push({ ...PECAS_PADRAO, calca: 1, roupa: { estilo, cor: 3 } });
  } else if (params.get("todos") === "acessorio") {
    for (const acessorio of CATALOGO.acessorios) lista.push({ ...PECAS_PADRAO, acessorio });
  } else {
    for (let i = 0; i < 8; i++) lista.push(aleatorio());
  }
  void estilo;
  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => setN(n + 1)}>Sortear de novo ({n})</button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }} key={n}>
        {lista.map((p, i) => (
          <div key={i} style={{ display: "flex", background: "#3a3350", padding: 6 }}>
            {dirs.map((d) => (
              <AvatarCanvas key={d} pecas={p} dir={d} escala={escala} quadro={Number(params.get("f") ?? 0)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
