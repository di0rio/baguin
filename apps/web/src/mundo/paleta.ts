/**
 * Tons do mundo, num lugar só. Tinta e papel, mais três degraus de papel para dar volume (parede mais clara,
 * chão creme, sombra chapada mais escura). O amarelo é reservado: Zona onde você está e Móvel alcançável.
 *
 * O mundo não segue o tema da interface. Quando o Período e a Luz entrarem, o modo escuro do cenário é outra
 * paleta com as mesmas chaves (`usarPaleta`): quem desenha só lê `MUNDO`, então a troca é local.
 */
export type PaletaMundo = {
  tinta: string;
  /** Papel puro: Preenchimento claro dos Móveis, rótulos e balões. */
  papel: string;
  /** Face das paredes: o tom mais claro do cenário. */
  parede: string;
  /** Chão creme. */
  chao: string;
  /** Faces em sombra dos Móveis, tapetes. */
  meio: string;
  /** Sombra chapada (no chão, sob Móveis) e topo das paredes. */
  sombra: string;
  /** Fora do mapa, quando a janela é maior que o Lugar. */
  fora: string;
  amarelo: string;
};

export const CLARA: PaletaMundo = {
  tinta: "#000000",
  papel: "#FFFFFF",
  parede: "#FDFCFA",
  chao: "#F6F4EE",
  meio: "#EAE6DB",
  sombra: "#D8D4C6",
  fora: "#D8D4C6",
  amarelo: "#FFD23F",
};

/** Paleta em uso (objeto único, mutado no lugar). Trocar para o escuro (Período, etapa 4) é `usarPaleta` e refazer as texturas. */
export const MUNDO: PaletaMundo = { ...CLARA };

export function usarPaleta(p: PaletaMundo) {
  Object.assign(MUNDO, p);
}

/** `#RRGGBB` para `[r, g, b]`. */
export const rgb = (c: string): [number, number, number] => [
  parseInt(c.slice(1, 3), 16),
  parseInt(c.slice(3, 5), 16),
  parseInt(c.slice(5, 7), 16),
];
