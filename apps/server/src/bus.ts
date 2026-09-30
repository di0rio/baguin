import { EventEmitter } from "node:events";

export type EventoModeracao = {
  tipo: "silenciado" | "removido" | "banido";
  espacoId: string;
  contaId: string;
  /** epoch ms; só em "silenciado" */
  ate?: number;
};
export type EventoBloqueio = { contaId: string; bloqueadoId: string; ativo: boolean };

/** Bus em memória (processo único): a API publica, as rooms escutam. */
export const bus = new EventEmitter<{
  moderacao: [EventoModeracao];
  bloqueio: [EventoBloqueio];
}>();
bus.setMaxListeners(0); // uma room viva escuta cada evento; o número de rooms não é limitado
