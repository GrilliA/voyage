import {
  toCents,
  totalForBasis,
  type FlightDetails,
  type LineCreate,
  type LineUpdate,
  type StayDetails,
} from "../../../shared/domain.ts";
import { BadInput } from "./errors.ts";
import type { Trip } from "./trip.ts";

export type LineContent = {
  label: string;
  amount: number;
  flight: FlightDetails | null;
  stay: StayDetails | null;
};

export type LineAmount = {
  id: string;
  amount: number;
};

function checkedAmount(amount: number): number {
  const cents = toCents(amount);
  if (cents == null || cents < 0 || cents > 100_000_000) {
    throw new BadInput("L'importo non è valido.");
  }
  return cents / 100;
}

export function pricedFlight(flight: FlightDetails, peopleCount: number): { label: string; amount: number } {
  return {
    label: `${flight.outboundFrom} → ${flight.outboundTo} · ${flight.returnFrom} → ${flight.returnTo}`,
    amount: checkedAmount(totalForBasis(flight.price, flight.basis, peopleCount)),
  };
}

export function pricedStay(stay: StayDetails, peopleCount: number): { label: string; amount: number } {
  return {
    label: stay.place,
    amount: checkedAmount(totalForBasis(stay.price, stay.basis, peopleCount)),
  };
}

export function lineContent(command: LineCreate | LineUpdate, peopleCount: number): LineContent {
  if (command.kind === "flight") {
    const priced = pricedFlight(command.flight, peopleCount);
    return { label: priced.label, amount: priced.amount, flight: command.flight, stay: null };
  }
  if (command.kind === "stay") {
    const priced = pricedStay(command.stay, peopleCount);
    return { label: priced.label, amount: priced.amount, flight: null, stay: command.stay };
  }
  return {
    label: command.label,
    amount: checkedAmount(command.amount),
    flight: null,
    stay: null,
  };
}

export function personPriceUpdates(trip: Trip, nextPeople: number): LineAmount[] {
  if (nextPeople === trip.people) return [];
  return trip.proposals.flatMap((proposal) =>
    proposal.lines.flatMap((line) => {
      const price =
        line.flight?.basis === "persona"
          ? line.flight.price
          : line.stay?.basis === "persona"
            ? line.stay.price
            : null;
      if (price == null) return [];
      return [{ id: line.id, amount: checkedAmount(totalForBasis(price, "persona", nextPeople)) }];
    }),
  );
}
