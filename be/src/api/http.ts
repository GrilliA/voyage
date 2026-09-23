import type { Response } from "express";
import { BadInput, NotFound } from "../core/errors.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function routeId(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new NotFound("Percorso non trovato.");
  }
  return value;
}

function isJsonSyntaxError(error: unknown): boolean {
  return error instanceof SyntaxError && "status" in error && error.status === 400;
}

export function sendHttpError(res: Response, error: unknown): boolean {
  if (error instanceof NotFound) {
    res.status(404).json({ error: error.message });
    return true;
  }
  if (error instanceof BadInput) {
    res.status(400).json({ error: error.message });
    return true;
  }
  if (isJsonSyntaxError(error)) {
    res.status(400).json({ error: "Richiesta non valida." });
    return true;
  }
  return false;
}
