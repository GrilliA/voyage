import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import type { CategoryId, ProposalDetail, TripDetail, TripSummary } from "../../shared/domain.ts";
import { createApp } from "./app.ts";
import { defaultDatabaseUrl, ensureDatabase, openDatabase, testDatabaseUrl } from "./data/db.ts";
import { createStore, deleteAllTrips } from "./data/store.ts";

async function withApi(run: (base: string) => Promise<void>) {
  await ensureDatabase(defaultDatabaseUrl, "voyage_test");
  const { database, close } = await openDatabase(
    process.env.TEST_DATABASE_URL ?? testDatabaseUrl,
  );
  await deleteAllTrips(database);
  const app = createApp(createStore(database));
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

type ApiResult<T> = { status: number; data: T | null };

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

async function api<T>(
  base: string,
  urlPath: string,
  options: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const response = await fetch(base + urlPath, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, data: (text ? JSON.parse(text) : null) as T | null };
}

test("compares proposals and divides the cheapest total by people", async () => {
  await withApi(async (base) => {
    const created = await api<TripDetail>(base, "/api/trips", {
      method: "POST",
      body: {
        title: "Ecuador",
        startDate: "2026-08-12",
        endDate: "2026-08-20",
        people: 4,
      },
    });
    assert.equal(created.status, 201);
    assert.ok(created.data);
    const tripId = created.data.id;

    const quito = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals`, {
      method: "POST",
      body: { title: "Via Quito" },
    });
    const costa = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals`, {
      method: "POST",
      body: { title: "Costa" },
    });
    assert.ok(quito.data);
    assert.ok(costa.data);

    for (const line of quitoLines) {
      const saved: ApiResult<ProposalDetail> = await api<ProposalDetail>(
        base,
        `/api/trips/${tripId}/proposals/${quito.data.id}/lines`,
        { method: "POST", body: line },
      );
      assert.equal(saved.status, 201);
    }

    for (const line of costaLines) {
      await api(base, `/api/trips/${tripId}/proposals/${costa.data.id}/lines`, {
        method: "POST",
        body: line,
      });
    }

    const detail = await api<TripDetail>(base, `/api/trips/${tripId}`);
    assert.ok(detail.data);
    const viaQuito = detail.data.proposals[0];
    const costaCard = detail.data.proposals[1];
    assert.ok(viaQuito);
    assert.ok(costaCard);
    assert.equal(detail.data.people, 4);
    assert.equal(detail.data.proposalCount, 2);
    assert.equal(detail.data.lowestTotal, 1990);
    assert.equal(detail.data.lowestPerPerson, 497.5);
    assert.equal(viaQuito.title, "Via Quito");
    assert.equal(viaQuito.cheapest, false);
    assert.equal(viaQuito.totals.perPerson, 530);
    assert.equal(costaCard.title, "Costa");
    assert.equal(costaCard.cheapest, true);

    const list = await api<TripSummary[]>(base, "/api/trips");
    const first = list.data?.[0];
    assert.ok(first);
    assert.equal(first.title, "Ecuador");
    assert.equal(first.lowestTotal, 1990);
    assert.equal("proposals" in first, false);

    const invalid = await api(base, "/api/trips", {
      method: "POST",
      body: { title: "Date rotte", startDate: "2026-09-10", endDate: "2026-09-01", people: 2 },
    });
    assert.equal(invalid.status, 400);
  });
});

test("a flight stores the route and multiplies a per-person price", async () => {
  await withApi(async (base) => {
    const created = await api<TripDetail>(base, "/api/trips", {
      method: "POST",
      body: { title: "Ecuador", startDate: "2026-08-12", endDate: "2026-08-20", people: 2 },
    });
    assert.equal(created.status, 201);
    assert.ok(created.data);
    const tripId = created.data.id;

    const proposal = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals`, {
      method: "POST",
      body: { title: "Via Quito" },
    });
    assert.ok(proposal.data);

    const perPerson = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals/${proposal.data.id}/lines`, {
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
    const perPersonLine = perPerson.data?.lines[0];
    assert.ok(perPersonLine);
    assert.equal(perPersonLine.amount, 300);
    assert.equal(perPersonLine.label, "Milano → Quito · Quito → Milano");
    assert.equal(perPersonLine.flight?.basis, "persona");
    assert.equal(perPersonLine.flight?.price, 150);
    assert.equal(perPerson.data?.totals.total, 300);
    assert.equal(perPerson.data?.totals.perPerson, 150);

    const totalPrice = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals/${proposal.data.id}/lines`, {
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
    const totalLine = totalPrice.data?.lines[1];
    assert.ok(totalLine);
    assert.equal(totalLine.amount, 80);
    assert.equal(totalLine.flight?.basis, "totale");

    const missing = await api(base, `/api/trips/${tripId}/proposals/${proposal.data.id}/lines`, {
      method: "POST",
      body: { category: "voli", basis: "totale", price: 10, outboundFrom: "Milano" },
    });
    assert.equal(missing.status, 400);

    const resized = await api<TripDetail>(base, `/api/trips/${tripId}`, {
      method: "PATCH",
      body: { people: 4 },
    });
    assert.equal(resized.status, 200);

    const again = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals/${proposal.data.id}`);
    const scaled = again.data?.lines.find((line) => line.flight?.basis === "persona");
    const unchanged = again.data?.lines.find((line) => line.flight?.basis === "totale");
    assert.equal(scaled?.amount, 600);
    assert.equal(scaled?.flight?.price, 150);
    assert.equal(unchanged?.amount, 80);
    assert.equal(again.data?.totals.total, 680);
  });
});

