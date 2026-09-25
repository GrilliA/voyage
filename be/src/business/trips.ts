import { randomUUID } from "node:crypto";
import type { TripInput, TripPatch } from "../../../shared/domain.ts";
import { personPriceUpdates } from "../core/lines.ts";
import { assertDateOrder, type Trip } from "../core/trip.ts";
import { requireTrip } from "./load.ts";
import type { TripRepository } from "./repository.ts";

export function listTrips(trips: TripRepository): Promise<Trip[]> {
  return trips.listTrips();
}

export function getTrip(trips: TripRepository, tripId: string): Promise<Trip> {
  return requireTrip(trips, tripId);
}

export async function createTrip(trips: TripRepository, input: TripInput): Promise<Trip> {
  assertDateOrder(input.startDate, input.endDate);
  const tripId = randomUUID();
  await trips.insertTrip({
    id: tripId,
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    people: input.people,
    createdAt: new Date(),
  });
  return requireTrip(trips, tripId);
}

export async function updateTrip(trips: TripRepository, tripId: string, patch: TripPatch): Promise<Trip> {
  const existing = await requireTrip(trips, tripId);
  const next = {
    id: existing.id,
    title: patch.title ?? existing.title,
    startDate: patch.startDate ?? existing.startDate,
    endDate: patch.endDate ?? existing.endDate,
    people: patch.people ?? existing.people,
  };
  assertDateOrder(next.startDate, next.endDate);
  const amounts = personPriceUpdates(existing, next.people);
  await trips.saveTrip(next);
  await trips.saveLineAmounts(amounts);
  return requireTrip(trips, tripId);
}

export async function deleteTrip(trips: TripRepository, tripId: string): Promise<void> {
  await requireTrip(trips, tripId);
  await trips.deleteTrip(tripId);
}
