import type { LugarDto, Ouvinte } from "@baguin/shared";
import { criarVozLivekit } from "./vozLivekit";

/**
 * Costura da voz (LiveKit). O mundo chama `criarVoz()`, passa a `FonteMundo` em `iniciar` e
 * mostra `estado()` no HUD. Quem implementa a voz troca só o corpo de `criarVoz`.
 *
 * Contrato:
 * - `iniciar(fonte)` é chamado uma vez ao montar o Mundo; `parar()` ao desmontar (idempotente).
 * - A voz consulta a `FonteMundo` por polling (~200 ms). A fonte sempre devolve o estado atual;
 *   `lugar()` vira `null` durante a passagem entre Lugares (desconectar/reconectar a sala LiveKit).
 * - `estado()` devolve um snapshot imutável, com a MESMA referência enquanto nada mudou
 *   (usado por `useSyncExternalStore`); ao mudar, troque o objeto e chame os assinantes.
 * - `estado().falando` alimenta o Indicador de atividade 🔊 no mundo (contaId de quem fala,
 *   inclusive o próprio).
 */
export type FonteMundo = {
  espacoId: string;
  /** Lugar atual; null enquanto conecta/troca de Lugar. */
  lugar(): LugarDto | null;
  /** O próprio Avatar (posição prevista localmente). null antes de entrar. */
  eu(): Ouvinte | null;
  /** Os outros Avatares do Lugar atual (posição do servidor). */
  outros(): Ouvinte[];
  /** Chaves de `chaveBloqueio(eu, outro)` prontas para o `bloqueados` de `podemSeOuvir`. */
  bloqueados(): ReadonlySet<string>;
  /** epoch ms até quando o próprio Membro está Silenciado (0 = não). Silenciado não publica mic. */
  silenciadoAte(): number;
};

export type VozEstado = {
  /** false → HUD mostra "voz indisponível" e desabilita o botão de mic. */
  disponivel: boolean;
  /** Texto curto de explicação quando indisponível (tooltip). */
  motivo?: string;
  microfone: "ligado" | "mudo";
  /** true enquanto a sala LiveKit do Lugar está conectada (ponto "conectado à voz" no HUD). */
  conectado: boolean;
  /** contaIds falando agora. */
  falando: ReadonlySet<string>;
};

export interface Voz {
  iniciar(fonte: FonteMundo): void;
  parar(): void;
  estado(): VozEstado;
  /** Registra ouvinte de mudança de `estado()`; devolve a função de cancelar. */
  assinar(fn: () => void): () => void;
  alternarMicrofone(): void;
  /** Só para depuração/testes (exposto em `window.__baguin.voz` no dev). */
  depurar?(): VozDebug;
}

export type VozDebug = {
  conectado: boolean;
  sala: string | null;
  microfonePublicado: boolean;
  /** Um item por participante remoto com áudio publicado. */
  remotos: { contaId: string; assinado: boolean; desejado: boolean; alvo: number | null; volume: number | null }[];
};

/** A voz real (LiveKit) vive em `vozLivekit.ts`. */
export function criarVoz(): Voz {
  return criarVozLivekit();
}
