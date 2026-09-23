import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  isCategoryId,
  totalForBasis,
  type CategoryId,
  type FlightDetails,
  type PriceBasis,
  type StayDetails,
} from "../../../shared/domain.ts";
import { toCents } from "../domain/calc.ts";
import {
  assertDateOrder,
  category,
  description,
  flightInput,
  money,
  optionalDate,
  people,
  stayInput,
  title,
} from "../domain/validate.ts";
import { NotFound } from "../errors.ts";
import type { AppDatabase } from "./db.ts";
import { costLines, proposals, trips } from "./schema.ts";

export type StoredLine = {
  id: string;
  category: CategoryId;
  label: string;
  amount: number;
  flight: FlightDetails | null;
  stay: StayDetails | null;
};

export type Proposal = {
  id: string;
  title: string;
  createdAt: string;
  lines: StoredLine[];
};

export type Trip = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  people: number;
  createdAt: string;
  proposals: Proposal[];
};

type TripRow = typeof trips.$inferSelect;
type ProposalRow = typeof proposals.$inferSelect;
type CostLineRow = typeof costLines.$inferSelect;

export type Store = ReturnType<typeof createStore>;

function eurosFromCents(amountCents: number): number {
  return amountCents / 100;
}

function centsFromEuros(amountInEuros: number): number {
  const amountCents = toCents(amountInEuros);
  if (amountCents == null) throw new Error("Invalid amount.");
  return amountCents;
}

function storedCategory(value: string): CategoryId {
  if (!isCategoryId(value)) throw new Error(`Unknown category in database: ${value}`);
  return value;
}

function storedBasis(value: string): PriceBasis {
  if (value !== "totale" && value !== "persona") throw new Error(`Unknown price basis: ${value}`);
  return value;
}

function assembleFlight(lineRow: CostLineRow): FlightDetails | null {
  if (
    lineRow.priceBasis == null ||
    lineRow.priceCents == null ||
    lineRow.outboundFrom == null ||
    lineRow.outboundTo == null ||
    lineRow.returnFrom == null ||
    lineRow.returnTo == null
  ) {
    return null;
  }

  return {
    basis: storedBasis(lineRow.priceBasis),
    price: eurosFromCents(lineRow.priceCents),
    outboundFrom: lineRow.outboundFrom,
    outboundTo: lineRow.outboundTo,
    returnFrom: lineRow.returnFrom,
    returnTo: lineRow.returnTo,
  };
}

function flightRecord(flight: FlightDetails, peopleCount: number) {
  return {
    label: `${flight.outboundFrom} → ${flight.outboundTo} · ${flight.returnFrom} → ${flight.returnTo}`,
    amountCents: centsFromEuros(money(totalForBasis(flight.price, flight.basis, peopleCount))),
    priceBasis: flight.basis,
    priceCents: centsFromEuros(flight.price),
    outboundFrom: flight.outboundFrom,
    outboundTo: flight.outboundTo,
    returnFrom: flight.returnFrom,
    returnTo: flight.returnTo,
    checkIn: null,
    checkOut: null,
  };
}

function assembleStay(lineRow: CostLineRow): StayDetails | null {
  if (lineRow.category !== "alloggio") return null;
  if (
    lineRow.priceBasis == null ||
    lineRow.priceCents == null ||
    lineRow.checkIn == null ||
    lineRow.checkOut == null
  ) {
    return null;
  }

  return {
    basis: storedBasis(lineRow.priceBasis),
    price: eurosFromCents(lineRow.priceCents),
    place: lineRow.label,
    checkIn: lineRow.checkIn,
    checkOut: lineRow.checkOut,
  };
}

function stayRecord(stay: StayDetails, peopleCount: number) {
  return {
    label: stay.place,
    amountCents: centsFromEuros(money(totalForBasis(stay.price, stay.basis, peopleCount))),
    priceBasis: stay.basis,
    priceCents: centsFromEuros(stay.price),
    outboundFrom: null,
    outboundTo: null,
    returnFrom: null,
    returnTo: null,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
  };
}

const blankDetails = {
  priceBasis: null,
  priceCents: null,
  outboundFrom: null,
  outboundTo: null,
  returnFrom: null,
  returnTo: null,
  checkIn: null,
  checkOut: null,
};

async function personPricedRows(database: AppDatabase, tripId: string) {
  const proposalRows = await database
    .select({ id: proposals.id })
    .from(proposals)
    .where(eq(proposals.tripId, tripId));
  const proposalIds = proposalRows.map((proposalRow) => proposalRow.id);
  if (proposalIds.length === 0) return [];

  return database
    .select()
    .from(costLines)
    .where(and(inArray(costLines.proposalId, proposalIds), eq(costLines.priceBasis, "persona")));
}

