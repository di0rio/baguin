import type { IngressoPayload } from "@baguin/shared";
import { createHmac, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { env } from "./env.js";

const AUDIENCIA = "baguin:ingresso";
/** Chave derivada: o segredo da sessão nunca assina ingressos diretamente. */
const chave = createHmac("sha256", env.secret).update(AUDIENCIA).digest();

const payloadSchema = z.object({
  contaId: z.string(),
  espacoId: z.string(),
  lugarId: z.string(),
  x: z.number(),
  y: z.number(),
});

/** Ingresso (entrada inicial) e passagem (porta) usam o mesmo token, válido por 60 s e de uso único (`jti`). */
export function assinarIngresso(payload: IngressoPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUDIENCIA)
    .setJti(randomUUID())
    .setExpirationTime("60s")
    .sign(chave);
}

/** jti já usados -> expiração (ms). Em memória: vale por instância do servidor (hoje há uma só). */
const usados = new Map<string, number>();

/** Verifica o ingresso e o consome: a segunda apresentação do mesmo token é recusada. */
export async function consumirIngresso(token: unknown): Promise<IngressoPayload | null> {
  if (typeof token !== "string") return null;
  try {
    const { payload } = await jwtVerify(token, chave, { algorithms: ["HS256"], audience: AUDIENCIA });
    const { jti, exp } = payload;
    if (!jti || !exp) return null;
    const agora = Date.now();
    for (const [id, expira] of usados) if (expira <= agora) usados.delete(id); // tokens expirados já não passam no jwtVerify
    if (usados.has(jti)) return null;
    usados.set(jti, exp * 1000);
    return payloadSchema.parse(payload);
  } catch {
    return null;
  }
}
