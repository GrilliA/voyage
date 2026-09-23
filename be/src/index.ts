import { createApp } from "./app.ts";
import { databaseUrlFromEnv, openDatabase } from "./data/db.ts";
import { createStore } from "./data/store.ts";

const { database } = await openDatabase(databaseUrlFromEnv());
const port = Number(process.env.PORT) || 3001;

createApp(createStore(database)).listen(port, "127.0.0.1", () => {
  console.log(`Voyage API on http://127.0.0.1:${port}`);
});
