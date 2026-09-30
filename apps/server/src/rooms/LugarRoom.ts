import {
  ATIVIDADES,
  BALAO_MAX,
  NOME_MAX,
  CODIGO_BANIDO,
  CODIGO_DUPLICADO,
  CODIGO_REMOVIDO,
  DIRECOES,
  TEMPLATES_LUGAR,
  VELOCIDADE,
  bloqueado,
  centroTile,
  chaveBloqueio,
  podemSeOuvir,
  portaEm,
  type Ambiente,
  type BalaoReceberMsg,
  type BloqueiosMsg,
  type CorrigirMsg,
  type ModeracaoMsg,
  type PassagemMsg,
  type Template,
} from "@baguin/shared";
import { Room, type Client } from "colyseus";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { bus, type EventoBloqueio, type EventoModeracao } from "../bus.js";
import { db, schema } from "../db/index.js";
import { assinarIngresso, verificarIngresso } from "../ingresso.js";
import { AvatarEstado, LugarEstado } from "./estado.js";

const { avatar, lugar, membro, user, bloqueio } = schema;

/** Dados que o `onAuth` estático entrega ao `onJoin` (`client.auth`). */
type Auth = {
  contaId: string;
  espacoId: string;
  lugarId: string;
  nome: string;
  pecas: string;
  x: number;
  y: number;
  silenciadoAte: number;
};


const ORCAMENTO_FATOR = 1.2;
const ORCAMENTO_TETO_S = 0.5;
const PASSO_COLISAO = 8;

const moverSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  dir: z.enum(DIRECOES),
  movendo: z.boolean(),
});
const balaoSchema = z.object({ texto: z.string().max(BALAO_MAX * 2) });
const BALAO_COOLDOWN_MS = 500;
const atividadeSchema = z.object({ atividade: z.enum(ATIVIDADES) });
const naoPerturbeSchema = z.object({ ativo: z.boolean() });

/** Uma Conta só pode estar em um Lugar por vez, em qualquer room do processo. */
const ativos = new Map<string, Client>();

/** A Conta está agora dentro da room deste Lugar? (condição para receber token de voz) */
export const estaNoLugar = (contaId: string, lugarId: string) =>
  (ativos.get(contaId)?.auth as Auth | undefined)?.lugarId === lugarId;

type Jogador = { client: Client; orcamento: number; ultimo: number; ultimoBalao: number };

export class LugarRoom extends Room<{ state: LugarEstado }> {
  maxClients = 100;
  maxMessagesPerSecond = 120;
  state = new LugarEstado();

  private espacoId = "";
  private lugarId = "";
  private template: Template = "sala";
  private ambiente: Ambiente = "resenha";
  private jogadores = new Map<string, Jogador>(); // por contaId
  /** chaves de chaveBloqueio dos pares com pelo menos uma Conta aqui */
  private pares = new Set<string>();

  static async onAuth(_token: string, options: unknown): Promise<Auth> {
    const opcoes = (options ?? {}) as { ingresso?: unknown; lugarId?: unknown };
    const ing = await verificarIngresso(opcoes.ingresso);
    if (!ing || ing.lugarId !== opcoes.lugarId) throw new Error("ingresso inválido");

    const [m] = await db
      .select({ banido: membro.banido, silenciadoAte: membro.silenciadoAte })
      .from(membro)
      .where(and(eq(membro.espacoId, ing.espacoId), eq(membro.contaId, ing.contaId)));
    if (!m || m.banido) throw new Error("não é Membro");
    const [l] = await db
      .select({ id: lugar.id })
      .from(lugar)
      .where(and(eq(lugar.id, ing.lugarId), eq(lugar.espacoId, ing.espacoId)));
    if (!l) throw new Error("Lugar inexistente");
    const [u] = await db.select({ nome: user.name }).from(user).where(eq(user.id, ing.contaId));
    const [a] = await db.select({ pecas: avatar.pecas }).from(avatar).where(eq(avatar.contaId, ing.contaId));
    if (!u || !a) throw new Error("Conta sem Avatar");

    return {
      ...ing,
      nome: u.nome.slice(0, NOME_MAX),
      pecas: JSON.stringify(a.pecas),
      silenciadoAte: m.silenciadoAte?.getTime() ?? 0,
    };
  }

