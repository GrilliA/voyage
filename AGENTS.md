# Voyage

A personal dashboard for comparing ways to take the same trip. It replaces the Excel sheets used to check costs.

The app shows cards, not tables. On the home screen each card is a trip: title, dates, number of people, and the price of the cheapest proposal. Inside a trip, proposals are smaller cards with the total, the cost per person, and a "Lowest" mark when at least two proposals have a price. Opening a proposal starts a guided form, always in this order: people, flights, hotel / BnB, food, transport, activities, other. A flight is a round trip: outbound and return, each with a from and a to, plus a price that is either the total or per person. A per-person price is multiplied by the people on the trip.

People belong to the trip. That number divides the total of every proposal on that trip.

## Words

Use these names in code and when describing the product.

| In the app | In code | Meaning |
| --- | --- | --- |
| Trip | `Trip` | The large card: destination, dates, people |
| Proposal | `Proposal` | One way to take that trip |
| Line | `CostLine` | One expense inside a section (description + amount) |
| People | `people` | How many people split the cost |
| Lowest | `cheapest` | The proposal with the smallest total, when at least two have lines |

Visible copy is Italian. Files, types, and functions stay English.

## Where the code lives

- `shared/domain.ts` is the contract: categories, totals, and response shapes. Express and Vue import these types.
- `be/src/domain/` calculates and validates. `calc.ts` builds totals. `present.ts` builds the cards. `validate.ts` checks input from outside.
- `be/src/data/schema.ts` is the Postgres schema. `store.ts` reads and writes trips, proposals, and cost lines through Drizzle.
- `fe/src/views/` holds the three screens: `TripsView.vue`, `TripView.vue`, `ProposalView.vue`.

## Commands

```bash
docker compose up -d     # Postgres at 127.0.0.1:5433
cd be && npm run dev     # API at http://127.0.0.1:3001
cd be && npm test
cd be && npm run typecheck
cd fe && npm run dev     # UI at http://127.0.0.1:5173
cd fe && npm run typecheck
```

## How to explain the work

Start from what a person sees: which card, which proposal, which total, which cost per person. Name the section (flights, stay, food) when the change is there. Mention the file only when it helps someone find the change.

Do not add new documents unless asked. This file describes the product. Code style lives in `.cursor/rules/code-style.mdc`.
