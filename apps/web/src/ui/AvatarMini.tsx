import type { Pecas } from "@baguin/shared";
import { AvatarCanvas } from "../avatar/AvatarCanvas";
import { FRAME_A, FRAME_L } from "../avatar/renderizar";

type Corte = "cabeca" | "torso" | "corpo";

/** Fração da altura do quadro onde o recorte começa / termina. */
const CORTES: Record<Corte, [number, number]> = {
  cabeca: [0, 0.56],
  torso: [0.34, 0.9],
  corpo: [0, 1],
};

/**
 * Miniatura recortada do Avatar (quadro parado). Usa as constantes do renderizador,
 * então segue funcionando se o tamanho do quadro mudar.
 */
export function AvatarMini({
  pecas,
  escala = 2,
  corte = "cabeca",
  className = "",
}: {
  pecas: Pecas;
  escala?: number;
  corte?: Corte;
  className?: string;
}) {
  const [de, ate] = CORTES[corte];
  const altura = Math.round(FRAME_A * escala * (ate - de));
  const deslocamento = Math.round(FRAME_A * escala * de);
  return (
    <span className={`avatar-mini ${className}`} style={{ width: FRAME_L * escala, height: altura }} aria-hidden>
      <span style={{ marginTop: -deslocamento, display: "flex" }}>
        <AvatarCanvas pecas={pecas} escala={escala} />
      </span>
    </span>
  );
}

const PASTEIS = ["#DDE0FF", "#FFE1D6", "#D7F2E4", "#FFF0C7", "#F3DCF5", "#D6EEF8"];
export const pastelDe = (texto: string) => {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PASTEIS[h % PASTEIS.length];
};

/** Bolha redonda com a cabeça do Avatar; sem Avatar conhecido, mostra a inicial do nome. */
export function AvatarBolha({ pecas, nome, tamanho = 40 }: { pecas?: Pecas | null; nome: string; tamanho?: number }) {
  return (
    <span className="bolha" style={{ width: tamanho, height: tamanho, background: pastelDe(nome) }}>
      {pecas ? <AvatarMini pecas={pecas} escala={2} corte="cabeca" /> : <span className="bolha-inicial">{nome.trim().charAt(0).toUpperCase()}</span>}
    </span>
  );
}
