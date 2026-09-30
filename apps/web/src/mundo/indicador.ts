import type { Atividade } from "@baguin/shared";

export type DadosIndicador = { atividade: Atividade; naoPerturbe: boolean; silenciadoAte: number };

/** Emoji do Indicador de atividade de um Avatar ("" = nenhum). Prioridade de cima para baixo. */
export function indicadorDe(av: DadosIndicador, falando: boolean, agora: number): string {
  if (av.silenciadoAte > agora) return "🔇";
  if (av.naoPerturbe) return "🔕";
  if (av.atividade === "digitando") return "💬";
  if (falando) return "🔊";
  if (av.atividade === "ausente") return "💤";
  return "";
}
