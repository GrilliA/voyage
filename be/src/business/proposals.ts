import { randomUUID } from "node:crypto";
import type { Proposal, Trip } from "../core/trip.ts";
import { requireProposal, requireTrip } from "./load.ts";
import type { TripRepository } from "./repository.ts";

export async function createProposal(
  trips: TripRepository,
  tripId: string,
  input: { title: string },
): Promise<{ trip: Trip; proposal: Proposal }> {
  await requireTrip(trips, tripId);
  const proposalId = randomUUID();
  await trips.insertProposal({
    id: proposalId,
    tripId,
    title: input.title,
    createdAt: new Date(),
  });
  const trip = await requireTrip(trips, tripId);
  return { trip, proposal: requireProposal(trip, proposalId) };
}

export async function getProposal(
  trips: TripRepository,
  tripId: string,
  proposalId: string,
): Promise<{ trip: Trip; proposal: Proposal }> {
  const trip = await requireTrip(trips, tripId);
  return { trip, proposal: requireProposal(trip, proposalId) };
}

export async function updateProposal(
  trips: TripRepository,
  tripId: string,
  proposalId: string,
  patch: { title?: string },
): Promise<{ trip: Trip; proposal: Proposal }> {
  const existing = await requireTrip(trips, tripId);
  requireProposal(existing, proposalId);
  if (patch.title !== undefined) await trips.saveProposalTitle(proposalId, patch.title);
  const trip = await requireTrip(trips, tripId);
  return { trip, proposal: requireProposal(trip, proposalId) };
}

export async function deleteProposal(
  trips: TripRepository,
  tripId: string,
  proposalId: string,
): Promise<void> {
  const trip = await requireTrip(trips, tripId);
  requireProposal(trip, proposalId);
  await trips.deleteProposal(proposalId);
}
