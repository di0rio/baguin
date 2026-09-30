// Smoke test ponta a ponta: API + room `lugar`. Requer o servidor rodando (pnpm --filter @baguin/server start).
// Uso: pnpm --filter @baguin/server smoke
import { Client, type Room } from "@colyseus/sdk";
import { NOME_ROOM, TILE, centroTile, type EntrarOpcoes, type PassagemMsg } from "@baguin/shared";

const API = process.env.API ?? "http://localhost:2567";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sufixo = Date.now().toString(36);
let falhas = 0;
const confere = (ok: boolean, msg: string) => {
  console.log(`${ok ? "  ok  " : " FALHA"} ${msg}`);
  if (!ok) falhas++;
};

// --- HTTP com cookie por Conta ---
class Sessao {
  cookie = "";
  contaId = "";
  constructor(public nome: string) {}
  async req(metodo: string, caminho: string, corpo?: unknown) {
    const r = await fetch(API + caminho, {
      method: metodo,
      headers: { "Content-Type": "application/json", Origin: "http://localhost:5173", Cookie: this.cookie },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const set = r.headers.getSetCookie().map((c) => c.split(";")[0]);
    if (set.length) this.cookie = set.join("; ");
    const texto = await r.text();
    return { status: r.status, dados: texto ? JSON.parse(texto) : null };
  }
  async cadastrar() {
    const r = await this.req("POST", "/api/auth/sign-up/email", {
      email: `${this.nome.toLowerCase()}-${sufixo}@x.com`,
      password: "senha1234",
      name: this.nome,
    });
    this.contaId = r.dados.user.id;
    await this.req("PUT", "/api/eu/avatar", {
      pele: 1, cabelo: { estilo: "curto", cor: 2 }, roupa: { estilo: "camiseta", cor: 3 }, calca: 1, acessorio: "nenhum",
    });
  }
}

// --- cliente Colyseus ---
type Recebida = { tipo: string; dados: any };
class Jogador {
  room!: Room;
  recebidas: Recebida[] = [];
  saiu: number | null = null;
  constructor(public sessao: Sessao) {}
  async entrar(opcoes: EntrarOpcoes) {
    const client = new Client(API);
    this.room = await client.joinOrCreate(NOME_ROOM, opcoes);
    this.saiu = null;
    for (const tipo of ["corrigir", "passagem", "balao", "bloqueios", "moderacao"]) {
      this.room.onMessage(tipo, (dados: any) => this.recebidas.push({ tipo, dados }));
    }
    this.room.onLeave((codigo: number) => (this.saiu = codigo));
    await sleep(150);
  }
  ver(tipo: string) {
    return this.recebidas.filter((r) => r.tipo === tipo);
  }
  limpar() {
    this.recebidas = [];
  }
  get eu() {
    return (this.room.state as any).avatares.get(this.sessao.contaId);
  }
  /** anda em linha reta a 160 px/s (passos de 8 px a cada 50 ms), como o cliente faria */
  async andar(x: number, y: number) {
    let { x: cx, y: cy } = this.eu;
    while (Math.hypot(x - cx, y - cy) > 0.5) {
      const d = Math.hypot(x - cx, y - cy);
      const p = Math.min(8, d);
      cx += ((x - cx) / d) * p;
      cy += ((y - cy) / d) * p;
      this.room.send("mover", { x: cx, y: cy, dir: "cima", movendo: true });
      await sleep(50);
    }
    this.room.send("mover", { x: cx, y: cy, dir: "cima", movendo: false });
    await sleep(100);
  }
}

const resumo = (j: Jogador) => j.recebidas.map((r) => `${r.tipo}${JSON.stringify(r.dados)}`).join(" | ") || "(nada)";

async function main() {
  const ana = new Sessao("Ana");
  const bia = new Sessao("Bia");
  const caio = new Sessao("Caio");
  await Promise.all([ana.cadastrar(), bia.cadastrar(), caio.cadastrar()]);

  const esp = (await ana.req("POST", "/api/espacos", { nome: "Smoke" })).dados;
  const conv = (await ana.req("POST", `/api/espacos/${esp.espaco.id}/convites`, { horas: 1, usosMax: 5 })).dados;
  await bia.req("POST", `/api/convites/${conv.codigo}/aceitar`);
  await caio.req("POST", `/api/convites/${conv.codigo}/aceitar`);
  const lugar = (t: string) => esp.lugares.find((l: any) => l.template === t).id;
  const ingresso = async (s: Sessao) => (await s.req("POST", `/api/espacos/${esp.espaco.id}/ingresso`)).dados;

  console.log("\n# 1. ingresso inválido é recusado");
  const ruim = new Jogador(ana);
  const recusou = await ruim.entrar({ ingresso: "lixo", lugarId: lugar("sala") }).then(() => false, () => true);
  confere(recusou, "joinOrCreate com ingresso inválido falha");

  console.log("\n# 2. dois clientes entram na sala (mesma room filtrada por lugarId)");
  const ia = await ingresso(ana);
  const ib = await ingresso(bia);
  const a = new Jogador(ana);
  const b = new Jogador(bia);
  await a.entrar({ ingresso: ia.ingresso, lugarId: ia.lugarId });
  await b.entrar({ ingresso: ib.ingresso, lugarId: ib.lugarId });
  await sleep(200);
  confere(a.room.roomId === b.room.roomId, `mesma room (${a.room.roomId})`);
  confere((a.room.state as any).avatares.size === 2, "A vê 2 avatares no estado");
  console.log("  spawn de A:", { x: a.eu.x, y: a.eu.y }, "esperado", centroTile(14, 12));

  console.log("\n# 3. balão dentro do Alcance (mesmo ponto, sala = resenha, 7 tiles)");
  a.limpar(); b.limpar();
  a.room.send("balao", { texto: "  oi Bia!  " });
  await sleep(200);
  console.log("  A recebeu:", resumo(a));
  console.log("  B recebeu:", resumo(b));
  confere(b.ver("balao")[0]?.dados.texto === "oi Bia!" && a.ver("balao").length === 1, "B e A receberam o balão (texto com trim)");

  console.log("\n# 4. movimento válido, teleporte e parede");
  await b.andar(b.eu.x + 64, b.eu.y);
  console.log("  B após andar 64px:", { x: b.eu.x, y: b.eu.y }, "corrigir:", b.ver("corrigir").length);
  confere(b.ver("corrigir").length === 0 && a.eu && (a.room.state as any).avatares.get(bia.contaId).x === b.eu.x, "andar 64px é aceito e A vê B se mexer");
  b.limpar();
  b.room.send("mover", { x: b.eu.x + 300, y: b.eu.y, dir: "direita", movendo: true });
  await sleep(150);
  console.log("  teleporte -> B recebeu:", resumo(b));
  confere(b.ver("corrigir").length === 1, "teleporte de 300px gera `corrigir`");
  b.limpar();
  b.room.send("mover", { x: 0, y: 0, dir: "cima", movendo: true });
  await sleep(150);
  confere(b.ver("corrigir").length === 1, "posição em parede gera `corrigir`");

  console.log("\n# 5. balão de longe (fora do Alcance) NÃO é entregue");
  await b.andar(centroTile(26, 12).x, centroTile(26, 12).y); // ~12 tiles de A
  console.log("  B em", { x: b.eu.x, y: b.eu.y }, "A em", { x: a.eu.x, y: a.eu.y });
  a.limpar(); b.limpar();
  a.room.send("balao", { texto: "alguém me ouve?" });
  await sleep(250);
  console.log("  A recebeu:", resumo(a));
  console.log("  B recebeu:", resumo(b));
  confere(a.ver("balao").length === 1 && b.ver("balao").length === 0, "A vê o próprio balão, B (longe) não recebe");

  console.log("\n# 6. Não perturbe: B volta pra perto mas ativa NaoPerturbe");
  await b.andar(a.eu.x + 32, a.eu.y);
  b.room.send("naoPerturbe", { ativo: true });
  await sleep(100);
  a.limpar(); b.limpar();
  a.room.send("balao", { texto: "psiu" });
  b.room.send("balao", { texto: "não perturbe" });
  await sleep(250);
  confere(b.ver("balao").length === 1 && b.ver("balao")[0].dados.contaId === bia.contaId && a.ver("balao").length === 1 && a.ver("balao")[0].dados.contaId === ana.contaId, "com NaoPerturbe cada um só vê o próprio balão");
  b.room.send("naoPerturbe", { ativo: false });
  await sleep(100);
  a.limpar(); b.limpar();
  a.room.send("balao", { texto: "voltou" });
  await sleep(200);
  confere(b.ver("balao").length === 1, "sem NaoPerturbe B volta a ouvir");

  console.log("\n# 7. Bloqueio (Bia bloqueia Ana): simétrico, e `bloqueios` chega nos dois");
  a.limpar(); b.limpar();
  await bia.req("POST", `/api/bloqueios/${ana.contaId}`);
  await sleep(250);
  console.log("  A:", resumo(a));
  console.log("  B:", resumo(b));
  a.limpar(); b.limpar();
  a.room.send("balao", { texto: "bloqueada?" });
  b.room.send("balao", { texto: "sim" });
  await sleep(250);
  confere(b.ver("balao").length === 1 && a.ver("balao").length === 1, "nenhum dos dois vê o balão do outro");
  await bia.req("DELETE", `/api/bloqueios/${ana.contaId}`);
  await sleep(200);
  a.limpar();
  b.limpar();
  a.room.send("balao", { texto: "desbloqueou" });
  await sleep(200);
  confere(b.ver("balao").length === 1, "após desbloquear B volta a receber");

  console.log("\n# 8. Silenciar Bia (10 min): balão dela é ignorado, ela recebe `moderacao`");
  b.limpar();
  const sil = await ana.req("POST", `/api/espacos/${esp.espaco.id}/membros/${bia.contaId}/silenciar`, { minutos: 10 });
  await sleep(250);
  console.log("  API:", sil.status, JSON.stringify(sil.dados), "| B:", resumo(b), "| silenciadoAte no estado:", b.eu.silenciadoAte);
  a.limpar(); b.limpar();
  b.room.send("balao", { texto: "estou silenciada" });
  await sleep(250);
  confere(a.ver("balao").length === 0 && b.ver("balao").length === 0, "balão de silenciada não chega a ninguém (nem a ela)");
  const cv = await bia.req("POST", `/api/espacos/${esp.espaco.id}/livekit-token`, { lugarId: lugar("sala") });
  const grants = JSON.parse(Buffer.from(cv.dados.token.split(".")[1], "base64url").toString()).video;
  confere(cv.status === 200 && grants.canPublish === false, `livekit-token de silenciada tem canPublish=false (${cv.status})`);
  const hier = await bia.req("POST", `/api/espacos/${esp.espaco.id}/membros/${ana.contaId}/silenciar`, { minutos: 1 });
  confere(hier.status === 403, "Membro comum não silencia o Dono (403)");

  console.log("\n# 9. porta: A anda até a porta 1 da sala e atravessa para o escritório");
  a.limpar();
  const p = centroTile(14, 0);
  a.room.send("porta"); // fora da porta: ignorado
  await sleep(150);
  confere(a.ver("passagem").length === 0, "`porta` longe da porta é ignorado");
  for (const [col, lin] of [[20, 12], [20, 1], [14, 1]]) await a.andar(centroTile(col, lin).x, centroTile(col, lin).y); // contorna o sofá
  await a.andar(p.x, p.y);
  a.room.send("porta");
  await sleep(300);
  const pass = a.ver("passagem")[0]?.dados as PassagemMsg | undefined;
  console.log("  passagem:", pass && { lugarId: pass.lugarId, escritorio: pass.lugarId === lugar("escritorio"), ingresso: pass.ingresso.slice(0, 20) + "…" });
  confere(pass?.lugarId === lugar("escritorio"), "passagem aponta para o escritório");
  if (pass) {
    a.room.leave();
    await sleep(200);
    const a2 = new Jogador(ana);
    await a2.entrar({ ingresso: pass.ingresso, lugarId: pass.lugarId });
    console.log("  A no escritório em", { x: a2.eu.x, y: a2.eu.y }, "esperado", centroTile(14, 18), "| room", a2.room.roomId, "!=", a.room.roomId);
    confere(a2.eu.x === centroTile(14, 18).x && a2.eu.y === centroTile(14, 18).y && a2.room.roomId !== a.room.roomId, "chegou ao lado da porta do escritório, em outra room");

    console.log("\n# 10. login duplicado derruba a conexão antiga");
    const dup = await ingresso(ana);
    const a3 = new Jogador(ana);
    await a3.entrar({ ingresso: dup.ingresso, lugarId: dup.lugarId });
    await sleep(300);
    console.log("  conexão antiga (escritório) saiu com código:", a2.saiu);
    confere(a2.saiu === 4001, "conexão antiga foi derrubada (4001)");
    a3.room.leave();
  }

  console.log("\n# 11. Remover e Banir");
  const ic = await ingresso(caio);
  const c = new Jogador(caio);
  await c.entrar({ ingresso: ic.ingresso, lugarId: ic.lugarId });
  const rem = await ana.req("DELETE", `/api/espacos/${esp.espaco.id}/membros/${caio.contaId}`);
  await sleep(300);
  console.log("  remover:", rem.status, "| Caio recebeu:", resumo(c), "| saiu com código:", c.saiu);
  confere(c.saiu === 4002 && c.ver("moderacao")[0]?.dados.tipo === "removido", "Caio foi derrubado (4002)");
  const ing2 = await caio.req("POST", `/api/espacos/${esp.espaco.id}/ingresso`);
  confere(ing2.status === 403, "Caio removido perde acesso (403)");
  const volta = await caio.req("POST", `/api/convites/${conv.codigo}/aceitar`);
  confere(volta.status === 200, "removido volta com o mesmo Convite");
  const ic2 = await ingresso(caio);
  const c2 = new Jogador(caio);
  await c2.entrar({ ingresso: ic2.ingresso, lugarId: ic2.lugarId });
  await ana.req("POST", `/api/espacos/${esp.espaco.id}/membros/${caio.contaId}/banir`);
  await sleep(300);
  console.log("  banir -> Caio saiu com código:", c2.saiu, "| recebeu:", resumo(c2));
  confere(c2.saiu === 4003, "Caio banido foi derrubado (4003)");
  const volta2 = await caio.req("POST", `/api/convites/${conv.codigo}/aceitar`);
  console.log("  banido tenta o mesmo Convite:", volta2.status, JSON.stringify(volta2.dados));
  confere(volta2.status === 403, "banido não volta pelo Convite (403)");

  a.room.leave();
  b.room.leave();
  await sleep(200);
  console.log(falhas ? `\n${falhas} FALHA(S)` : "\ntudo ok");
  process.exit(falhas ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
