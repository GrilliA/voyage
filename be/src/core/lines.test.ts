import assert from "node:assert/strict";
import test from "node:test";
import type { FlightDetails } from "../../../shared/domain.ts";
import { personPriceUpdates, pricedFlight, pricedStay } from "./lines.ts";
import type { Trip } from "./trip.ts";

const flight: FlightDetails = {
  basis: "persona",
  price: 150,
  outboundFrom: "Milano",
  outboundTo: "Quito",
  returnFrom: "Quito",
  returnTo: "Milano",
};

test("a per-person flight total follows the people on the trip", () => {
  const priced = pricedFlight(flight, 2);
  assert.equal(priced.amount, 300);
  assert.equal(priced.label, "Milano → Quito · Quito → Milano");
});

test("a per-person stay total follows the people on the trip", () => {
  const priced = pricedStay(
    {
      basis: "persona",
      price: 40,
      place: "Baños",
      checkIn: "2026-04-05",
      checkOut: "2026-04-07",
      link: "",
    },
    2,
  );
  assert.equal(priced.amount, 80);
  assert.equal(priced.label, "Baños");
});

test("changing people rescales only per-person lines", () => {
  const trip: Trip = {
    id: "trip",
    title: "Ecuador",
    startDate: "2026-08-12",
    endDate: "2026-08-20",
    people: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    proposals: [
      {
        id: "proposal",
        title: "Via Quito",
        createdAt: "2026-01-01T00:00:00.000Z",
        lines: [
          {
            id: "per-person",
            category: "voli",
            label: "Milano → Quito · Quito → Milano",
            amount: 300,
            flight,
            stay: null,
          },
          {
            id: "total",
            category: "voli",
            label: "Quito → Guayaquil · Guayaquil → Quito",
            amount: 80,
            flight: { ...flight, basis: "totale", price: 80 },
            stay: null,
          },
        ],
      },
    ],
  };

  assert.deepEqual(personPriceUpdates(trip, 2), []);
  assert.deepEqual(personPriceUpdates(trip, 4), [{ id: "per-person", amount: 600 }]);
});
