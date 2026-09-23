import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { createStore } from "./data/store.ts";
import { createTripsRouter } from "./routes/trips.ts";

function isJsonSyntaxError(error: unknown): error is SyntaxError {
  return error instanceof SyntaxError && "status" in error && error.status === 400;
}

export function createApp({ storePath }: { storePath: string }): Express {
  const store = createStore(storePath);
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/trips", createTripsRouter(store));
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Percorso non trovato." });
  });
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (isJsonSyntaxError(error)) {
      res.status(400).json({ error: "Richiesta non valida." });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Errore del server." });
  });

  return app;
}
