import { z } from "zod";
import {
  CATEGORIES,
  isCategoryId,
  isIsoDate,
  toCents,
  type CategoryId,
  type CategorySection,
  type CostLine,
  type FlightDetails,
  type LineCreate,
  type LineUpdate,
  type MoneyTotals,
  type PriceBasis,
  type ProposalDetail,
  type ProposalSummary,
  type StayDetails,
  type TripDetail,
  type TripInput,
  type TripPatch,
  type TripSummary,
} from "./domain.ts";

function failure(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

function fields(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Richiesta non valida.");
  }
  return Object.fromEntries(Object.entries(value));
}

function readTitle(value: unknown): string {
  const parsed = z
    .string({ error: "Il titolo è obbligatorio." })
    .trim()
    .min(1, "Il titolo è obbligatorio.")
    .max(80, "Il titolo è troppo lungo.")
    .safeParse(value);
  if (!parsed.success) throw new Error(failure(parsed.error, "Il titolo è obbligatorio."));
  return parsed.data;
}

function readPeople(value: unknown): number {
  const message = "Le persone devono essere un numero da 1 a 99.";
  const parsed = z.number({ error: message }).int(message).min(1, message).max(99, message).safeParse(value);
  if (!parsed.success) throw new Error(message);
  return parsed.data;
}

function readOptionalDate(value: unknown, label: string): string {
  if (value == null || value === "") return "";
  const message = `${label} non è una data valida.`;
  const parsed = z
    .string({ error: message })
    .refine((date) => isIsoDate(date), message)
    .safeParse(value);
  if (!parsed.success) throw new Error(message);
  return parsed.data;
}

function readRequiredDate(value: unknown, label: string): string {
  const date = readOptionalDate(value, label);
  if (!date) throw new Error(`${label} è obbligatoria.`);
  return date;
}

function assertDateOrder(startDate: string, endDate: string): void {
  if (startDate && endDate && endDate < startDate) {
    throw new Error("La data di fine è prima della partenza.");
  }
}

function readDescription(value: unknown): string {
  const parsed = z
    .string({ error: "La descrizione è obbligatoria." })
    .trim()
    .min(1, "La descrizione è obbligatoria.")
    .max(120, "La descrizione è troppo lunga.")
    .safeParse(value);
  if (!parsed.success) throw new Error(failure(parsed.error, "La descrizione è obbligatoria."));
  return parsed.data;
}

function readMoney(value: unknown): number {
  const message = "L'importo non è valido.";
  const parsed = z.number({ error: message }).safeParse(value);
  const cents = parsed.success ? toCents(parsed.data) : null;
  if (cents == null || cents < 0 || cents > 100_000_000) throw new Error(message);
  return cents / 100;
}

function readPlace(value: unknown, emptyMessage: string, longMessage: string): string {
  const parsed = z
    .string({ error: emptyMessage })
    .trim()
    .min(1, emptyMessage)
    .max(40, longMessage)
    .safeParse(value);
  if (!parsed.success) throw new Error(failure(parsed.error, emptyMessage));
  return parsed.data;
}

function readBasis(value: unknown): PriceBasis {
  const message = "Scegli se il prezzo è totale o a persona.";
  const parsed = z.enum(["totale", "persona"], { error: message }).safeParse(value);
  if (!parsed.success) throw new Error(message);
  return parsed.data;
}

function readCategory(value: unknown): CategoryId {
  const message = "Categoria non valida.";
  const parsed = z.string({ error: message }).safeParse(value);
  if (!parsed.success || !isCategoryId(parsed.data)) throw new Error(message);
  return parsed.data;
}

function readStayPlace(value: unknown): string {
  const parsed = z
    .string({ error: "Il luogo è obbligatorio." })
    .trim()
    .min(1, "Il luogo è obbligatorio.")
    .max(80, "Il luogo è troppo lungo.")
    .safeParse(value);
  if (!parsed.success) throw new Error(failure(parsed.error, "Il luogo è obbligatorio."));
  return parsed.data;
}

function readFlight(input: Record<string, unknown>): FlightDetails {
  return {
    basis: readBasis(input.basis),
    price: readMoney(input.price),
    outboundFrom: readPlace(
      input.outboundFrom,
      "La partenza dell'andata è obbligatoria.",
      "La partenza dell'andata è troppo lunga.",
    ),
    outboundTo: readPlace(
      input.outboundTo,
      "L'arrivo dell'andata è obbligatorio.",
      "L'arrivo dell'andata è troppo lungo.",
    ),
    returnFrom: readPlace(
      input.returnFrom,
      "La partenza del ritorno è obbligatoria.",
      "La partenza del ritorno è troppo lunga.",
    ),
    returnTo: readPlace(
      input.returnTo,
      "L'arrivo del ritorno è obbligatorio.",
      "L'arrivo del ritorno è troppo lungo.",
    ),
  };
}

