import type { IngressoPayload } from "@baguin/shared";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { env } from "./env.js";

const chave = new TextEncoder().encode(env.secret);

const payloadSchema = z.object({
  contaId: z.string(),
  espacoId: z.string(),
  lugarId: z.string(),
  x: z.number(),
  y: z.number(),
});

/** Ingresso (entrada inicial) e passagem (porta) usam o mesmo token, válido por 60 s. */
export function assinarIngresso(payload: IngressoPayload): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime("60s").sign(chave);
}

export async function verificarIngresso(token: unknown): Promise<IngressoPayload | null> {
  if (typeof token !== "string") return null;
  try {
    const { payload } = await jwtVerify(token, chave, { algorithms: ["HS256"] });
    return payloadSchema.parse(payload);
  } catch {
    return null;
  }
}
