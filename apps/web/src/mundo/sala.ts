import {
  CODIGO_BANIDO,
  CODIGO_DUPLICADO,
  CODIGO_REMOVIDO,
  NOME_ROOM,
  chaveBloqueio,
  type Atividade,
  type AvatarEstado,
  type BalaoReceberMsg,
  type BloqueiosMsg,
  type CorrigirMsg,
  type EntrarOpcoes,
  type LugarDto,
  type ModeracaoMsg,
  type MoverMsg,
  type Pecas,
  type PassagemMsg,
  type Template,
} from "@baguin/shared";
import { Callbacks, Client, type Room } from "@colyseus/sdk";
import { api } from "../api";
import { Emissor } from "./emissor";
import type { FonteMundo } from "./voz";

const COLYSEUS_URL = import.meta.env.VITE_COLYSEUS_URL ?? "http://localhost:2567";

const AUSENTE_MS = 5 * 60_000;
const FADE_MS = 200;
/** Esperas entre tentativas de reconexão (a primeira tentativa é imediata). */
const ESPERAS_RECONEXAO = [1000, 2000, 4000, 6000, 8000];

export type Status = "conectando" | "online" | "trocando" | "reconectando" | "outra-aba" | "desconectado" | "expulso";

function lerPecas(json: string): Pecas | null {
  try {
    return JSON.parse(json) as Pecas;
  } catch {
    return null;
  }
}

export type Presente = { contaId: string; nome: string; naoPerturbe: boolean; silenciadoAte: number; pecas: Pecas | null };

/** Snapshot imutável para o HUD (trocado por outro objeto a cada mudança). */
export type HudEstado = {
  status: Status;
  lugar: LugarDto | null;
  presentes: Presente[];
  naoPerturbe: boolean;
  /** epoch ms; 0 = não silenciado */
  silenciadoAte: number;
};

type Eventos = {
  hud: void;
  entrou: LugarDto | null;
  saindo: void;
  avatarEntrou: AvatarEstado;
  avatarSaiu: string;
  balao: BalaoReceberMsg;
  corrigir: CorrigirMsg;
  expulso: "removido" | "banido";
  aviso: string;
};

/** O estado chega por reflexão (sem a classe do schema), então tipamos só o que usamos. */
type CallbacksAvatares = {
  onAdd(campo: "avatares", fn: (av: AvatarEstado, chave: string) => void): void;
  onRemove(campo: "avatares", fn: (av: AvatarEstado, chave: string) => void): void;
  listen(av: AvatarEstado, campo: "silenciadoAte" | "naoPerturbe", fn: () => void): void;
};

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Conexão do mundo: cliente Colyseus, troca de Lugar (passagem), reconexão e o estado que o HUD
 * e o Phaser compartilham. Não conhece Phaser nem React.
 */
export class Sala extends Emissor<Eventos> {
  readonly avatares = new Map<string, AvatarEstado>();
  /** Posição prevista do próprio Avatar; a cena escreve a cada quadro. */
  eu: { x: number; y: number } | null = null;

  private client = new Client(COLYSEUS_URL);
  private room: Room | null = null;
  private lugarAtual: LugarDto | null = null;
  private geracao = 0;
  private status: Status = "conectando";
  private bloqueiosIds = new Set<string>();
  private naoPerturbe = false;
  private digitando = false;
  private ausente = false;
  private atividadeEnviada: Atividade = "nenhuma";
  private ultimoInput = Date.now();
  private hud: HudEstado;
  private hudPendente = false;
  private assinantes = new Set<() => void>();
  private limparDom: () => void = () => {};

  constructor(
    readonly espacoId: string,
    readonly contaId: string,
    private lugares: LugarDto[],
  ) {
    super();
    this.hud = this.montarHud();
    this.observarInput();
  }

  // ---- HUD (useSyncExternalStore) ----

  assinar = (fn: () => void) => {
    this.assinantes.add(fn);
    return () => void this.assinantes.delete(fn);
  };
  estado = () => this.hud;

  get lugar() {
    return this.lugarAtual;
  }

  /** Nome do Lugar do Espaço que usa esse template (rótulo das portas). */
  nomeDoLugar(template: Template): string {
    return this.lugares.find((l) => l.template === template)?.nome ?? template;
  }