function assembleProposal(proposalRow: ProposalRow, lineRows: CostLineRow[]): Proposal {
  const lines = lineRows
    .filter((lineRow) => lineRow.proposalId === proposalRow.id)
    .map((lineRow) => ({
      id: lineRow.id,
      category: storedCategory(lineRow.category),
      label: lineRow.label,
      amount: eurosFromCents(lineRow.amountCents),
      flight: assembleFlight(lineRow),
      stay: assembleStay(lineRow),
    }));

  return {
    id: proposalRow.id,
    title: proposalRow.title,
    createdAt: proposalRow.createdAt.toISOString(),
    lines,
  };
}

function assembleTrip(tripRow: TripRow, proposalRows: ProposalRow[], lineRows: CostLineRow[]): Trip {
  const tripProposals = proposalRows
    .filter((proposalRow) => proposalRow.tripId === tripRow.id)
    .map((proposalRow) => assembleProposal(proposalRow, lineRows));

  return {
    id: tripRow.id,
    title: tripRow.title,
    startDate: tripRow.startDate,
    endDate: tripRow.endDate,
    people: tripRow.people,
    createdAt: tripRow.createdAt.toISOString(),
    proposals: tripProposals,
  };
}

async function loadTrips(database: AppDatabase, tripId?: string): Promise<Trip[]> {
  const tripRows = tripId
    ? await database.select().from(trips).where(eq(trips.id, tripId))
    : await database.select().from(trips).orderBy(desc(trips.createdAt));

  if (tripRows.length === 0) return [];

  const tripIds = tripRows.map((tripRow) => tripRow.id);
  const proposalRows = await database
    .select()
    .from(proposals)
    .where(inArray(proposals.tripId, tripIds))
    .orderBy(asc(proposals.createdAt));

  const proposalIds = proposalRows.map((proposalRow) => proposalRow.id);
  const lineRows =
    proposalIds.length === 0
      ? []
      : await database
          .select()
          .from(costLines)
          .where(inArray(costLines.proposalId, proposalIds))
          .orderBy(asc(costLines.createdAt));

  return tripRows.map((tripRow) => assembleTrip(tripRow, proposalRows, lineRows));
}

async function requireTrip(database: AppDatabase, tripId: string): Promise<Trip> {
  const loaded = await loadTrips(database, tripId);
  const trip = loaded[0];
  if (!trip) throw new NotFound("Viaggio non trovato.");
  return trip;
}

function requireProposal(trip: Trip, proposalId: string): Proposal {
  const proposal = trip.proposals.find((candidate) => candidate.id === proposalId);
  if (!proposal) throw new NotFound("Proposta non trovata.");
  return proposal;
}

export async function deleteAllTrips(database: AppDatabase): Promise<void> {
  await database.delete(trips);
}

