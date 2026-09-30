import { podemSeOuvir, volume, type ContextoLugar, type Ouvinte } from "@baguin/shared";

/** Regras puras da voz (sem LiveKit nem DOM): o que conectar, assinar, ouvir e publicar. */

/** Tempo sem ninguém para ouvir antes de desconectar da sala LiveKit. */
export const GRACA_DESCONEXAO_MS = 30_000;
const ESPERA_MIN_MS = 5_000;
const ESPERA_MAX_MS = 60_000;

/** contaId → volume alvo (0–1) de cada Avatar que eu posso ouvir. Não perturbe = ninguém. */
export function alvosDeVoz(
  eu: Ouvinte,
  outros: readonly Ouvinte[],
  lugar: ContextoLugar,
  bloqueados: ReadonlySet<string>,
): Map<string, number> {
  const alvos = new Map<string, number>();
  if (eu.naoPerturbe) return alvos;
  for (const o of outros) {
    if (o.contaId !== eu.contaId && podemSeOuvir(eu, o, lugar, bloqueados)) {
      alvos.set(o.contaId, volume(eu, o, lugar));
    }
  }
  return alvos;
}

export type EntradaConexao = {
  conectado: boolean;
  conectando: boolean;
  temAlvos: boolean;
  agora: number;
  /** Desde quando não há ninguém para ouvir (null = há, ou ainda não contou). */
  vazioDesde: number | null;
  /** Só tenta conectar a partir daqui (backoff depois de falha). */
  proximaTentativa: number;
};

/** Conecta só com alguém para ouvir; desconecta GRACA_DESCONEXAO_MS depois de esvaziar. */
export function decidirConexao(i: EntradaConexao): { acao: "conectar" | "desconectar" | "nada"; vazioDesde: number | null } {
  if (i.temAlvos) {
    const acao = !i.conectado && !i.conectando && i.agora >= i.proximaTentativa ? "conectar" : "nada";
    return { acao, vazioDesde: null };
  }
  if (!i.conectado) return { acao: "nada", vazioDesde: null };
  const desde = i.vazioDesde ?? i.agora;
  return { acao: i.agora - desde >= GRACA_DESCONEXAO_MS ? "desconectar" : "nada", vazioDesde: desde };
}

/** Espera antes da tentativa `falhas` (1ª falha = 5 s, dobrando até 60 s). */
export const esperaBackoff = (falhas: number): number =>
  Math.min(ESPERA_MAX_MS, ESPERA_MIN_MS * 2 ** Math.max(0, falhas - 1));

/** Anda de `atual` até `alvo` no máximo `passo` (evita estalos quando o volume muda). */
export function suavizar(atual: number, alvo: number, passo: number): number {
  if (Math.abs(alvo - atual) <= passo) return alvo;
  return atual + Math.sign(alvo - atual) * passo;
}

export type EntradaMic = {
  conectado: boolean;
  preferencia: "ligado" | "mudo";
  silenciado: boolean;
  naoPerturbe: boolean;
  /** getUserMedia negado/indisponível nesta sessão. */
  bloqueado: boolean;
};

/** Mic só existe publicado quando conectado, ligado, sem Silenciar, sem Não perturbe e com permissão. */
export const devePublicarMic = (i: EntradaMic): boolean =>
  i.conectado && i.preferencia === "ligado" && !i.silenciado && !i.naoPerturbe && !i.bloqueado;
