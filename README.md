# Voyage

A dashboard for comparing trip proposals. Each trip is a card. Inside it, proposals are more cards: guided costs, a total, and a cost per person.

The backend and the UI are TypeScript. The shared contract lives in `shared/domain.ts`.

## Run

Start Postgres:

```bash
docker compose up -d
```

Terminal 1, API:

```bash
cd be
npm install
npm run dev
```

Terminal 2, UI:

```bash
cd fe
npm install
npm run dev
```

Open http://127.0.0.1:5173

Postgres runs in Docker on port `5433` (user `voyage`, password `voyage`, database `voyage`). API tests use `voyage_test` on that same server: `cd be && npm test`.
