import { asc, desc, eq, inArray } from "drizzle-orm";
import type { NewLine, NewProposal, NewTrip, TripRepository, TripUpdate } from "../business/repository.ts";
import type { LineAmount, LineContent } from "../core/lines.ts";
import type { Proposal, Trip } from "../core/trip.ts";
import type { AppDatabase } from "./db.ts";
import { centsFromEuros, lineFromRow, lineToColumns, type CostLineRow } from "./rows.ts";
import { costLines, proposals, trips } from "./schema.ts";

type TripRow = typeof trips.$inferSelect;
type ProposalRow = typeof proposals.$inferSelect;

function proposalFrom(proposalRow: ProposalRow, lineRows: CostLineRow[]): Proposal {
  return {
    id: proposalRow.id,
    title: proposalRow.title,
    createdAt: proposalRow.createdAt.toISOString(),
    lines: lineRows
      .filter((lineRow) => lineRow.proposalId === proposalRow.id)
      .map(lineFromRow),
  };
}

function tripFrom(tripRow: TripRow, proposalRows: ProposalRow[], lineRows: CostLineRow[]): Trip {
  return {
    id: tripRow.id,
    title: tripRow.title,
    startDate: tripRow.startDate,
    endDate: tripRow.endDate,
    people: tripRow.people,
    createdAt: tripRow.createdAt.toISOString(),
    proposals: proposalRows
      .filter((proposalRow) => proposalRow.tripId === tripRow.id)
      .map((proposalRow) => proposalFrom(proposalRow, lineRows)),
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

  return tripRows.map((tripRow) => tripFrom(tripRow, proposalRows, lineRows));
}

export async function deleteAllTrips(database: AppDatabase): Promise<void> {
  await database.delete(trips);
}

export function createTripRepository(database: AppDatabase): TripRepository {
  return {
    listTrips(): Promise<Trip[]> {
      return loadTrips(database);
    },

    async findTrip(tripId: string): Promise<Trip | null> {
      const loaded = await loadTrips(database, tripId);
      return loaded[0] ?? null;
    },

    async insertTrip(trip: NewTrip): Promise<void> {
      await database.insert(trips).values(trip);
    },

    async saveTrip(trip: TripUpdate): Promise<void> {
      await database
        .update(trips)
        .set({
          title: trip.title,
          people: trip.people,
          startDate: trip.startDate,
          endDate: trip.endDate,
        })
        .where(eq(trips.id, trip.id));
    },

    async saveLineAmounts(amounts: readonly LineAmount[]): Promise<void> {
      for (const update of amounts) {
        await database
          .update(costLines)
          .set({ amountCents: centsFromEuros(update.amount) })
          .where(eq(costLines.id, update.id));
      }
    },

    async deleteTrip(tripId: string): Promise<void> {
      await database.delete(trips).where(eq(trips.id, tripId));
    },

    async insertProposal(proposal: NewProposal): Promise<void> {
      await database.insert(proposals).values(proposal);
    },

    async saveProposalTitle(proposalId: string, title: string): Promise<void> {
      await database.update(proposals).set({ title }).where(eq(proposals.id, proposalId));
    },

    async deleteProposal(proposalId: string): Promise<void> {
      await database.delete(proposals).where(eq(proposals.id, proposalId));
    },

    async insertLine(line: NewLine): Promise<void> {
      await database.insert(costLines).values({
        id: line.id,
        proposalId: line.proposalId,
        category: line.category,
        createdAt: line.createdAt,
        ...lineToColumns(line),
      });
    },

    async saveLine(lineId: string, line: LineContent): Promise<void> {
      await database.update(costLines).set(lineToColumns(line)).where(eq(costLines.id, lineId));
    },

    async deleteLine(lineId: string): Promise<void> {
      await database.delete(costLines).where(eq(costLines.id, lineId));
    },
  };
}
