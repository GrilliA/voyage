import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.ts";

const storePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/store.json");
const port = Number(process.env.PORT) || 3001;

createApp({ storePath }).listen(port, "127.0.0.1", () => {
  console.log(`Voyage API on http://127.0.0.1:${port}`);
});