test("a stay stores the dates and multiplies a per-person price", async () => {
  await withApi(async (base) => {
    const created = await api<TripDetail>(base, "/api/trips", {
      method: "POST",
      body: { title: "Ecuador", startDate: "2026-03-24", endDate: "2026-04-07", people: 2 },
    });
    assert.equal(created.status, 201);
    assert.ok(created.data);
    const tripId = created.data.id;

    const proposal = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals`, {
      method: "POST",
      body: { title: "Via Quito" },
    });
    assert.ok(proposal.data);

    const quito = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals/${proposal.data.id}/lines`, {
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
    const quitoStay = quito.data?.lines[0];
    assert.ok(quitoStay);
    assert.equal(quitoStay.amount, 1200);
    assert.equal(quitoStay.label, "Quito");
    assert.equal(quitoStay.stay?.basis, "totale");
    assert.equal(quitoStay.stay?.price, 1200);
    assert.equal(quitoStay.stay?.checkIn, "2026-03-24");
    assert.equal(quitoStay.stay?.checkOut, "2026-04-05");
    assert.equal(quitoStay.flight, null);

    const banos = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals/${proposal.data.id}/lines`, {
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
    const banosStay = banos.data?.lines[1];
    assert.ok(banosStay);
    assert.equal(banosStay.amount, 80);
    assert.equal(banosStay.stay?.basis, "persona");
    assert.equal(banosStay.stay?.price, 40);
    assert.equal(banos.data?.totals.byCategory.alloggio, 1280);

    const plain = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals/${proposal.data.id}/lines`, {
      method: "POST",
      body: { category: "alloggio", label: "Hotel Quito", amount: 50 },
    });
    assert.equal(plain.status, 201);
    assert.equal(plain.data?.lines[2]?.stay, null);

    const tooShort = await api(base, `/api/trips/${tripId}/proposals/${proposal.data.id}/lines`, {
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

    const resized = await api<TripDetail>(base, `/api/trips/${tripId}`, {
      method: "PATCH",
      body: { people: 4 },
    });
    assert.equal(resized.status, 200);

    const again = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals/${proposal.data.id}`);
    const scaled = again.data?.lines.find((line) => line.stay?.basis === "persona");
    const unchanged = again.data?.lines.find((line) => line.stay?.place === "Quito");
    assert.equal(scaled?.amount, 160);
    assert.equal(scaled?.stay?.price, 40);
    assert.equal(unchanged?.amount, 1200);
  });
});

test("a stay keeps an optional link and rejects invalid urls", async () => {
  await withApi(async (base) => {
    const created = await api<TripDetail>(base, "/api/trips", {
      method: "POST",
      body: { title: "Ecuador", startDate: "2026-03-24", endDate: "2026-04-07", people: 2 },
    });
    assert.equal(created.status, 201);
    assert.ok(created.data);
    const tripId = created.data.id;

    const proposal = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals`, {
      method: "POST",
      body: { title: "Via Quito" },
    });
    assert.ok(proposal.data);
    const proposalId = proposal.data.id;

    const linked = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals/${proposalId}/lines`, {
      method: "POST",
      body: {
        category: "alloggio",
        basis: "totale",
        price: 1200,
        place: "Quito",
        checkIn: "2026-03-24",
        checkOut: "2026-04-05",
        link: "https://www.booking.com/hotel/ec/x.html",
      },
    });
    assert.equal(linked.status, 201);
    const linkedLine = linked.data?.lines[0];
    assert.ok(linkedLine);
    assert.equal(linkedLine.stay?.link, "https://www.booking.com/hotel/ec/x.html");

    const plain = await api<ProposalDetail>(base, `/api/trips/${tripId}/proposals/${proposalId}/lines`, {
      method: "POST",
      body: {
        category: "alloggio",
        basis: "totale",
        price: 80,
        place: "Baños",
        checkIn: "2026-04-05",
        checkOut: "2026-04-07",
      },
    });
    assert.equal(plain.status, 201);
    assert.equal(plain.data?.lines[1]?.stay?.link, "");

    const cleared = await api<ProposalDetail>(
      base,
      `/api/trips/${tripId}/proposals/${proposalId}/lines/${linkedLine.id}`,
      {
        method: "PATCH",
        body: {
          basis: "totale",
          price: 1200,
          place: "Quito",
          checkIn: "2026-03-24",
          checkOut: "2026-04-05",
          link: "",
        },
      },
    );
    assert.equal(cleared.status, 200);
    assert.equal(cleared.data?.lines[0]?.stay?.link, "");

    for (const link of ["javascript:alert(1)", "not a url"]) {
      const rejected = await api<{ error: string }>(
        base,
        `/api/trips/${tripId}/proposals/${proposalId}/lines`,
        {
          method: "POST",
          body: {
            category: "alloggio",
            basis: "totale",
            price: 10,
            place: "Quito",
            checkIn: "2026-03-24",
            checkOut: "2026-03-25",
            link,
          },
        },
      );
      assert.equal(rejected.status, 400);
      assert.equal(rejected.data?.error, "Il link non è valido.");
    }
  });
});
