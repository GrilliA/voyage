import assert from "node:assert/strict";
import test from "node:test";
import type { FlightDetails, StayDetails } from "../../../shared/domain.ts";
import { lineFromRow, lineToColumns, type CostLineRow } from "./rows.ts";

const createdAt = new Date("2026-01-01T00:00:00.000Z");

function row(columns: ReturnType<typeof lineToColumns> & { category: string }): CostLineRow {
  return {
    id: "line",
    proposalId: "proposal",
    createdAt,
    ...columns,
  };
}

test("a flight row keeps euros and the whole route", () => {
  const flight: FlightDetails = {
    basis: "persona",
    price: 150,
    outboundFrom: "Milano",
    outboundTo: "Quito",
    returnFrom: "Quito",
    returnTo: "Milano",
  };
  const columns = lineToColumns({
    label: "Milano → Quito · Quito → Milano",
    amount: 300,
    flight,
    stay: null,
  });
  const line = lineFromRow(row({ category: "voli", ...columns }));
  assert.equal(line.amount, 300);
  assert.equal(line.flight?.price, 150);
  assert.equal(line.stay, null);
  assert.deepEqual(line.flight, flight);
});

test("a stay row keeps the nights and drops the flight", () => {
  const stay: StayDetails = {
    basis: "totale",
    price: 1200,
    place: "Quito",
    checkIn: "2026-03-24",
    checkOut: "2026-04-05",
    link: "https://www.booking.com/hotel/ec/x.html",
  };
  const columns = lineToColumns({ label: "Quito", amount: 1200, flight: null, stay });
  const line = lineFromRow(row({ category: "alloggio", ...columns }));
  assert.deepEqual(line.stay, stay);
  assert.equal(line.flight, null);
});

test("a partial flight group is not a flight", () => {
  const line = lineFromRow(
    row({
      category: "voli",
      label: "Milano",
      amountCents: 1000,
      priceBasis: "totale",
      priceCents: 1000,
      outboundFrom: "Milano",
      outboundTo: null,
      returnFrom: null,
      returnTo: null,
      checkIn: null,
      checkOut: null,
      link: null,
    }),
  );
  assert.equal(line.flight, null);
  assert.equal(line.amount, 10);
});

test("an unknown category in the database is a server error", () => {
  assert.throws(
    () =>
      lineFromRow(
        row({
          category: "sconosciuta",
          label: "Extra",
          amountCents: 100,
          priceBasis: null,
          priceCents: null,
          outboundFrom: null,
          outboundTo: null,
          returnFrom: null,
          returnTo: null,
          checkIn: null,
          checkOut: null,
          link: null,
        }),
      ),
    /Unknown category/,
  );
});
