import { defaultDatabaseUrl } from "./db.ts";

export type Config = {
  port: number;
  databaseUrl: string;
};

export function configFromEnv(env: NodeJS.ProcessEnv): Config {
  return {
    port: portFromEnv(env.PORT),
    databaseUrl: databaseUrlFromEnv(env.DATABASE_URL),
  };
}

function portFromEnv(value: string | undefined): number {
  if (value == null || value === "") return 3001;
  if (!/^\d+$/.test(value)) throw new Error("PORT is not a valid port.");
  const port = Number(value);
  if (port < 1 || port > 65535) throw new Error("PORT is not a valid port.");
  return port;
}

function databaseUrlFromEnv(value: string | undefined): string {
  if (value == null || value === "") return defaultDatabaseUrl;
  return value;
}
