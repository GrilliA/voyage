import type { CostLine } from "../../../shared/domain.ts";
import { NotFound } from "../core/errors.ts";
import type { Proposal, Trip } from "../core/trip.ts";
import type { TripRepository } from "./repository.ts";

export async function requireTrip(trips: TripRepository, tripId: string): Promise<Trip> {
  const trip = await trips.findTrip(tripId);
  if (!trip) throw new NotFound("Viaggio non trovato.");
  return trip;
}

export function requireProposal(trip: Trip, proposalId: string): Proposal {
  const proposal = trip.proposals.find((candidate) => candidate.id === proposalId);
  if (!proposal) throw new NotFound("Proposta non trovata.");
  return proposal;
}

export function requireLine(proposal: Proposal, lineId: string): CostLine {
  const line = proposal.lines.find((candidate) => candidate.id === lineId);
  if (!line) throw new NotFound("Voce non trovata.");
  return line;
}
