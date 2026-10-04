import { NOME_ROOM } from "@baguin/shared";
import { defineRoom, defineServer, matchMaker } from "colyseus";
import { montarApi } from "./api.js";
import { fecharBanco } from "./db/index.js";
import { env } from "./env.js";
import { LugarRoom } from "./rooms/LugarRoom.js";

// O Colyseus aplica CORS a TODAS as requisições (inclusive /api/*) refletindo o Origin recebido, com
// Allow-Credentials: true. Fixa na origem do web; os demais headers padrão do Colyseus continuam valendo.
matchMaker.controller.getCorsHeaders = () => ({ "Access-Control-Allow-Origin": env.webOrigin });

const server = defineServer({
  rooms: {
    // uma room por Lugar: `lugarId` vai nas opções do cliente e filtra o matchmaking
    [NOME_ROOM]: defineRoom(LugarRoom).filterBy(["lugarId"] as never),
  },
  express: montarApi,
});

await server.listen(env.porta);
console.log(`[baguin] servidor em http://localhost:${env.porta} (${env.databaseUrl ? "postgres" : "pglite"})`);

process.on("SIGTERM", () => void fecharBanco());
