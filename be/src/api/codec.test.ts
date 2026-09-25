import assert from "node:assert/strict";
import test from "node:test";
import { NotFound } from "../core/errors.ts";
import { routeId } from "./http.ts";
import {
  decodeLineCreate,
  decodeTripCreate,
  decodeTripPatch,
  decodeTripSummary,
} from "../../../shared/codec.ts";

test("a trip patch keeps only the fields that were sent", () => {
  assert.deepEqual(decodeTripPatch({ people: 4 }), { people: 4 });
  assert.deepEqual(decodeTripPatch({}), {});
});

test("a trip with the end before the start is refused", () => {
  assert.throws(
    () =>
      decodeTripCreate({
        title: "Date rotte",
        startDate: "2026-09-10",
        endDate: "2026-09-01",
        people: 2,
      }),
    /partenza/,
  );
  assert.throws(
    () => decodeTripPatch({ startDate: "2026-09-10", endDate: "2026-09-01" }),
    /partenza/,
  );
});

test("a flight without the route is refused", () => {
  assert.throws(
    () =>
      decodeLineCreate({
        category: "voli",
        basis: "totale",
        price: 10,
        outboundFrom: "Milano",
      }),
    /arrivo dell'andata/,
  );
});

test("a stay that does not last a night is refused", () => {
  assert.throws(
    () =>
      decodeLineCreate({
        category: "alloggio",
        basis: "totale",
        price: 10,
        place: "Quito",
        checkIn: "2026-04-05",
        checkOut: "2026-04-05",
      }),
    /almeno una notte/,
  );
});

test("a plain lodging line does not require nights", () => {
  assert.deepEqual(decodeLineCreate({ category: "alloggio", label: "Hotel Quito", amount: 50 }), {
    kind: "plain",
    category: "alloggio",
    label: "Hotel Quito",
    amount: 50,
  });
});

test("a card without the lowest total is refused", () => {
  assert.throws(
    () =>
      decodeTripSummary({
        id: "trip",
        title: "Ecuador",
        startDate: "",
        endDate: "",
        people: 2,
        proposalCount: 0,
        lowestPerPerson: null,
      }),
    /non ha funzionato/,
  );
});

test("a path id that is not a uuid is not found", () => {
  assert.throws(() => routeId("nope"), NotFound);
  assert.equal(routeId("85e5674a-1111-4111-8111-000000000001"), "85e5674a-1111-4111-8111-000000000001");
});
