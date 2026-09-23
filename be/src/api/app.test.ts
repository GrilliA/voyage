import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import type { CategoryId } from "../../../shared/domain.ts";
import {
  decodeProposalDetail,
  decodeTripDetail,
  decodeTripSummaries,
} from "../../../shared/codec.ts";
import { createApp } from "./app.ts";
import { defaultDatabaseUrl, ensureDatabase, openDatabase, testDatabaseUrl } from "../infrastructure/db.ts";
import { createTripRepository, deleteAllTrips } from "../infrastructure/trip-repository.ts";

async function withApi(run: (base: string) => Promise<void>) {
  await ensureDatabase(defaultDatabaseUrl, "voyage_test");
  const { database, close } = await openDatabase(process.env.TEST_DATABASE_URL ?? testDatabaseUrl);
  await deleteAllTrips(database);
  const app = createApp(createTripRepository(database));
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address == null || typeof address === "string") throw new Error("No port assigned.");

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await close();
  }
}

type ApiResult = { status: number; data: unknown };

const quitoLines: { category: CategoryId; label: string; amount: number }[] = [
  { category: "voli", label: "Andata e ritorno", amount: 800 },
  { category: "alloggio", label: "Hotel Quito", amount: 600 },
  { category: "cibo", label: "Pasti", amount: 400 },
  { category: "trasporti", label: "Transfer", amount: 120 },
  { category: "attivita", label: "Tour", amount: 200 },
];

const costaLines: { category: CategoryId; label: string; amount: number }[] = [
  { category: "voli", label: "Volo costa", amount: 420 },
  { category: "alloggio", label: "BnB", amount: 900 },
  { category: "cibo", label: "Pasti", amount: 400 },
  { category: "trasporti", label: "Bus", amount: 80 },
  { category: "attivita", label: "Barca", amount: 150 },
  { category: "altro", label: "SIM", amount: 40 },
];

