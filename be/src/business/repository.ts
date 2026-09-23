import type { CategoryId } from "../../../shared/domain.ts";
import type { LineAmount, LineContent } from "../core/lines.ts";
import type { Trip } from "../core/trip.ts";

export type NewTrip = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  people: number;
  createdAt: Date;
};

export type TripUpdate = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  people: number;
};

export type NewProposal = {
  id: string;
  tripId: string;
  title: string;
  createdAt: Date;
};

export type NewLine = LineContent & {
  id: string;
  proposalId: string;
  category: CategoryId;
  createdAt: Date;
};

export type TripRepository = {
  listTrips(): Promise<Trip[]>;
  findTrip(tripId: string): Promise<Trip | null>;
  insertTrip(trip: NewTrip): Promise<void>;
  saveTrip(trip: TripUpdate): Promise<void>;
  saveLineAmounts(amounts: readonly LineAmount[]): Promise<void>;
  deleteTrip(tripId: string): Promise<void>;
  insertProposal(proposal: NewProposal): Promise<void>;
  saveProposalTitle(proposalId: string, title: string): Promise<void>;
  deleteProposal(proposalId: string): Promise<void>;
  insertLine(line: NewLine): Promise<void>;
  saveLine(lineId: string, line: LineContent): Promise<void>;
  deleteLine(lineId: string): Promise<void>;
};