function readStayLink(value: unknown): string {
  if (value == null || value === "") return "";
  const invalid = "Il link non è valido.";
  const parsed = z.string({ error: invalid }).trim().safeParse(value);
  if (!parsed.success) throw new Error(invalid);
  const link = parsed.data;
  if (!link) return "";
  if (link.length > 2000) throw new Error("Il link è troppo lungo.");
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    throw new Error(invalid);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(invalid);
  return link;
}

function readStay(input: Record<string, unknown>): StayDetails {
  const checkIn = readRequiredDate(input.checkIn, "La data di arrivo");
  const checkOut = readRequiredDate(input.checkOut, "La data di uscita");
  if (checkOut <= checkIn) throw new Error("Il soggiorno deve durare almeno una notte.");
  return {
    basis: readBasis(input.basis),
    price: readMoney(input.price),
    place: readStayPlace(input.place),
    checkIn,
    checkOut,
    link: readStayLink(input.link),
  };
}

export function decodeTripCreate(value: unknown): TripInput {
  const input = fields(value);
  const trip = {
    title: readTitle(input.title),
    startDate: readOptionalDate(input.startDate, "La partenza"),
    endDate: readOptionalDate(input.endDate, "Il ritorno"),
    people: readPeople(input.people),
  };
  assertDateOrder(trip.startDate, trip.endDate);
  return trip;
}

export function decodeTripPatch(value: unknown): TripPatch {
  const input = fields(value);
  const patch: TripPatch = {};
  if ("title" in input) patch.title = readTitle(input.title);
  if ("startDate" in input) patch.startDate = readOptionalDate(input.startDate, "La partenza");
  if ("endDate" in input) patch.endDate = readOptionalDate(input.endDate, "Il ritorno");
  if ("people" in input) patch.people = readPeople(input.people);
  if (patch.startDate !== undefined && patch.endDate !== undefined) {
    assertDateOrder(patch.startDate, patch.endDate);
  }
  return patch;
}

export function decodeProposalCreate(value: unknown): { title: string } {
  return { title: readTitle(fields(value).title) };
}

export function decodeProposalPatch(value: unknown): { title?: string } {
  const input = fields(value);
  if (!("title" in input)) return {};
  return { title: readTitle(input.title) };
}

export function decodeLineCreate(value: unknown): LineCreate {
  const input = fields(value);
  const category = readCategory(input.category);
  if (category === "voli" && "price" in input) return { kind: "flight", flight: readFlight(input) };
  if (category === "alloggio" && "checkIn" in input) return { kind: "stay", stay: readStay(input) };
  return {
    kind: "plain",
    category,
    label: readDescription(input.label),
    amount: readMoney(input.amount),
  };
}

export function decodeLineUpdate(value: unknown, category: CategoryId): LineUpdate {
  const input = fields(value);
  if (category === "voli" && "price" in input) return { kind: "flight", flight: readFlight(input) };
  if (category === "alloggio" && "checkIn" in input) return { kind: "stay", stay: readStay(input) };
  return { kind: "plain", label: readDescription(input.label), amount: readMoney(input.amount) };
}

export function encodeTripCreate(body: TripInput): TripInput {
  return decodeTripCreate(body);
}

export function encodeTripPatch(body: TripPatch): TripPatch {
  return decodeTripPatch(body);
}

export function encodeProposalCreate(body: { title: string }): { title: string } {
  return decodeProposalCreate(body);
}

export function encodeProposalPatch(body: { title?: string }): { title?: string } {
  return decodeProposalPatch(body);
}

export function encodeLineCreate(body: {
  category: CategoryId;
  label?: string;
  amount?: number;
  basis?: PriceBasis;
  price?: number;
  outboundFrom?: string;
  outboundTo?: string;
  returnFrom?: string;
  returnTo?: string;
  place?: string;
  checkIn?: string;
  checkOut?: string;
}): { category: CategoryId } & (FlightDetails | StayDetails | { label: string; amount: number }) {
  const command = decodeLineCreate(body);
  if (command.kind === "flight") return { category: "voli", ...command.flight };
  if (command.kind === "stay") return { category: "alloggio", ...command.stay };
  return { category: command.category, label: command.label, amount: command.amount };
}

export function encodeLineUpdate(
  body: FlightDetails | StayDetails | { label: string; amount: number },
): FlightDetails | StayDetails | { label: string; amount: number } {
  const input = fields(body);
  if ("checkIn" in input) return readStay(input);
  if ("price" in input) return readFlight(input);
  return { label: readDescription(input.label), amount: readMoney(input.amount) };
}

const basisSchema = z.enum(["totale", "persona"]);

const moneyTotalsSchema = z.object({
  byCategory: z.object({
    voli: z.number(),
    alloggio: z.number(),
    cibo: z.number(),
    trasporti: z.number(),
    attivita: z.number(),
    altro: z.number(),
  }),
  total: z.number(),
  perPerson: z.number().nullable(),
});