function parseJson(text: string): unknown {
  return JSON.parse(text);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function api(
  base: string,
  urlPath: string,
  options: { method?: string; body?: unknown } = {},
): Promise<ApiResult> {
  const response = await fetch(base + urlPath, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, data: text ? parseJson(text) : null };
}

test("compares proposals and divides the cheapest total by people", async () => {
  await withApi(async (base) => {
    const created = await api(base, "/api/trips", {
      method: "POST",
      body: {
        title: "Ecuador",
        startDate: "2026-08-12",
        endDate: "2026-08-20",
        people: 4,
      },
    });
    assert.equal(created.status, 201);
    const createdTrip = decodeTripDetail(created.data);
    const tripId = createdTrip.id;

    const quito = decodeProposalDetail(
      (
        await api(base, `/api/trips/${tripId}/proposals`, {
          method: "POST",
          body: { title: "Via Quito" },
        })
      ).data,
    );
    const costa = decodeProposalDetail(
      (
        await api(base, `/api/trips/${tripId}/proposals`, {
          method: "POST",
          body: { title: "Costa" },
        })
      ).data,
    );

    for (const line of quitoLines) {
      const saved = await api(base, `/api/trips/${tripId}/proposals/${quito.id}/lines`, {
        method: "POST",
        body: line,
      });
      assert.equal(saved.status, 201);
      decodeProposalDetail(saved.data);
    }

    for (const line of costaLines) {
      await api(base, `/api/trips/${tripId}/proposals/${costa.id}/lines`, {
        method: "POST",
        body: line,
      });
    }

    const detail = await api(base, `/api/trips/${tripId}`);
    const trip = decodeTripDetail(detail.data);
    const viaQuito = trip.proposals[0];
    const costaCard = trip.proposals[1];
    assert.ok(viaQuito);
    assert.ok(costaCard);
    assert.equal(trip.people, 4);
    assert.equal(trip.proposalCount, 2);
    assert.equal(trip.lowestTotal, 1990);
    assert.equal(trip.lowestPerPerson, 497.5);
    assert.equal(viaQuito.title, "Via Quito");
    assert.equal(viaQuito.cheapest, false);
    assert.equal(viaQuito.totals.perPerson, 530);
    assert.equal(costaCard.title, "Costa");
    assert.equal(costaCard.cheapest, true);

    const list = await api(base, "/api/trips");
    assert.ok(Array.isArray(list.data));
    const firstCard = list.data[0];
    assert.ok(isRecord(firstCard));
    assert.equal("proposals" in firstCard, false);
    const summaries = decodeTripSummaries(list.data);
    const first = summaries[0];
    assert.ok(first);
    assert.equal(first.title, "Ecuador");
    assert.equal(first.lowestTotal, 1990);

    const invalid = await api(base, "/api/trips", {
      method: "POST",
      body: { title: "Date rotte", startDate: "2026-09-10", endDate: "2026-09-01", people: 2 },
    });
    assert.equal(invalid.status, 400);
  });
});

test("a flight stores the route and multiplies a per-person price", async () => {
  await withApi(async (base) => {
    const created = await api(base, "/api/trips", {
      method: "POST",
      body: { title: "Ecuador", startDate: "2026-08-12", endDate: "2026-08-20", people: 2 },
    });
    assert.equal(created.status, 201);
    const tripId = decodeTripDetail(created.data).id;

    const proposal = decodeProposalDetail(
      (
        await api(base, `/api/trips/${tripId}/proposals`, {
          method: "POST",
          body: { title: "Via Quito" },
        })
      ).data,
    );

    const perPerson = await api(base, `/api/trips/${tripId}/proposals/${proposal.id}/lines`, {
      method: "POST",
      body: {
        category: "voli",
        basis: "persona",
        price: 150,
        outboundFrom: "Milano",
        outboundTo: "Quito",
        returnFrom: "Quito",
        returnTo: "Milano",
      },
    });
    assert.equal(perPerson.status, 201);
    const perPersonProposal = decodeProposalDetail(perPerson.data);
    const perPersonLine = perPersonProposal.lines[0];
    assert.ok(perPersonLine);
    assert.equal(perPersonLine.amount, 300);
    assert.equal(perPersonLine.label, "Milano → Quito · Quito → Milano");
    assert.equal(perPersonLine.flight?.basis, "persona");
    assert.equal(perPersonLine.flight?.price, 150);
    assert.equal(perPersonProposal.totals.total, 300);
    assert.equal(perPersonProposal.totals.perPerson, 150);

    const totalPrice = await api(base, `/api/trips/${tripId}/proposals/${proposal.id}/lines`, {
      method: "POST",
      body: {
        category: "voli",
        basis: "totale",
        price: 80,
        outboundFrom: "Quito",
        outboundTo: "Guayaquil",
        returnFrom: "Guayaquil",
        returnTo: "Quito",
      },
    });
    assert.equal(totalPrice.status, 201);
    const totalLine = decodeProposalDetail(totalPrice.data).lines[1];
    assert.ok(totalLine);
    assert.equal(totalLine.amount, 80);
    assert.equal(totalLine.flight?.basis, "totale");

    const missing = await api(base, `/api/trips/${tripId}/proposals/${proposal.id}/lines`, {
      method: "POST",
      body: { category: "voli", basis: "totale", price: 10, outboundFrom: "Milano" },
    });
    assert.equal(missing.status, 400);

    const resized = await api(base, `/api/trips/${tripId}`, {
      method: "PATCH",
      body: { people: 4 },
    });
    assert.equal(resized.status, 200);

    const again = decodeProposalDetail(
      (await api(base, `/api/trips/${tripId}/proposals/${proposal.id}`)).data,
    );
    const scaled = again.lines.find((line) => line.flight?.basis === "persona");
    const unchanged = again.lines.find((line) => line.flight?.basis === "totale");
    assert.equal(scaled?.amount, 600);
    assert.equal(scaled?.flight?.price, 150);
    assert.equal(unchanged?.amount, 80);
    assert.equal(again.totals.total, 680);
  });
});

test("a stay stores the dates and multiplies a per-person price", async () => {
  await withApi(async (base) => {
    const created = await api(base, "/api/trips", {
      method: "POST",
      body: { title: "Ecuador", startDate: "2026-03-24", endDate: "2026-04-07", people: 2 },
    });
    assert.equal(created.status, 201);
    const tripId = decodeTripDetail(created.data).id;

    const proposal = decodeProposalDetail(
      (
        await api(base, `/api/trips/${tripId}/proposals`, {
          method: "POST",
          body: { title: "Via Quito" },
        })
      ).data,
    );

    const quito = await api(base, `/api/trips/${tripId}/proposals/${proposal.id}/lines`, {
      method: "POST",
      body: {
        category: "alloggio",
        basis: "totale",
        price: 1200,
        place: "Quito",
        checkIn: "2026-03-24",
        checkOut: "2026-04-05",
      },
    });
    assert.equal(quito.status, 201);
    const quitoStay = decodeProposalDetail(quito.data).lines[0];
    assert.ok(quitoStay);
    assert.equal(quitoStay.amount, 1200);
    assert.equal(quitoStay.label, "Quito");
    assert.equal(quitoStay.stay?.basis, "totale");
    assert.equal(quitoStay.stay?.price, 1200);
    assert.equal(quitoStay.stay?.checkIn, "2026-03-24");
    assert.equal(quitoStay.stay?.checkOut, "2026-04-05");
    assert.equal(quitoStay.flight, null);

    const banos = await api(base, `/api/trips/${tripId}/proposals/${proposal.id}/lines`, {
      method: "POST",
      body: {
        category: "alloggio",
        basis: "persona",
        price: 40,
        place: "Baños",
        checkIn: "2026-04-05",
        checkOut: "2026-04-07",
      },
    });
    assert.equal(banos.status, 201);
    const banosProposal = decodeProposalDetail(banos.data);
    const banosStay = banosProposal.lines[1];
    assert.ok(banosStay);
    assert.equal(banosStay.amount, 80);
    assert.equal(banosStay.stay?.basis, "persona");
    assert.equal(banosStay.stay?.price, 40);
    assert.equal(banosProposal.totals.byCategory.alloggio, 1280);

    const plain = await api(base, `/api/trips/${tripId}/proposals/${proposal.id}/lines`, {
      method: "POST",
      body: { category: "alloggio", label: "Hotel Quito", amount: 50 },
    });
    assert.equal(plain.status, 201);
    assert.equal(decodeProposalDetail(plain.data).lines[2]?.stay, null);

    const tooShort = await api(base, `/api/trips/${tripId}/proposals/${proposal.id}/lines`, {
      method: "POST",
      body: {
        category: "alloggio",
        basis: "totale",
        price: 10,
        place: "Quito",
        checkIn: "2026-04-05",
        checkOut: "2026-04-05",
      },
    });
    assert.equal(tooShort.status, 400);

    const resized = await api(base, `/api/trips/${tripId}`, {
      method: "PATCH",
      body: { people: 4 },
    });
    assert.equal(resized.status, 200);

    const again = decodeProposalDetail(
      (await api(base, `/api/trips/${tripId}/proposals/${proposal.id}`)).data,
    );
    const scaled = again.lines.find((line) => line.stay?.basis === "persona");
    const unchanged = again.lines.find((line) => line.stay?.place === "Quito");
    assert.equal(scaled?.amount, 160);
    assert.equal(scaled?.stay?.price, 40);
    assert.equal(unchanged?.amount, 1200);
  });
});
