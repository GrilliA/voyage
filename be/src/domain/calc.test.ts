import assert from "node:assert/strict";
import test from "node:test";
import { flightTotal } from "../../../shared/domain.ts";
import { proposalTotals } from "./calc.ts";

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

test("keeps a total flight price and multiplies a per-person price", () => {
  assert.equal(flightTotal(150, "totale", 2), 150);
  assert.equal(flightTotal(150, "persona", 2), 300);
  assert.equal(flightTotal(10.5, "persona", 4), 42);
});

test("returns no per-person amount when people is missing", () => {
  const totals = proposalTotals([{ category: "voli", amount: 10 }], 0);
  assert.equal(totals.total, 10);
  assert.equal(totals.perPerson, null);
});