export function createStore(database: AppDatabase) {
  return {
    async listTrips(): Promise<Trip[]> {
      return loadTrips(database);
    },

    async getTrip(tripId: string): Promise<Trip> {
      return requireTrip(database, tripId);
    },

    async createTrip(input: Record<string, unknown>): Promise<Trip> {
      const startDate = optionalDate(input.startDate, "La partenza");
      const endDate = optionalDate(input.endDate, "Il ritorno");
      assertDateOrder(startDate, endDate);

      const tripId = randomUUID();
      await database.insert(trips).values({
        id: tripId,
        title: title(input.title),
        startDate,
        endDate,
        people: people(input.people),
        createdAt: new Date(),
      });

      return requireTrip(database, tripId);
    },

    async updateTrip(tripId: string, input: Record<string, unknown>): Promise<Trip> {
      const existing = await requireTrip(database, tripId);
      const startDate = "startDate" in input ? optionalDate(input.startDate, "La partenza") : existing.startDate;
      const endDate = "endDate" in input ? optionalDate(input.endDate, "Il ritorno") : existing.endDate;
      assertDateOrder(startDate, endDate);
      const nextPeople = "people" in input ? people(input.people) : existing.people;
      const pricedPerPerson = nextPeople === existing.people ? [] : await personPricedRows(database, tripId);
      const scaledAmounts = pricedPerPerson.flatMap((lineRow) => {
        if (lineRow.priceCents == null) return [];
        return [
          {
            id: lineRow.id,
            amountCents: centsFromEuros(
              money(totalForBasis(eurosFromCents(lineRow.priceCents), "persona", nextPeople)),
            ),
          },
        ];
      });

      await database
        .update(trips)
        .set({
          title: "title" in input ? title(input.title) : existing.title,
          people: nextPeople,
          startDate,
          endDate,
        })
        .where(eq(trips.id, tripId));

      for (const scaled of scaledAmounts) {
        await database
          .update(costLines)
          .set({ amountCents: scaled.amountCents })
          .where(eq(costLines.id, scaled.id));
      }

      return requireTrip(database, tripId);
    },

    async deleteTrip(tripId: string): Promise<void> {
      await requireTrip(database, tripId);
      await database.delete(trips).where(eq(trips.id, tripId));
    },

    async createProposal(
      tripId: string,
      input: Record<string, unknown>,
    ): Promise<{ trip: Trip; proposal: Proposal }> {
      await requireTrip(database, tripId);
      const proposalId = randomUUID();
      await database.insert(proposals).values({
        id: proposalId,
        tripId,
        title: title(input.title),
        createdAt: new Date(),
      });

      const trip = await requireTrip(database, tripId);
      return { trip, proposal: requireProposal(trip, proposalId) };
    },

    async getProposal(tripId: string, proposalId: string): Promise<{ trip: Trip; proposal: Proposal }> {
      const trip = await requireTrip(database, tripId);
      return { trip, proposal: requireProposal(trip, proposalId) };
    },

    async updateProposal(
      tripId: string,
      proposalId: string,
      input: Record<string, unknown>,
    ): Promise<{ trip: Trip; proposal: Proposal }> {
      const existing = await requireTrip(database, tripId);
      requireProposal(existing, proposalId);

      if ("title" in input) {
        await database
          .update(proposals)
          .set({ title: title(input.title) })
          .where(eq(proposals.id, proposalId));
      }

      const trip = await requireTrip(database, tripId);
      return { trip, proposal: requireProposal(trip, proposalId) };
    },

    async deleteProposal(tripId: string, proposalId: string): Promise<void> {
      const trip = await requireTrip(database, tripId);
      requireProposal(trip, proposalId);
      await database.delete(proposals).where(eq(proposals.id, proposalId));
    },

    async addLine(
      tripId: string,
      proposalId: string,
      input: Record<string, unknown>,
    ): Promise<{ trip: Trip; proposal: Proposal }> {
      const existing = await requireTrip(database, tripId);
      requireProposal(existing, proposalId);

      const lineCategory = category(input.category);
      const flight = lineCategory === "voli" && "price" in input ? flightInput(input) : null;
      const stay = lineCategory === "alloggio" && "checkIn" in input ? stayInput(input) : null;
      const recorded = flight
        ? flightRecord(flight, existing.people)
        : stay
          ? stayRecord(stay, existing.people)
          : null;

      await database.insert(costLines).values({
        id: randomUUID(),
        proposalId,
        category: lineCategory,
        label: recorded ? recorded.label : description(input.label),
        amountCents: recorded ? recorded.amountCents : centsFromEuros(money(input.amount)),
        priceBasis: recorded?.priceBasis ?? null,
        priceCents: recorded?.priceCents ?? null,
        outboundFrom: recorded?.outboundFrom ?? null,
        outboundTo: recorded?.outboundTo ?? null,
        returnFrom: recorded?.returnFrom ?? null,
        returnTo: recorded?.returnTo ?? null,
        checkIn: recorded?.checkIn ?? null,
        checkOut: recorded?.checkOut ?? null,
        createdAt: new Date(),
      });

      const trip = await requireTrip(database, tripId);
      return { trip, proposal: requireProposal(trip, proposalId) };
    },

    async updateLine(
      tripId: string,
      proposalId: string,
      lineId: string,
      input: Record<string, unknown>,
    ): Promise<{ trip: Trip; proposal: Proposal }> {
      const existing = await requireTrip(database, tripId);
      const proposal = requireProposal(existing, proposalId);
      const line = proposal.lines.find((candidate) => candidate.id === lineId);
      if (!line) throw new NotFound("Voce non trovata.");

      const flight = line.category === "voli" && "price" in input ? flightInput(input) : null;
      const stay = line.category === "alloggio" && "checkIn" in input ? stayInput(input) : null;
      const recorded = flight
        ? flightRecord(flight, existing.people)
        : stay
          ? stayRecord(stay, existing.people)
          : null;

      await database
        .update(costLines)
        .set(
          recorded
            ? recorded
            : {
                label: description(input.label),
                amountCents: centsFromEuros(money(input.amount)),
                ...blankDetails,
              },
        )
        .where(eq(costLines.id, lineId));

      const trip = await requireTrip(database, tripId);
      return { trip, proposal: requireProposal(trip, proposalId) };
    },

    async deleteLine(
      tripId: string,
      proposalId: string,
      lineId: string,
    ): Promise<{ trip: Trip; proposal: Proposal }> {
      const existing = await requireTrip(database, tripId);
      const proposal = requireProposal(existing, proposalId);
      const line = proposal.lines.find((candidate) => candidate.id === lineId);
      if (!line) throw new NotFound("Voce non trovata.");

      await database.delete(costLines).where(eq(costLines.id, lineId));

      const trip = await requireTrip(database, tripId);
      return { trip, proposal: requireProposal(trip, proposalId) };
    },
  };
}
