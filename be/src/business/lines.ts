import { randomUUID } from "node:crypto";
import type { LineCreate, LineUpdate } from "../../../shared/domain.ts";
import { lineContent } from "../core/lines.ts";
import type { Proposal, Trip } from "../core/trip.ts";
import { requireLine, requireProposal, requireTrip } from "./load.ts";
import type { TripRepository } from "./repository.ts";

export async function addLine(
  trips: TripRepository,
  tripId: string,
  proposalId: string,
  command: LineCreate,
): Promise<{ trip: Trip; proposal: Proposal }> {
  const existing = await requireTrip(trips, tripId);
  requireProposal(existing, proposalId);
  const category = command.kind === "plain" ? command.category : command.kind === "flight" ? "voli" : "alloggio";
  await trips.insertLine({
    id: randomUUID(),
    proposalId,
    category,
    createdAt: new Date(),
    ...lineContent(command, existing.people),
  });
  const trip = await requireTrip(trips, tripId);
  return { trip, proposal: requireProposal(trip, proposalId) };
}

export async function updateLine(
  trips: TripRepository,
  tripId: string,
  proposalId: string,
  lineId: string,
  command: LineUpdate,
): Promise<{ trip: Trip; proposal: Proposal }> {
  const existing = await requireTrip(trips, tripId);
  const proposal = requireProposal(existing, proposalId);
  requireLine(proposal, lineId);
  await trips.saveLine(lineId, lineContent(command, existing.people));
  const trip = await requireTrip(trips, tripId);
  return { trip, proposal: requireProposal(trip, proposalId) };
}

export async function deleteLine(
  trips: TripRepository,
  tripId: string,
  proposalId: string,
  lineId: string,
): Promise<{ trip: Trip; proposal: Proposal }> {
  const existing = await requireTrip(trips, tripId);
  const proposal = requireProposal(existing, proposalId);
  requireLine(proposal, lineId);
  await trips.deleteLine(lineId);
  const trip = await requireTrip(trips, tripId);
  return { trip, proposal: requireProposal(trip, proposalId) };
}
