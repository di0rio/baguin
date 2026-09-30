import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import { env } from "../env.js";
import * as schema from "./schema.js";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));
const config = { schema, casing: "snake_case" } as const;

async function abrir(): Promise<{ db: Db; fechar: () => Promise<void> }> {
  if (env.databaseUrl) {
    const client = postgres(env.databaseUrl);
    const db = drizzlePostgres(client, config);
    await migratePostgres(db, { migrationsFolder });
    return { db: db as unknown as Db, fechar: () => client.end() };
  }
  const dir = fileURLToPath(new URL("../../.data/pglite", import.meta.url));
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzlePglite(client, config);
  await migratePglite(db, { migrationsFolder });
  return { db: db as unknown as Db, fechar: () => client.close() };
}

const banco = await abrir();
export const db = banco.db;
export const fecharBanco = banco.fechar;
export { schema };
