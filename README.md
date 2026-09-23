# Voyage

A dashboard for comparing trip proposals. Each trip is a card. Inside it, proposals are more cards: guided costs, a total, and a cost per person.

The backend and the UI are TypeScript. The shared contract lives in `shared/domain.ts`.

## Run

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

Data stays in `be/data/store.json` on this computer. API tests: `cd be && npm test`.
