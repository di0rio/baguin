import type { Ambiente, Papel, Pecas, Template } from "@baguin/shared";
import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const ts = () => timestamp({ withTimezone: true });

// --- Better Auth (`user` é a Conta) ---
export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: ts().notNull().defaultNow(),
  updatedAt: ts().notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text().primaryKey(),
  expiresAt: ts().notNull(),
  token: text().notNull().unique(),
  createdAt: ts().notNull().defaultNow(),
  updatedAt: ts().notNull().defaultNow(),
  ipAddress: text(),
  userAgent: text(),
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text().primaryKey(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: ts(),
  refreshTokenExpiresAt: ts(),
  scope: text(),
  password: text(),
  createdAt: ts().notNull().defaultNow(),
  updatedAt: ts().notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: ts().notNull(),
  createdAt: ts().notNull().defaultNow(),
  updatedAt: ts().notNull().defaultNow(),
});

// --- Baguin ---
export const avatar = pgTable("avatar", {
  contaId: text().primaryKey().references(() => user.id, { onDelete: "cascade" }),
  /** Pode estar no formato antigo (índices de cor): leia sempre por `migrarPecas`. */
  pecas: jsonb().$type<Pecas>().notNull(),
  atualizadoEm: ts().notNull().defaultNow(),
});

export const espaco = pgTable("espaco", {
  id: uuid().primaryKey().defaultRandom(),
  nome: text().notNull(),
  criadoEm: ts().notNull().defaultNow(),
});

export const lugar = pgTable("lugar", {
  id: uuid().primaryKey().defaultRandom(),
  espacoId: uuid().notNull().references(() => espaco.id, { onDelete: "cascade" }),
  template: text().$type<Template>().notNull(),
  nome: text().notNull(),
  ambiente: text().$type<Ambiente>().notNull(),
});

export const membro = pgTable(
  "membro",
  {
    espacoId: uuid().notNull().references(() => espaco.id, { onDelete: "cascade" }),
    contaId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
    papel: text().$type<Exclude<Papel, null>>(),
    silenciadoAte: ts(),
    banido: boolean().notNull().default(false),
    entrouEm: ts().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.espacoId, t.contaId] })],
);

export const convite = pgTable("convite", {
  codigo: text().primaryKey(),
  espacoId: uuid().notNull().references(() => espaco.id, { onDelete: "cascade" }),
  criadoPor: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  expiraEm: ts().notNull(),
  usosMax: integer().notNull(),
  usos: integer().notNull().default(0),
  revogado: boolean().notNull().default(false),
});

export const bloqueio = pgTable(
  "bloqueio",
  {
    contaId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
    bloqueadoId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
    criadoEm: ts().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.contaId, t.bloqueadoId] })],
);
