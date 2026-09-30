import { NOME_MAX } from "@baguin/shared";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import { db, schema } from "./db/index.js";
import { env } from "./env.js";

/** Nome exibido no Avatar e na voz: aparado e limitado, venha de OAuth ou do cadastro de dev. */
const limparNome = <T extends { name?: string }>(u: T) =>
  typeof u.name === "string" ? { data: { ...u, name: u.name.trim().slice(0, NOME_MAX) } } : undefined;

export const auth = betterAuth({
  baseURL: env.authUrl,
  secret: env.secret,
  trustedOrigins: [env.webOrigin],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  databaseHooks: { user: { create: { before: async (u) => limparNome(u) }, update: { before: async (u) => limparNome(u) } } },
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
