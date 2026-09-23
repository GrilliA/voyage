import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CategoryId } from "../../../shared/domain.ts";
import { NotFound } from "../errors.ts";
import {
  assertDateOrder,
  category,
  description,
  money,
  optionalDate,
  people,
  title,
} from "../domain/validate.ts";

export type StoredLine = {
  id: string;
  category: CategoryId;
  label: string;
  amount: number;
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

type Database = {
  trips: Trip[];
};

export type Store = ReturnType<typeof createStore>;

function isDatabase(value: unknown): value is Database {
  return (
    typeof value === "object" &&
    value !== null &&
    "trips" in value &&
    Array.isArray(value.trips)
  );
}

export function createStore(filePath: string) {
  let queue: Promise<void> = Promise.resolve();

  function read(): Database {
    if (!existsSync(filePath)) return { trips: [] };
    const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    if (!isDatabase(parsed)) throw new Error("Archivio viaggi illeggibile.");
    return parsed;
  }

  function write(data: Database): void {
    mkdirSync(path.dirname(filePath), { recursive: true });
    const temporary = `${filePath}.tmp`;
    writeFileSync(temporary, JSON.stringify(data, null, 2));
    renameSync(temporary, filePath);
  }

  function update<T>(mutator: (data: Database) => T): Promise<T> {
    const run = queue.then(() => {
      const data = read();
      const result = mutator(data);
      write(data);
      return result;
    });
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function requireTrip(data: Database, tripId: string): Trip {
    const trip = data.trips.find((item) => item.id === tripId);
    if (!trip) throw new NotFound("Viaggio non trovato.");
    return trip;
  }

  function requireProposal(trip: Trip, proposalId: string): Proposal {
    const proposal = trip.proposals.find((item) => item.id === proposalId);
    if (!proposal) throw new NotFound("Proposta non trovata.");
    return proposal;
  }

  return {
    listTrips(): Trip[] {
      return read()
        .trips.slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    getTrip(tripId: string): Trip {
      return requireTrip(read(), tripId);
    },

    createTrip(input: Record<string, unknown>): Promise<Trip> {
      return update((data) => {
        const trip: Trip = {
          id: randomUUID(),
          title: title(input.title),
          startDate: optionalDate(input.startDate, "La partenza"),
          endDate: optionalDate(input.endDate, "Il ritorno"),
          people: people(input.people),
          createdAt: new Date().toISOString(),
          proposals: [],
        };
        assertDateOrder(trip.startDate, trip.endDate);
        data.trips.push(trip);
        return trip;
      });
    },

    updateTrip(tripId: string, input: Record<string, unknown>): Promise<Trip> {
      return update((data) => {
        const trip = requireTrip(data, tripId);
        if ("title" in input) trip.title = title(input.title);
        if ("people" in input) trip.people = people(input.people);
        if ("startDate" in input) trip.startDate = optionalDate(input.startDate, "La partenza");
        if ("endDate" in input) trip.endDate = optionalDate(input.endDate, "Il ritorno");
        assertDateOrder(trip.startDate, trip.endDate);
        return trip;
      });
    },

    deleteTrip(tripId: string): Promise<void> {
      return update((data) => {
        const index = data.trips.findIndex((item) => item.id === tripId);
        if (index === -1) throw new NotFound("Viaggio non trovato.");
        data.trips.splice(index, 1);
      });
    },

    createProposal(
      tripId: string,
      input: Record<string, unknown>,
    ): Promise<{ trip: Trip; proposal: Proposal }> {
      return update((data) => {
        const trip = requireTrip(data, tripId);
        const proposal: Proposal = {
          id: randomUUID(),
          title: title(input.title),
          createdAt: new Date().toISOString(),
          lines: [],
        };
        trip.proposals.push(proposal);
        return { trip, proposal };
      });
    },

    getProposal(tripId: string, proposalId: string): { trip: Trip; proposal: Proposal } {
      const trip = requireTrip(read(), tripId);
      return { trip, proposal: requireProposal(trip, proposalId) };
    },

    updateProposal(
      tripId: string,
      proposalId: string,
      input: Record<string, unknown>,
    ): Promise<{ trip: Trip; proposal: Proposal }> {
      return update((data) => {
        const trip = requireTrip(data, tripId);
        const proposal = requireProposal(trip, proposalId);
        if ("title" in input) proposal.title = title(input.title);
        return { trip, proposal };
      });
    },

    deleteProposal(tripId: string, proposalId: string): Promise<void> {
      return update((data) => {
        const trip = requireTrip(data, tripId);
        const index = trip.proposals.findIndex((item) => item.id === proposalId);
        if (index === -1) throw new NotFound("Proposta non trovata.");
        trip.proposals.splice(index, 1);
      });
    },

    addLine(
      tripId: string,
      proposalId: string,
      input: Record<string, unknown>,
    ): Promise<{ trip: Trip; proposal: Proposal }> {
      return update((data) => {
        const trip = requireTrip(data, tripId);
        const proposal = requireProposal(trip, proposalId);
        const line: StoredLine = {
          id: randomUUID(),
          category: category(input.category),
          label: description(input.label),
          amount: money(input.amount),
        };
        proposal.lines.push(line);
        return { trip, proposal };
      });
    },

    updateLine(
      tripId: string,
      proposalId: string,
      lineId: string,
      input: Record<string, unknown>,
    ): Promise<{ trip: Trip; proposal: Proposal }> {
      return update((data) => {
        const trip = requireTrip(data, tripId);
        const proposal = requireProposal(trip, proposalId);
        const line = proposal.lines.find((item) => item.id === lineId);
        if (!line) throw new NotFound("Voce non trovata.");
        line.label = description(input.label);
        line.amount = money(input.amount);
        return { trip, proposal };
      });
    },

    deleteLine(
      tripId: string,
      proposalId: string,
      lineId: string,
    ): Promise<{ trip: Trip; proposal: Proposal }> {
      return update((data) => {
        const trip = requireTrip(data, tripId);
        const proposal = requireProposal(trip, proposalId);
        const index = proposal.lines.findIndex((item) => item.id === lineId);
        if (index === -1) throw new NotFound("Voce non trovata.");
        proposal.lines.splice(index, 1);
        return { trip, proposal };
      });
    },
  };
}