  async onCreate(options: { lugarId?: string }) {
    const [l] = await db.select().from(lugar).where(eq(lugar.id, String(options.lugarId)));
    if (!l) throw new Error("Lugar inexistente");
    this.lugarId = l.id;
    this.espacoId = l.espacoId;
    this.template = l.template;
    this.ambiente = l.ambiente;

    this.onMessage("mover", (client, msg) => this.aoMover(client, msg));
    this.onMessage("porta", (client) => void this.aoPorta(client));
    this.onMessage("balao", (client, msg) => this.aoBalao(client, msg));
    this.onMessage("atividade", (client, msg) => {
      const r = atividadeSchema.safeParse(msg);
      const av = this.avatarDe(client);
      if (r.success && av) av.atividade = r.data.atividade;
    });
    this.onMessage("naoPerturbe", (client, msg) => {
      const r = naoPerturbeSchema.safeParse(msg);
      const av = this.avatarDe(client);
      if (r.success && av) av.naoPerturbe = r.data.ativo;
    });

    bus.on("moderacao", this.aoModerar);
    bus.on("bloqueio", this.aoBloquear);
  }

  onDispose() {
    bus.off("moderacao", this.aoModerar);
    bus.off("bloqueio", this.aoBloquear);
  }

  async onJoin(client: Client) {
    const auth = client.auth as Auth;
    if (auth.lugarId !== this.lugarId) throw new Error("Lugar incorreto");

    const antigo = ativos.get(auth.contaId);
    if (antigo && antigo !== client) antigo.leave(CODIGO_DUPLICADO, "duplicado");
    ativos.set(auth.contaId, client);

    // posição inválida (mapa mudou, token adulterado...) cai no spawn
    let { x, y } = auth;
    if (bloqueado(this.template, x, y)) {
      ({ x, y } = centroTile(TEMPLATES_LUGAR[this.template].spawn.col, TEMPLATES_LUGAR[this.template].spawn.lin));
    }

    const av = new AvatarEstado();
    av.contaId = auth.contaId;
    av.nome = auth.nome.slice(0, NOME_MAX);
    av.pecas = auth.pecas;
    av.x = x;
    av.y = y;
    av.dir = "baixo";
    av.movendo = false;
    av.atividade = "nenhuma";
    av.naoPerturbe = false;
    av.silenciadoAte = auth.silenciadoAte;
    this.state.avatares.set(auth.contaId, av);
    this.jogadores.set(auth.contaId, {
      client,
      orcamento: VELOCIDADE * ORCAMENTO_FATOR * ORCAMENTO_TETO_S,
      ultimo: Date.now(),
      ultimoBalao: 0,
    });

    const rows = await db
      .select()
      .from(bloqueio)
      .where(or(eq(bloqueio.contaId, auth.contaId), eq(bloqueio.bloqueadoId, auth.contaId)));
    for (const r of rows) this.pares.add(chaveBloqueio(r.contaId, r.bloqueadoId));
    this.enviarBloqueios(auth.contaId);
    // quem já estava aqui e tem Bloqueio com o novato também precisa saber
    for (const r of rows) this.enviarBloqueios(r.contaId === auth.contaId ? r.bloqueadoId : r.contaId);
  }

  onLeave(client: Client) {
    const contaId = (client.auth as Auth | undefined)?.contaId;
    if (!contaId || this.jogadores.get(contaId)?.client !== client) return; // já substituído
    this.jogadores.delete(contaId);
    this.state.avatares.delete(contaId);
    if (ativos.get(contaId) === client) ativos.delete(contaId);
    for (const chave of this.pares) if (chave.split("|").includes(contaId)) this.pares.delete(chave);
  }

  // --- helpers ---

  private avatarDe(client: Client) {
    const contaId = (client.auth as Auth | undefined)?.contaId;
    return contaId && this.jogadores.get(contaId)?.client === client ? this.state.avatares.get(contaId) : undefined;
  }

  private ouvinte(av: AvatarEstado) {
    return { contaId: av.contaId, x: av.x, y: av.y, naoPerturbe: av.naoPerturbe };
  }

  private enviarBloqueios(contaId: string) {
    const jogador = this.jogadores.get(contaId);
    if (!jogador) return;
    const contaIds: string[] = [];
    for (const chave of this.pares) {
      const [a, b] = chave.split("|");
      if (a === contaId) contaIds.push(b);
      else if (b === contaId) contaIds.push(a);
    }
    jogador.client.send("bloqueios", { contaIds } satisfies BloqueiosMsg);
  }

