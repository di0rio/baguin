import type { Atividade } from "@baguin/shared";

export type DadosIndicador = { atividade: Atividade; naoPerturbe: boolean; silenciadoAte: number };
export type StatusAvatar = "online" | "ausente" | "naoPerturbe";

/** Emoji do Indicador de atividade de um Avatar ("" = nenhum). Prioridade de cima para baixo. */
export function indicadorDe(av: DadosIndicador, falando: boolean, agora: number): string {
  if (av.silenciadoAte > agora) return "🔇";
  if (av.naoPerturbe) return "🔕";
  if (av.atividade === "digitando") return "💬";
  if (falando) return "🔊";
  if (av.atividade === "ausente") return "💤";
  return "";
}

/** Cor da bolinha na etiqueta de nome: verde online, amarelo ausente, vermelho Não perturbe. */
export function statusDe(av: Pick<DadosIndicador, "atividade" | "naoPerturbe">): StatusAvatar {
  if (av.naoPerturbe) return "naoPerturbe";
  if (av.atividade === "ausente") return "ausente";
  return "online";
}