  private montarHud(): HudEstado {
    const presentes: Presente[] = [...this.avatares.values()].map((a) => ({
      contaId: a.contaId,
      nome: a.nome,
      naoPerturbe: a.naoPerturbe,
      silenciadoAte: a.silenciadoAte,
      pecas: lerPecas(a.pecas),
    }));
    const meu = this.avatares.get(this.contaId);
    return {
      status: this.status,
      lugar: this.lugarAtual,
      presentes,
      naoPerturbe: this.naoPerturbe,
      silenciadoAte: meu?.silenciadoAte ?? 0,
    };
  }

  /** Agrupa várias mudanças do mesmo tick numa só notificação. */
  private atualizarHud() {
    if (this.hudPendente) return;
    this.hudPendente = true;
    queueMicrotask(() => {
      this.hudPendente = false;
      this.hud = this.montarHud();
      for (const fn of [...this.assinantes]) fn();
    });
  }

  private mudarStatus(s: Status) {
    this.status = s;
    this.atualizarHud();
  }

  // ---- ciclo de vida ----

  iniciar() {
    void this.conectar();
  }

  /** Reconexão manual (botão do HUD). */
  reconectar() {
    this.mudarStatus("reconectando");
    void this.conectar();
  }

  dispose() {
    this.geracao++;
    this.limparDom();
    const room = this.room;
    this.room = null;
    void room?.leave().catch(() => {});
  }

  /** Tenta entrar (com `dados` na primeira tentativa, se houver; depois com ingresso novo). */
  private async conectar(dados?: { lugarId: string; ingresso: string }) {
    const g = ++this.geracao;
    for (let i = 0; i <= ESPERAS_RECONEXAO.length; i++) {
      if (i > 0) {
        this.mudarStatus("reconectando");
        await dormir(ESPERAS_RECONEXAO[i - 1]);
        if (g !== this.geracao) return;
      }
      try {
        const d = i === 0 && dados ? dados : await api.ingresso(this.espacoId);
        if (g !== this.geracao) return;
        const opcoes: EntrarOpcoes = { ingresso: d.ingresso, lugarId: d.lugarId };
        const room = await this.client.joinOrCreate(NOME_ROOM, opcoes);
        if (g !== this.geracao) {
          void room.leave().catch(() => {});
          return;
        }
        this.anexar(room, d.lugarId);
        return;
      } catch (e) {
        if (g !== this.geracao) return;
        console.warn("falha ao entrar na room", e);
      }
    }
    this.mudarStatus("desconectado");
  }

  private anexar(room: Room, lugarId: string) {
    // o servidor não usa allowReconnection: quem reentra com ingresso novo somos nós
    room.reconnection.enabled = false;
    this.room = room;
    this.lugarAtual = this.lugares.find((l) => l.id === lugarId) ?? null;
    this.avatares.clear();
    this.bloqueiosIds = new Set();
    this.status = "online";
    this.atividadeEnviada = "nenhuma"; // a room nova começa em "nenhuma"
    this.emitir("entrou", this.lugarAtual);

    room.onMessage("corrigir", (m: CorrigirMsg) => this.emitir("corrigir", m));
    room.onMessage("balao", (m: BalaoReceberMsg) => this.emitir("balao", m));
    room.onMessage("passagem", (m: PassagemMsg) => void this.trocar(m));
    room.onMessage("bloqueios", (m: BloqueiosMsg) => {
      this.bloqueiosIds = new Set(m.contaIds);
    });
    room.onMessage("moderacao", (m: ModeracaoMsg) => {
      if (m.tipo === "silenciado" && m.ate) {
        this.emitir("aviso", `Você foi silenciado até ${new Date(m.ate).toLocaleTimeString("pt-BR", { timeStyle: "short" })}.`);
      }
    });
    room.onLeave((code: number) => this.aoSair(room, code));

    const cb = Callbacks.get(room) as unknown as CallbacksAvatares;
    cb.onAdd("avatares", (av: AvatarEstado, chave: string) => {
      this.avatares.set(chave, av);
      cb.listen(av, "silenciadoAte", () => this.atualizarHud());
      cb.listen(av, "naoPerturbe", () => this.atualizarHud());
      this.emitir("avatarEntrou", av);
      this.atualizarHud();
    });
    cb.onRemove("avatares", (_av: AvatarEstado, chave: string) => {
      this.avatares.delete(chave);
      this.emitir("avatarSaiu", chave);
      this.atualizarHud();
    });

    // a room nova não conhece nosso Não perturbe nem nossa atividade
    if (this.naoPerturbe) room.send("naoPerturbe", { ativo: true });
    this.enviarAtividade();
    this.atualizarHud();
  }

