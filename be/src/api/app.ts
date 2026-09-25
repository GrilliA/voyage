import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { TripRepository } from "../business/repository.ts";
import { sendHttpError } from "./http.ts";
import { createTripsRouter } from "./routes/trips.ts";

export function createApp(trips: TripRepository): Express {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/trips", createTripsRouter(trips));
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Percorso non trovato." });
  });
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (sendHttpError(res, error)) return;
    console.error(error);
    res.status(500).json({ error: "Errore del server." });
  });

  return app;
}
