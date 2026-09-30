import type { IngressoPayload } from "@baguin/shared";
import { createHmac } from "node:crypto";
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

/** Ingresso (entrada inicial) e passagem (porta) usam o mesmo token, válido por 60 s. */
export function assinarIngresso(payload: IngressoPayload): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setAudience(AUDIENCIA).setExpirationTime("60s").sign(chave);
}

export async function verificarIngresso(token: unknown): Promise<IngressoPayload | null> {
  if (typeof token !== "string") return null;
  try {
    const { payload } = await jwtVerify(token, chave, { algorithms: ["HS256"], audience: AUDIENCIA });
    return payloadSchema.parse(payload);
  } catch {
    return null;
  }
}
