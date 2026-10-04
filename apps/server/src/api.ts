import { randomBytes } from "node:crypto";
import {
  TEMPLATES,
  TEMPLATES_LUGAR,
  centroTile,
  pecasSchema,
  type ConfigDto,
  type ConviteDto,
  type EspacoDetalheDto,
  type EuDto,
  type IngressoDto,
  type LivekitTokenDto,
  type Papel,
} from "@baguin/shared";
import { toNodeHandler } from "better-auth/node";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import express, { type Application, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { auth, contaDaRequisicao, provedoresAtivos, type Conta } from "./auth.js";
import { bus } from "./bus.js";
import { db, schema } from "./db/index.js";
import { env } from "./env.js";
import { assinarIngresso } from "./ingresso.js";
import { derrubarDaVoz, permitirPublicar, tokenLivekit } from "./livekit.js";
import { criarLimitador } from "./limite.js";
import { estaNoLugar } from "./rooms/LugarRoom.js";

const { user, avatar, espaco, lugar, membro, convite, bloqueio } = schema;

class HttpErro extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

/** Cotas por conta (contra abuso: cada Espaço cria 3 Lugares e cada Convite é uma linha no banco). */
const MAX_ESPACOS_DONO = 5;
const MAX_CONVITES_ATIVOS = 20;
/** Escritas por conta: 60/min (em memória, por instância do servidor). */
const podeEscrever = criarLimitador(60, 60_000);

const uuid = z.uuid();
const parse = <T extends z.ZodType>(s: T, v: unknown): z.infer<T> => {
  const r = s.safeParse(v);
  if (!r.success) throw new HttpErro(400, r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return r.data;
};
/** Id inválido vira 404 em vez de estourar no Postgres. */
const idParam = (v: unknown) => {
  const r = uuid.safeParse(v);
  if (!r.success) throw new HttpErro(404, "não encontrado");
  return r.data;
};

type Req = Request & { conta: Conta };
type Handler = (req: Req, res: Response) => unknown;
/** Exige login e injeta `req.conta`. */
const logado =
  (fn: Handler): RequestHandler =>
  async (req, res) => {
    const conta = await contaDaRequisicao(req);
    if (!conta) throw new HttpErro(401, "login necessário");
    if (req.method !== "GET" && req.method !== "HEAD" && !podeEscrever(conta.id)) {
      throw new HttpErro(429, "muitas requisições, tente de novo em instantes");
    }
    await fn(Object.assign(req, { conta }), res);
  };

async function meuMembro(espacoId: string, contaId: string) {
  const [m] = await db
    .select()
    .from(membro)
    .where(and(eq(membro.espacoId, espacoId), eq(membro.contaId, contaId)));
  return m && !m.banido ? m : null;
}
async function exigirMembro(espacoId: string, contaId: string) {
  const m = await meuMembro(espacoId, contaId);
  if (!m) throw new HttpErro(403, "você não é Membro deste Espaço");
  return m;
}
async function exigirModeracao(espacoId: string, contaId: string) {
  const m = await exigirMembro(espacoId, contaId);
  if (!m.papel) throw new HttpErro(403, "requer Dono ou Moderador");
  return m;
}

const ativo = (r: { expiraEm: Date; usos: number; usosMax: number; revogado: boolean }) =>
  !r.revogado && r.expiraEm > new Date() && r.usos < r.usosMax;

const conviteDto = (c: typeof convite.$inferSelect): ConviteDto => ({
  ...c,
  expiraEm: c.expiraEm.toISOString(),
});

async function detalhe(espacoId: string, meuPapel: Papel): Promise<EspacoDetalheDto> {
  const [e] = await db.select().from(espaco).where(eq(espaco.id, espacoId));
  if (!e) throw new HttpErro(404, "não encontrado");
  const lugares = await db.select().from(lugar).where(eq(lugar.espacoId, espacoId));
  const membros = await db
    .select({ contaId: membro.contaId, nome: user.name, papel: membro.papel, silenciadoAte: membro.silenciadoAte })
    .from(membro)
    .innerJoin(user, eq(user.id, membro.contaId))
    .where(and(eq(membro.espacoId, espacoId), eq(membro.banido, false)));
  return {
    espaco: { id: e.id, nome: e.nome, criadoEm: e.criadoEm.toISOString() },
    lugares,
    eu: { papel: meuPapel },
    membros: membros.map((m) => ({ ...m, silenciadoAte: m.silenciadoAte?.toISOString() ?? null })),
  };
}

/** Dono não é alvo de nada; Moderador só atua sobre Membro comum; Dono atua sobre qualquer outro. */
function exigirHierarquia(ator: Papel, alvo: Papel) {
  if (alvo === "dono" || (ator === "moderador" && alvo !== null)) {
    throw new HttpErro(403, "sem permissão sobre este Membro");
  }
}

async function alvoDe(espacoId: string, contaId: string) {
  const [alvo] = await db
    .select()
    .from(membro)
    .where(and(eq(membro.espacoId, espacoId), eq(membro.contaId, contaId)));
  if (!alvo) throw new HttpErro(404, "Membro não encontrado");
  return alvo;
}

async function lugarIdsDe(espacoId: string) {
  return (await db.select({ id: lugar.id }).from(lugar).where(eq(lugar.espacoId, espacoId))).map((l) => l.id);
}

export function montarApi(app: Application) {
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json());

  const api = express.Router();

  // CSRF em profundidade (o /api/auth acima tem a verificação do Better Auth): escrita vinda de outra
  // origem é recusada. Sem Origin (curl, servidor a servidor) passa; o navegador sempre envia em POST.
  api.use((req, _res, next) => {
    const seguro = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
    const origem = req.headers.origin;
    if (!seguro && origem !== undefined && origem !== env.webOrigin) throw new HttpErro(403, "origem não permitida");
    next();
  });

  // o Colyseus responderia "Colyseus <versão>" aqui; a raiz não precisa dizer qual servidor é
  app.get("/", (_req, res) => {
    res.status(204).end();
  });

  api.get("/config", (_req, res) => {
    const dto: ConfigDto = { provedores: provedoresAtivos(), devLogin: env.devLogin, livekitUrl: env.livekit.url };
    res.json(dto);
  });

  api.get(
    "/eu",
    logado(async (req, res) => {
      const [a] = await db.select().from(avatar).where(eq(avatar.contaId, req.conta.id));
      const dto: EuDto = { conta: req.conta, avatar: a?.pecas ?? null };
      res.json(dto);
    }),
  );

  api.put(
    "/eu/avatar",
    logado(async (req, res) => {
      const pecas = parse(pecasSchema, req.body);
      await db
        .insert(avatar)
        .values({ contaId: req.conta.id, pecas })
        .onConflictDoUpdate({ target: avatar.contaId, set: { pecas, atualizadoEm: new Date() } });
      res.status(204).end();
    }),
  );

  api.get(
    "/espacos",
    logado(async (req, res) => {
      const rows = await db
        .select({ id: espaco.id, nome: espaco.nome, criadoEm: espaco.criadoEm })
        .from(membro)
        .innerJoin(espaco, eq(espaco.id, membro.espacoId))
        .where(and(eq(membro.contaId, req.conta.id), eq(membro.banido, false)));
      res.json(rows.map((r) => ({ ...r, criadoEm: r.criadoEm.toISOString() })));
    }),
  );

  api.post(
    "/espacos",
    logado(async (req, res) => {
      const { nome } = parse(z.object({ nome: z.string().trim().min(1).max(60) }), req.body);
      const [donos] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(membro)
        .where(and(eq(membro.contaId, req.conta.id), eq(membro.papel, "dono")));
      if (donos.n >= MAX_ESPACOS_DONO) throw new HttpErro(403, `limite de ${MAX_ESPACOS_DONO} Espaços por conta`);
      const id = await db.transaction(async (tx) => {
        const [e] = await tx.insert(espaco).values({ nome }).returning({ id: espaco.id });
        await tx.insert(lugar).values(
          TEMPLATES.map((template) => ({
            espacoId: e.id,
            template,
            nome: TEMPLATES_LUGAR[template].nome,
            ambiente: TEMPLATES_LUGAR[template].ambientePadrao,
          })),
        );
        await tx.insert(membro).values({ espacoId: e.id, contaId: req.conta.id, papel: "dono" });
        return e.id;
      });
      res.status(201).json(await detalhe(id, "dono"));
    }),
  );

  api.get(
    "/espacos/:id",
    logado(async (req, res) => {
      const id = idParam(req.params.id);
      const m = await exigirMembro(id, req.conta.id);
      res.json(await detalhe(id, m.papel));
    }),
  );

  api.post(
    "/espacos/:id/convites",
    logado(async (req, res) => {
      const id = idParam(req.params.id);
      await exigirModeracao(id, req.conta.id);
      const { horas, usosMax } = parse(
        z.object({ horas: z.number().int().min(1).max(24 * 30), usosMax: z.number().int().min(1).max(100) }),
        req.body,
      );
      const [ativos] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(convite)
        .where(
          and(eq(convite.espacoId, id), eq(convite.revogado, false), gt(convite.expiraEm, new Date()), lt(convite.usos, convite.usosMax)),
        );
      if (ativos.n >= MAX_CONVITES_ATIVOS) {
        throw new HttpErro(403, `limite de ${MAX_CONVITES_ATIVOS} Convites ativos por Espaço: revogue algum antes`);
      }
      const [c] = await db
        .insert(convite)
        .values({
          codigo: randomBytes(8).toString("base64url").slice(0, 10),
          espacoId: id,
          criadoPor: req.conta.id,
          expiraEm: new Date(Date.now() + horas * 3600_000),
          usosMax,
        })
        .returning();
      res.status(201).json(conviteDto(c));
    }),
  );

  api.get(
    "/espacos/:id/convites",
    logado(async (req, res) => {
      const id = idParam(req.params.id);
      await exigirModeracao(id, req.conta.id);
      const rows = await db
        .select()
        .from(convite)
        .where(and(eq(convite.espacoId, id), eq(convite.revogado, false), gt(convite.expiraEm, new Date())));
      res.json(rows.filter(ativo).map(conviteDto));
    }),
  );

  api.delete(
    "/convites/:codigo",
    logado(async (req, res) => {
      const [c] = await db.select().from(convite).where(eq(convite.codigo, String(req.params.codigo)));
      if (!c) throw new HttpErro(404, "Convite não encontrado");
      await exigirModeracao(c.espacoId, req.conta.id);
      await db.update(convite).set({ revogado: true }).where(eq(convite.codigo, c.codigo));
      res.status(204).end();
    }),
  );

  api.get("/convites/:codigo", async (req, res) => {
    const [row] = await db
      .select({ c: convite, espacoNome: espaco.nome })
      .from(convite)
      .innerJoin(espaco, eq(espaco.id, convite.espacoId))
      .where(eq(convite.codigo, String(req.params.codigo)));
    if (!row) throw new HttpErro(404, "Convite não encontrado");
    res.json({ espacoNome: row.espacoNome, valido: ativo(row.c) });
  });

  api.post(
    "/convites/:codigo/aceitar",
    logado(async (req, res) => {
      const codigo = String(req.params.codigo);
      const espacoId = await db.transaction(async (tx) => {
        const [c] = await tx.select().from(convite).where(eq(convite.codigo, codigo));
        if (!c) throw new HttpErro(404, "Convite não encontrado");
        const [m] = await tx
          .select()
          .from(membro)
          .where(and(eq(membro.espacoId, c.espacoId), eq(membro.contaId, req.conta.id)));
        if (m?.banido) throw new HttpErro(403, "você foi banido deste Espaço");
        if (m) return c.espacoId; // já é Membro: idempotente
        if (!ativo(c)) throw new HttpErro(410, "Convite expirado, revogado ou esgotado");
        // aceite simultâneo da mesma Conta: só quem de fato inseriu o Membro consome um uso
        const inserido = await tx
          .insert(membro)
          .values({ espacoId: c.espacoId, contaId: req.conta.id })
          .onConflictDoNothing()
          .returning({ contaId: membro.contaId });
        if (!inserido.length) return c.espacoId;
        // consumo atômico: evita estourar usosMax com aceites simultâneos (falha desfaz o insert)
        const consumido = await tx
          .update(convite)
          .set({ usos: sql`${convite.usos} + 1` })
          .where(and(eq(convite.codigo, codigo), lt(convite.usos, convite.usosMax)))
          .returning({ codigo: convite.codigo });
        if (!consumido.length) throw new HttpErro(410, "Convite esgotado");
        return c.espacoId;
      });
      res.json({ espacoId });
    }),
  );

  api.post(
    "/espacos/:id/ingresso",
    logado(async (req, res) => {
      const id = idParam(req.params.id);
      await exigirMembro(id, req.conta.id);
      const [sala] = await db
        .select()
        .from(lugar)
        .where(and(eq(lugar.espacoId, id), eq(lugar.template, "sala")));
      if (!sala) throw new HttpErro(404, "Lugar não encontrado");
      const { x, y } = centroTile(TEMPLATES_LUGAR.sala.spawn.col, TEMPLATES_LUGAR.sala.spawn.lin);
      const dto: IngressoDto = {
        ingresso: await assinarIngresso({ contaId: req.conta.id, espacoId: id, lugarId: sala.id, x, y }),
        lugarId: sala.id,
      };
      res.json(dto);
    }),
  );

  api.post(
    "/espacos/:id/livekit-token",
    logado(async (req, res) => {
      const id = idParam(req.params.id);
      const m = await exigirMembro(id, req.conta.id);
      const { lugarId } = parse(z.object({ lugarId: z.uuid() }), req.body);
      const [l] = await db
        .select({ id: lugar.id })
        .from(lugar)
        .where(and(eq(lugar.id, lugarId), eq(lugar.espacoId, id)));
      if (!l) throw new HttpErro(404, "Lugar não encontrado");
      if (!estaNoLugar(req.conta.id, lugarId)) throw new HttpErro(403, "entre no Lugar antes de usar a voz");
      const dto: LivekitTokenDto = {
        url: env.livekit.url,
        token: await tokenLivekit({
          espacoId: id,
          lugarId,
          contaId: req.conta.id,
          nome: req.conta.nome,
          silenciado: !!m.silenciadoAte && m.silenciadoAte > new Date(),
        }),
      };
      res.json(dto);
    }),
  );

  // --- Moderação ---

  api.post(
    "/espacos/:id/membros/:contaId/papel",
    logado(async (req, res) => {
      const id = idParam(req.params.id);
      const m = await exigirMembro(id, req.conta.id);
      if (m.papel !== "dono") throw new HttpErro(403, "só o Dono atribui Papéis");
      const { papel } = parse(z.object({ papel: z.enum(["moderador"]).nullable() }), req.body);
      const alvo = await alvoDe(id, String(req.params.contaId));
      if (alvo.banido) throw new HttpErro(404, "Membro não encontrado");
      if (alvo.papel === "dono") throw new HttpErro(403, "o Dono não muda de Papel");
      await db
        .update(membro)
        .set({ papel })
        .where(and(eq(membro.espacoId, id), eq(membro.contaId, alvo.contaId)));
      res.status(204).end();
    }),
  );

  api.post(
    "/espacos/:id/membros/:contaId/silenciar",
    logado(async (req, res) => {
      const id = idParam(req.params.id);
      const ator = await exigirModeracao(id, req.conta.id);
      const { minutos } = parse(z.object({ minutos: z.number().int().min(1).max(24 * 60) }), req.body);
      const alvo = await alvoDe(id, String(req.params.contaId));
      if (alvo.banido) throw new HttpErro(404, "Membro não encontrado");
      exigirHierarquia(ator.papel, alvo.papel);
      const ate = new Date(Date.now() + minutos * 60_000);
      await db
        .update(membro)
        .set({ silenciadoAte: ate })
        .where(and(eq(membro.espacoId, id), eq(membro.contaId, alvo.contaId)));
      bus.emit("moderacao", { tipo: "silenciado", espacoId: id, contaId: alvo.contaId, ate: ate.getTime() });
      // Voz: revoga publicação agora e devolve no fim (melhor esforço, em memória).
      void lugarIdsDe(id).then(async (ids) => {
        await permitirPublicar(id, ids, alvo.contaId, false);
        setTimeout(async () => {
          const m = await meuMembro(id, alvo.contaId).catch(() => null);
          if (m && (!m.silenciadoAte || m.silenciadoAte <= new Date())) {
            await permitirPublicar(id, ids, alvo.contaId, true);
          }
        }, minutos * 60_000).unref();
      }).catch(console.error);
      res.json({ silenciadoAte: ate.toISOString() });
    }),
  );

  api.delete(
    "/espacos/:id/membros/:contaId",
    logado(async (req, res) => {
      const id = idParam(req.params.id);
      const ator = await exigirModeracao(id, req.conta.id);
      const alvo = await alvoDe(id, String(req.params.contaId));
      if (alvo.banido) throw new HttpErro(404, "Membro não encontrado"); // remover não pode desfazer um ban
      exigirHierarquia(ator.papel, alvo.papel);
      await db.delete(membro).where(and(eq(membro.espacoId, id), eq(membro.contaId, alvo.contaId)));
      bus.emit("moderacao", { tipo: "removido", espacoId: id, contaId: alvo.contaId });
      void lugarIdsDe(id).then((ids) => derrubarDaVoz(id, ids, alvo.contaId)).catch(console.error);
      res.status(204).end();
    }),
  );

  api.post(
    "/espacos/:id/membros/:contaId/banir",
    logado(async (req, res) => {
      const id = idParam(req.params.id);
      const ator = await exigirModeracao(id, req.conta.id);
      const alvo = await alvoDe(id, String(req.params.contaId));
      exigirHierarquia(ator.papel, alvo.papel);
      await db
        .update(membro)
        .set({ banido: true, papel: null })
        .where(and(eq(membro.espacoId, id), eq(membro.contaId, alvo.contaId)));
      bus.emit("moderacao", { tipo: "banido", espacoId: id, contaId: alvo.contaId });
      void lugarIdsDe(id).then((ids) => derrubarDaVoz(id, ids, alvo.contaId)).catch(console.error);
      res.status(204).end();
    }),
  );

  // --- Bloqueio (individual, efeito simétrico) ---

  api.get(
    "/bloqueios",
    logado(async (req, res) => {
      const rows = await db.select({ id: bloqueio.bloqueadoId }).from(bloqueio).where(eq(bloqueio.contaId, req.conta.id));
      res.json({ contaIds: rows.map((r) => r.id) });
    }),
  );

  api.post(
    "/bloqueios/:contaId",
    logado(async (req, res) => {
      const alvo = String(req.params.contaId);
      if (alvo === req.conta.id) throw new HttpErro(400, "não dá para bloquear a si mesmo");
      const [u] = await db.select({ id: user.id }).from(user).where(eq(user.id, alvo));
      if (!u) throw new HttpErro(404, "Conta não encontrada");
      await db.insert(bloqueio).values({ contaId: req.conta.id, bloqueadoId: alvo }).onConflictDoNothing();
      bus.emit("bloqueio", { contaId: req.conta.id, bloqueadoId: alvo, ativo: true });
      res.status(204).end();
    }),
  );

  api.delete(
    "/bloqueios/:contaId",
    logado(async (req, res) => {
      const alvo = String(req.params.contaId);
      await db.delete(bloqueio).where(and(eq(bloqueio.contaId, req.conta.id), eq(bloqueio.bloqueadoId, alvo)));
      // efeito simétrico: se o outro também bloqueia, o par continua bloqueado
      const [inverso] = await db
        .select({ contaId: bloqueio.contaId })
        .from(bloqueio)
        .where(and(eq(bloqueio.contaId, alvo), eq(bloqueio.bloqueadoId, req.conta.id)));
      if (!inverso) bus.emit("bloqueio", { contaId: req.conta.id, bloqueadoId: alvo, ativo: false });
      res.status(204).end();
    }),
  );

  app.use("/api", api);
  app.use("/api", (_req, res) => {
    res.status(404).json({ erro: "não encontrado" });
  });
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpErro) {
      res.status(err.status).json({ erro: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ erro: "erro interno" });
  });
}
