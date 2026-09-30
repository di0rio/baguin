import type { Pecas } from "./pecas.js";
import type { Ambiente, Template } from "./lugares.js";

export const NOME_ROOM = "lugar";
export const PORTA_SERVIDOR = 2567;
export const BALAO_MAX = 200;
export const BALAO_MS = 6000;

/**
 * Códigos de saída da room (`client.leave(codigo)`). Ficam fora da faixa 4000-4010 que o Colyseus
 * reserva (4001 = servidor desligando, 4002 = erro, 4003 = falha ao reconectar).
 */
export const CODIGO_DUPLICADO = 4101;
export const CODIGO_REMOVIDO = 4102;
export const CODIGO_BANIDO = 4103;

export const DIRECOES = ["cima", "baixo", "esquerda", "direita"] as const;
export type Direcao = (typeof DIRECOES)[number];
export const ATIVIDADES = ["nenhuma", "digitando", "ausente"] as const;
export type Atividade = (typeof ATIVIDADES)[number];
export type Papel = "dono" | "moderador" | null;

// ---- Room `lugar` ----

/** Opções de `joinOrCreate("lugar", opcoes)`. `lugarId` é o filtro da room e deve bater com o ingresso. */
export type EntrarOpcoes = { ingresso: string; lugarId: string };

/** Payload do token de ingresso/passagem (JWT HS256, 60 s). */
export type IngressoPayload = { contaId: string; espacoId: string; lugarId: string; x: number; y: number };

// cliente -> servidor (`room.send(tipo, payload)`)
export type MoverMsg = { x: number; y: number; dir: Direcao; movendo: boolean };
export type BalaoEnviarMsg = { texto: string };
export type AtividadeMsg = { atividade: Atividade };
export type NaoPerturbeMsg = { ativo: boolean };
// `porta` não tem payload

export type MensagensCliente = {
  mover: MoverMsg;
  porta: undefined;
  balao: BalaoEnviarMsg;
  atividade: AtividadeMsg;
  naoPerturbe: NaoPerturbeMsg;
};

// servidor -> cliente (`room.onMessage(tipo, ...)`)
export type CorrigirMsg = { x: number; y: number };
export type PassagemMsg = { lugarId: string; ingresso: string };
export type BalaoReceberMsg = { contaId: string; texto: string };
export type BloqueiosMsg = { contaIds: string[] };
export type ModeracaoMsg = { tipo: "silenciado" | "removido" | "banido"; ate?: number };

export type MensagensServidor = {
  corrigir: CorrigirMsg;
  passagem: PassagemMsg;
  balao: BalaoReceberMsg;
  bloqueios: BloqueiosMsg;
  moderacao: ModeracaoMsg;
};

/** Forma do Avatar no estado da room (`state.avatares`, map por contaId). `pecas` é JSON de `Pecas`. */
export type AvatarEstado = {
  contaId: string;
  nome: string;
  pecas: string;
  x: number;
  y: number;
  dir: Direcao;
  movendo: boolean;
  atividade: Atividade;
  naoPerturbe: boolean;
  /** epoch ms; 0 = não silenciado */
  silenciadoAte: number;
};

// ---- API DTOs ----

export type ConfigDto = { provedores: ("discord" | "google")[]; devLogin: boolean; livekitUrl: string };
export type EuDto = { conta: { id: string; nome: string; imagem: string | null }; avatar: Pecas | null };
export type EspacoDto = { id: string; nome: string; criadoEm: string };
export type LugarDto = { id: string; espacoId: string; template: Template; nome: string; ambiente: Ambiente };
export type MembroDto = { contaId: string; nome: string; papel: Papel; silenciadoAte: string | null };
export type EspacoDetalheDto = {
  espaco: EspacoDto;
  lugares: LugarDto[];
  eu: { papel: Papel };
  membros: MembroDto[];
};
export type ConviteDto = {
  codigo: string;
  espacoId: string;
  criadoPor: string;
  expiraEm: string;
  usosMax: number;
  usos: number;
  revogado: boolean;
};
export type ConviteInfoDto = { espacoNome: string; valido: boolean };
export type IngressoDto = { ingresso: string; lugarId: string };
export type LivekitTokenDto = { url: string; token: string };
export type ErroDto = { erro: string };

export const livekitSala = (espacoId: string, lugarId: string) => `${espacoId}:${lugarId}`;
