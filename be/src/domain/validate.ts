import {
  isCategoryId,
  type CategoryId,
  type FlightDetails,
  type PriceBasis,
} from "../../../shared/domain.ts";
import { BadInput } from "../errors.ts";
import { toCents } from "./calc.ts";

export function title(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadInput("Il titolo è obbligatorio.");
  }
  const trimmed = value.trim();
  if (trimmed.length > 80) throw new BadInput("Il titolo è troppo lungo.");
  return trimmed;
}

export function people(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 99) {
    throw new BadInput("Le persone devono essere un numero da 1 a 99.");
  }
  return value;
}

export function optionalDate(value: unknown, label: string): string {
  if (value == null || value === "") return "";
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadInput(`${label} non è una data valida.`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!real || year == null || month == null || day == null) {
    throw new BadInput(`${label} non è una data valida.`);
  }
  return value;
}

export function assertDateOrder(startDate: string, endDate: string): void {
  if (startDate && endDate && endDate < startDate) {
    throw new BadInput("La data di fine è prima della partenza.");
  }
}

export function description(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadInput("La descrizione è obbligatoria.");
  }
  const trimmed = value.trim();
  if (trimmed.length > 120) throw new BadInput("La descrizione è troppo lunga.");
  return trimmed;
}

export function money(value: unknown): number {
  const cents = toCents(value);
  if (cents == null || cents < 0 || cents > 100_000_000) {
    throw new BadInput("L'importo non è valido.");
  }
  return cents / 100;
}

function place(value: unknown, emptyMessage: string, longMessage: string): string {
  if (typeof value !== "string" || !value.trim()) throw new BadInput(emptyMessage);
  const trimmed = value.trim();
  if (trimmed.length > 40) throw new BadInput(longMessage);
  return trimmed;
}

export function priceBasis(value: unknown): PriceBasis {
  if (value !== "totale" && value !== "persona") {
    throw new BadInput("Scegli se il prezzo è totale o a persona.");
  }
  return value;
}

export function flightInput(input: Record<string, unknown>): FlightDetails {
  return {
    basis: priceBasis(input.basis),
    price: money(input.price),
    outboundFrom: place(
      input.outboundFrom,
      "La partenza dell'andata è obbligatoria.",
      "La partenza dell'andata è troppo lunga.",
    ),
    outboundTo: place(
      input.outboundTo,
      "L'arrivo dell'andata è obbligatorio.",
      "L'arrivo dell'andata è troppo lungo.",
    ),
    returnFrom: place(
      input.returnFrom,
      "La partenza del ritorno è obbligatoria.",
      "La partenza del ritorno è troppo lunga.",
    ),
    returnTo: place(
      input.returnTo,
      "L'arrivo del ritorno è obbligatorio.",
      "L'arrivo del ritorno è troppo lungo.",
    ),
  };
}

export function category(value: unknown): CategoryId {
  if (typeof value !== "string" || !isCategoryId(value)) {
    throw new BadInput("Categoria non valida.");
  }
  return value;
}

export function jsonObject(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new BadInput("Richiesta non valida.");
  }
  return value as Record<string, unknown>;
}
