import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema.ts";

export type AppDatabase = NodePgDatabase<typeof schema>;

export const defaultDatabaseUrl = "postgresql://voyage:voyage@127.0.0.1:5433/voyage";
export const testDatabaseUrl = "postgresql://voyage:voyage@127.0.0.1:5433/voyage_test";

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../drizzle",
);

export function databaseUrlFromEnv(): string {
  return process.env.DATABASE_URL ?? defaultDatabaseUrl;
}

export async function openDatabase(connectionString: string): Promise<{
  database: AppDatabase;
  close: () => Promise<void>;
}> {
  const pool = new Pool({ connectionString });
  const database = drizzle(pool, { schema });
  await migrate(database, { migrationsFolder });
  return {
    database,
    close: () => pool.end(),
  };
}

export async function ensureDatabase(adminUrl: string, databaseName: string): Promise<void> {
  if (!/^[a-z_]+$/.test(databaseName)) {
    throw new Error(`Invalid database name: ${databaseName}`);
  }

  const pool = new Pool({ connectionString: adminUrl });
  try {
    const existing = await pool.query("select 1 from pg_database where datname = $1", [
      databaseName,
    ]);
    if (existing.rowCount === 0) {
      await pool.query(`create database ${databaseName}`);
    }
  } finally {
    await pool.end();
  }
}
