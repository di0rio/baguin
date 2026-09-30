import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import { db, schema } from "./db/index.js";
import { env } from "./env.js";

export const auth = betterAuth({
  baseURL: env.authUrl,
  secret: env.secret,
  trustedOrigins: [env.webOrigin],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: env.devLogin },
  socialProviders: {
    ...(env.discord && { discord: env.discord }),
    ...(env.google && { google: env.google }),
  },
});

export const provedoresAtivos = (): ("discord" | "google")[] => [
  ...(env.discord ? (["discord"] as const) : []),
  ...(env.google ? (["google"] as const) : []),
];

export type Conta = { id: string; nome: string; imagem: string | null };

export async function contaDaRequisicao(req: Request): Promise<Conta | null> {
  const s = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return s ? { id: s.user.id, nome: s.user.name, imagem: s.user.image ?? null } : null;
}