const flightSchema = z.object({
  basis: basisSchema,
  price: z.number(),
  outboundFrom: z.string(),
  outboundTo: z.string(),
  returnFrom: z.string(),
  returnTo: z.string(),
});

const staySchema = z.object({
  basis: basisSchema,
  price: z.number(),
  place: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  link: z.string(),
});

const costLineSchema = z.object({
  id: z.string(),
  category: z.string(),
  label: z.string(),
  amount: z.number(),
  flight: flightSchema.nullable(),
  stay: staySchema.nullable(),
});

const proposalSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  totals: moneyTotalsSchema,
  priced: z.boolean(),
  cheapest: z.boolean(),
});

const tripSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  people: z.number(),
  proposalCount: z.number(),
  lowestTotal: z.number().nullable(),
  lowestPerPerson: z.number().nullable(),
});

const sectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  hint: z.string(),
});

const proposalDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  totals: moneyTotalsSchema,
  priced: z.boolean(),
  trip: z.object({
    id: z.string(),
    title: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    people: z.number(),
  }),
  lines: z.array(costLineSchema),
  sections: z.array(sectionSchema),
});

const refused = "Qualcosa non ha funzionato.";

function moneyTotals(value: z.infer<typeof moneyTotalsSchema>): MoneyTotals {
  return {
    byCategory: {
      voli: value.byCategory.voli,
      alloggio: value.byCategory.alloggio,
      cibo: value.byCategory.cibo,
      trasporti: value.byCategory.trasporti,
      attivita: value.byCategory.attivita,
      altro: value.byCategory.altro,
    },
    total: value.total,
    perPerson: value.perPerson,
  };
}

function flightFrom(value: z.infer<typeof flightSchema>): FlightDetails {
  return {
    basis: value.basis,
    price: value.price,
    outboundFrom: value.outboundFrom,
    outboundTo: value.outboundTo,
    returnFrom: value.returnFrom,
    returnTo: value.returnTo,
  };
}

function stayFrom(value: z.infer<typeof staySchema>): StayDetails {
  return {
    basis: value.basis,
    price: value.price,
    place: value.place,
    checkIn: value.checkIn,
    checkOut: value.checkOut,
    link: value.link,
  };
}

function costLineFrom(value: z.infer<typeof costLineSchema>): CostLine {
  if (!isCategoryId(value.category)) throw new Error(refused);
  return {
    id: value.id,
    category: value.category,
    label: value.label,
    amount: value.amount,
    flight: value.flight ? flightFrom(value.flight) : null,
    stay: value.stay ? stayFrom(value.stay) : null,
  };
}

function sectionFrom(value: z.infer<typeof sectionSchema>): CategorySection {
  if (!isCategoryId(value.id)) throw new Error(refused);
  const section = CATEGORIES.find((category) => category.id === value.id);
  if (!section) throw new Error(refused);
  return section;
}

function proposalSummaryFrom(value: z.infer<typeof proposalSummarySchema>): ProposalSummary {
  return {
    id: value.id,
    title: value.title,
    totals: moneyTotals(value.totals),
    priced: value.priced,
    cheapest: value.cheapest,
  };
}

export function decodeTripSummary(value: unknown): TripSummary {
  const parsed = tripSummarySchema.safeParse(value);
  if (!parsed.success) throw new Error(refused);
  return {
    id: parsed.data.id,
    title: parsed.data.title,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    people: parsed.data.people,
    proposalCount: parsed.data.proposalCount,
    lowestTotal: parsed.data.lowestTotal,
    lowestPerPerson: parsed.data.lowestPerPerson,
  };
}

export function decodeTripSummaries(value: unknown): TripSummary[] {
  const parsed = z.array(tripSummarySchema).safeParse(value);
  if (!parsed.success) throw new Error(refused);
  return parsed.data.map((summary) => decodeTripSummary(summary));
}

export function decodeTripDetail(value: unknown): TripDetail {
  const parsed = tripSummarySchema
    .extend({ proposals: z.array(proposalSummarySchema) })
    .safeParse(value);
  if (!parsed.success) throw new Error(refused);
  return {
    ...decodeTripSummary(parsed.data),
    proposals: parsed.data.proposals.map(proposalSummaryFrom),
  };
}

export function decodeProposalDetail(value: unknown): ProposalDetail {
  const parsed = proposalDetailSchema.safeParse(value);
  if (!parsed.success) throw new Error(refused);
  return {
    id: parsed.data.id,
    title: parsed.data.title,
    totals: moneyTotals(parsed.data.totals),
    priced: parsed.data.priced,
    trip: {
      id: parsed.data.trip.id,
      title: parsed.data.trip.title,
      startDate: parsed.data.trip.startDate,
      endDate: parsed.data.trip.endDate,
      people: parsed.data.trip.people,
    },
    lines: parsed.data.lines.map(costLineFrom),
    sections: parsed.data.sections.map(sectionFrom),
  };
}
