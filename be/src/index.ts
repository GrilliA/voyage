import { createApp } from "./api/app.ts";
import { configFromEnv } from "./infrastructure/config.ts";
import { openDatabase } from "./infrastructure/db.ts";
import { createTripRepository } from "./infrastructure/trip-repository.ts";

const config = configFromEnv(process.env);
const { database } = await openDatabase(config.databaseUrl);

createApp(createTripRepository(database)).listen(config.port, "127.0.0.1", () => {
  console.log(`Voyage API on http://127.0.0.1:${config.port}`);
});