  // --- mensagens ---

  private aoMover(client: Client, msg: unknown) {
    const av = this.avatarDe(client);
    const r = moverSchema.safeParse(msg);
    if (!av || !r.success) return;
    const jogador = this.jogadores.get(av.contaId)!;
    const { x, y, dir, movendo } = r.data;

    const agora = Date.now();
    const teto = VELOCIDADE * ORCAMENTO_FATOR * ORCAMENTO_TETO_S;
    jogador.orcamento = Math.min(teto, jogador.orcamento + VELOCIDADE * ORCAMENTO_FATOR * ((agora - jogador.ultimo) / 1000));
    jogador.ultimo = agora;

    const dx = x - av.x;
    const dy = y - av.y;
    const dist = Math.hypot(dx, dy);
    let ok = dist <= jogador.orcamento;
    // amostra o caminho para não atravessar parede em passos grandes
    const passos = Math.ceil(dist / PASSO_COLISAO);
    for (let i = 1; ok && i <= passos; i++) {
      ok = !bloqueado(this.template, av.x + (dx * i) / passos, av.y + (dy * i) / passos);
    }
    if (!ok) {
      client.send("corrigir", { x: av.x, y: av.y } satisfies CorrigirMsg);
      return;
    }
    jogador.orcamento -= dist;
    av.x = x;
    av.y = y;
    av.dir = dir;
    av.movendo = movendo;
  }

  private async aoPorta(client: Client) {
    const av = this.avatarDe(client);
    if (!av) return;
    const porta = portaEm(this.template, av.x, av.y);
    if (!porta) return;
    const [destino] = await db
      .select({ id: lugar.id })
      .from(lugar)
      .where(and(eq(lugar.espacoId, this.espacoId), eq(lugar.template, porta.destino)));
    if (!destino) return;
    const { x, y } = centroTile(porta.chegada.col, porta.chegada.lin);
    const ingresso = await assinarIngresso({ contaId: av.contaId, espacoId: this.espacoId, lugarId: destino.id, x, y });
    client.send("passagem", { lugarId: destino.id, ingresso } satisfies PassagemMsg);
  }

  private aoBalao(client: Client, msg: unknown) {
    const av = this.avatarDe(client);
    const r = balaoSchema.safeParse(msg);
    if (!av || !r.success) return;
    const texto = r.data.texto.trim();
    if (texto.length < 1 || texto.length > BALAO_MAX) return;
    const agora = Date.now();
    if (av.silenciadoAte > agora) return;
    const jogador = this.jogadores.get(av.contaId)!;
    if (agora - jogador.ultimoBalao < BALAO_COOLDOWN_MS) return; // flood: descarta o excedente
    jogador.ultimoBalao = agora;

    const payload: BalaoReceberMsg = { contaId: av.contaId, texto };
    const de = this.ouvinte(av);
    client.send("balao", payload); // o próprio remetente sempre vê
    for (const [contaId, j] of this.jogadores) {
      if (contaId === av.contaId) continue;
      const outro = this.state.avatares.get(contaId);
      if (outro && podemSeOuvir(de, this.ouvinte(outro), { template: this.template, ambiente: this.ambiente }, this.pares)) j.client.send("balao", payload);
    }
  }

  // --- eventos do bus ---

  private aoModerar = (e: EventoModeracao) => {
    if (e.espacoId !== this.espacoId) return;
    const jogador = this.jogadores.get(e.contaId);
    if (!jogador) return;
    const msg: ModeracaoMsg = { tipo: e.tipo, ate: e.ate };
    jogador.client.send("moderacao", msg);
    if (e.tipo === "silenciado") {
      const av = this.state.avatares.get(e.contaId);
      if (av) av.silenciadoAte = e.ate ?? 0;
    } else {
      jogador.client.leave(e.tipo === "banido" ? CODIGO_BANIDO : CODIGO_REMOVIDO, e.tipo);
    }
  };

  private aoBloquear = (e: EventoBloqueio) => {
    const aqui = this.jogadores.has(e.contaId) || this.jogadores.has(e.bloqueadoId);
    if (!aqui) return;
    const chave = chaveBloqueio(e.contaId, e.bloqueadoId);
    if (e.ativo) this.pares.add(chave);
    else this.pares.delete(chave);
    this.enviarBloqueios(e.contaId);
    this.enviarBloqueios(e.bloqueadoId);
  };
}
