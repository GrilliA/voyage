import assert from "node:assert/strict";
import test from "node:test";
import { defaultDatabaseUrl } from "./db.ts";
import { configFromEnv } from "./config.ts";

test("missing config uses the local database and port", () => {
  assert.deepEqual(configFromEnv({}), { port: 3001, databaseUrl: defaultDatabaseUrl });
  assert.deepEqual(configFromEnv({ PORT: "", DATABASE_URL: "" }), {
    port: 3001,
    databaseUrl: defaultDatabaseUrl,
  });
});

test("a whole port and a database url are kept", () => {
  assert.deepEqual(configFromEnv({ PORT: "4000", DATABASE_URL: "postgresql://voyage@db/voyage" }), {
    port: 4000,
    databaseUrl: "postgresql://voyage@db/voyage",
  });
});

test("a port that is not a whole number is refused", () => {
  assert.throws(() => configFromEnv({ PORT: "abc" }), /PORT/);
  assert.throws(() => configFromEnv({ PORT: "3001.5" }), /PORT/);
  assert.throws(() => configFromEnv({ PORT: "0" }), /PORT/);
});
