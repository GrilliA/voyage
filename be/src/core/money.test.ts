import assert from "node:assert/strict";
import test from "node:test";
import {
  averagePerNight,
  countNights,
  findStayIssues,
  totalForBasis,
} from "../../../shared/domain.ts";
import { proposalTotals } from "./money.ts";

test("sums categories and divides the total by people", () => {
  const totals = proposalTotals(
    [
      { category: "voli", amount: 800 },
      { category: "alloggio", amount: 600 },
      { category: "cibo", amount: 400 },
      { category: "trasporti", amount: 120 },
      { category: "attivita", amount: 200 },
      { category: "sconosciuta", amount: 999 },
    ],
    4,
  );

  assert.equal(totals.total, 2120);
  assert.equal(totals.perPerson, 530);
  assert.equal(totals.byCategory.voli, 800);
  assert.equal(totals.byCategory.altro, 0);
});

test("rounds cents before dividing", () => {
  const totals = proposalTotals(
    [
      { category: "cibo", amount: 0.1 },
      { category: "cibo", amount: 0.2 },
    ],
    3,
  );

  assert.equal(totals.byCategory.cibo, 0.3);
  assert.equal(totals.total, 0.3);
  assert.equal(totals.perPerson, 0.1);
});

test("keeps a total price and multiplies a per-person price", () => {
  assert.equal(totalForBasis(150, "totale", 2), 150);
  assert.equal(totalForBasis(150, "persona", 2), 300);
  assert.equal(totalForBasis(10.5, "persona", 4), 42);
});

test("counts nights from check-in up to check-out", () => {
  assert.equal(countNights("2026-03-24", "2026-04-05"), 12);
  assert.equal(countNights("2026-04-05", "2026-04-07"), 2);
  assert.equal(countNights("2026-04-05", "2026-04-05"), null);
  assert.equal(countNights("2026-04-07", "2026-04-05"), null);
  assert.equal(countNights("2026-02-31", "2026-03-02"), null);
});

test("averages the nightly rate of several stays", () => {
  const pace = averagePerNight([
    { amount: 1200, checkIn: "2026-03-24", checkOut: "2026-04-05" },
    { amount: 80, checkIn: "2026-04-05", checkOut: "2026-04-07" },
  ]);
  assert.deepEqual(pace, { nights: 14, perNight: 91.43 });
});

test("counts a shared night once in the nightly average", () => {
  const pace = averagePerNight([
    { amount: 600, checkIn: "2026-09-24", checkOut: "2026-09-28" },
    { amount: 240, checkIn: "2026-09-27", checkOut: "2026-09-30" },
  ]);
  assert.deepEqual(pace, { nights: 6, perNight: 140 });
});

test("flags overlapping stays, gaps, and nights outside the trip", () => {
  const quito = { place: "Quito", checkIn: "2026-03-24", checkOut: "2026-04-05" };
  const next = { place: "Baños", checkIn: "2026-04-05", checkOut: "2026-04-07" };
  assert.deepEqual(findStayIssues([quito, next], "2026-03-24", "2026-04-07"), []);
  assert.deepEqual(findStayIssues([], "2026-03-24", "2026-04-07"), []);

  const overlap = findStayIssues(
    [quito, { place: "Baños", checkIn: "2026-04-04", checkOut: "2026-04-07" }],
    "2026-03-24",
    "2026-04-07",
  );
  assert.deepEqual(overlap, [{ kind: "overlap", first: "Quito", second: "Baños" }]);

  const gap = findStayIssues(
    [quito, { place: "Baños", checkIn: "2026-04-07", checkOut: "2026-04-10" }],
    "2026-03-24",
    "2026-04-10",
  );
  assert.deepEqual(gap, [{ kind: "gap", checkIn: "2026-04-05", checkOut: "2026-04-07" }]);

  const outside = findStayIssues(
    [{ place: "Quito", checkIn: "2026-03-23", checkOut: "2026-03-25" }],
    "2026-03-24",
    "2026-03-28",
  );
  assert.deepEqual(outside, [
    { kind: "outside", place: "Quito" },
    { kind: "gap", checkIn: "2026-03-25", checkOut: "2026-03-28" },
  ]);

  const undatedTrip = findStayIssues(
    [quito, { place: "Baños", checkIn: "2026-04-04", checkOut: "2026-04-07" }],
    "",
    "",
  );
  assert.deepEqual(undatedTrip, [{ kind: "overlap", first: "Quito", second: "Baños" }]);
});

test("returns no per-person amount when people is missing", () => {
  const totals = proposalTotals([{ category: "voli", amount: 10 }], 0);
  assert.equal(totals.total, 10);
  assert.equal(totals.perPerson, null);
});