  private aoSair(room: Room, code: number) {
    if (room !== this.room) return; // saída provocada por nós (troca/dispose)
    this.room = null;
    if (code === CODIGO_REMOVIDO || code === CODIGO_BANIDO) {
      this.mudarStatus("expulso");
      this.emitir("expulso", code === CODIGO_BANIDO ? "banido" : "removido");
    } else if (code === CODIGO_DUPLICADO) {
      this.mudarStatus("outra-aba");
    } else {
      void this.conectar();
    }
  }

  private async trocar(p: PassagemMsg) {
    const antiga = this.room;
    if (!antiga || this.status !== "online") return;
    this.room = null; // as saídas desta room passam a ser ignoradas
    this.mudarStatus("trocando");
    this.emitir("saindo", undefined);
    await Promise.all([antiga.leave().catch(() => {}), dormir(FADE_MS)]);
    await this.conectar(p);
  }

  // ---- envio ----

  mover(m: MoverMsg) {
    this.room?.send("mover", m);
  }
  porta() {
    this.room?.send("porta");
  }

  /** false se silenciado ou sem conexão. */
  enviarBalao(texto: string): boolean {
    if (!this.room || this.silenciadoAte() > Date.now()) return false;
    this.room.send("balao", { texto });
    return true;
  }

  alternarNaoPerturbe() {
    this.naoPerturbe = !this.naoPerturbe;
    this.room?.send("naoPerturbe", { ativo: this.naoPerturbe });
    this.atualizarHud();
  }

  setDigitando(v: boolean) {
    this.digitando = v;
    this.enviarAtividade();
  }

  private enviarAtividade() {
    const desejada: Atividade = this.digitando ? "digitando" : this.ausente ? "ausente" : "nenhuma";
    if (desejada === this.atividadeEnviada) return;
    this.atividadeEnviada = desejada;
    this.room?.send("atividade", { atividade: desejada });
  }

  private observarInput() {
    const ativo = () => {
      this.ultimoInput = Date.now();
      if (this.ausente) {
        this.ausente = false;
        this.enviarAtividade();
      }
    };
    const visibilidade = () => {
      if (document.hidden) {
        this.ausente = true;
        this.enviarAtividade();
      } else ativo();
    };
    const relogio = setInterval(() => {
      if (!this.ausente && Date.now() - this.ultimoInput > AUSENTE_MS) {
        this.ausente = true;
        this.enviarAtividade();
      }
    }, 5000);
    const eventos = ["keydown", "pointerdown", "pointermove"] as const;
    for (const e of eventos) window.addEventListener(e, ativo, { passive: true });
    document.addEventListener("visibilitychange", visibilidade);
    this.limparDom = () => {
      clearInterval(relogio);
      for (const e of eventos) window.removeEventListener(e, ativo);
      document.removeEventListener("visibilitychange", visibilidade);
    };
  }

  // ---- leitura ----

  silenciadoAte(): number {
    return this.avatares.get(this.contaId)?.silenciadoAte ?? 0;
  }

  /** Interface que a voz consulta (ver voz.ts). */
  fonte(): FonteMundo {
    return {
      espacoId: this.espacoId,
      lugar: () => (this.status === "online" ? this.lugarAtual : null),
      eu: () => {
        const av = this.avatares.get(this.contaId);
        if (!av) return null;
        const p = this.eu ?? av;
        return { contaId: this.contaId, x: p.x, y: p.y, naoPerturbe: this.naoPerturbe };
      },
      outros: () =>
        [...this.avatares.values()]
          .filter((a) => a.contaId !== this.contaId)
          .map((a) => ({ contaId: a.contaId, x: a.x, y: a.y, naoPerturbe: a.naoPerturbe })),
      bloqueados: () => new Set([...this.bloqueiosIds].map((id) => chaveBloqueio(this.contaId, id))),
      silenciadoAte: () => this.silenciadoAte(),
    };
  }
}
