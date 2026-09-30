import { livekitSala } from "@baguin/shared";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { env } from "./env.js";

const admin = new RoomServiceClient(env.livekit.url.replace(/^ws/, "http"), env.livekit.apiKey, env.livekit.apiSecret);

export async function tokenLivekit(opts: {
  espacoId: string;
  lugarId: string;
  contaId: string;
  nome: string;
  silenciado: boolean;
}): Promise<string> {
  const token = new AccessToken(env.livekit.apiKey, env.livekit.apiSecret, {
    identity: opts.contaId,
    name: opts.nome,
    ttl: "5m", // sem revogação: o LiveKit renova o token dos clientes conectados
  });
  token.addGrant({
    room: livekitSala(opts.espacoId, opts.lugarId),
    roomJoin: true,
    canSubscribe: true,
    canPublish: !opts.silenciado,
    canPublishData: !opts.silenciado,
  });
  return token.toJwt();
}

// Tudo abaixo é melhor esforço: LiveKit fora do ar ou participante ausente não pode quebrar a API.
const ignorar = () => undefined;

export async function permitirPublicar(espacoId: string, lugarIds: string[], contaId: string, pode: boolean) {
  await Promise.all(
    lugarIds.map((lugarId) =>
      admin
        .updateParticipant(livekitSala(espacoId, lugarId), contaId, undefined, {
          canPublish: pode,
          canPublishData: pode,
          canSubscribe: true,
        })
        .catch(ignorar),
    ),
  );
}

export async function derrubarDaVoz(espacoId: string, lugarIds: string[], contaId: string) {
  await Promise.all(
    lugarIds.map((lugarId) => admin.removeParticipant(livekitSala(espacoId, lugarId), contaId).catch(ignorar)),
  );
}
