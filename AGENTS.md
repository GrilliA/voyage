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
- `shared/codec.ts` reads and writes the camelCase JSON. Zod checks the body on the way in and the cards on the way out. Vue uses the same schemas in `fe/src/api/client.ts`.
- `be/src/core/` holds the trip, the totals, and the cards. `be/src/business/` is one action per endpoint. `be/src/infrastructure/` is Postgres: the Drizzle schema and the row codec (cents, dates, flight, stay). `be/src/api/` is Express. `be/src/index.ts` opens the database and wires them together.
- `fe/src/views/` holds the three screens: `TripsView.vue`, `TripView.vue`, `ProposalView.vue`.
- `fe/src/styles/tokens.css` is the only place for a color, a font, a space, a radius, a shadow, a type size, or a layout size. `base.css` and `layout.css` hold what several screens share.
- `fe/src/components/form/`, `buttons/`, and `cards/` hold the base components (inputs, buttons, cards). Each has a `<style scoped>` that uses only tokens. Domain components (`StayForm`, `TripCard`, …) sit in `fe/src/components/` and are built from them.

## Frontend

Vue 3 with `<script setup lang="ts">`. Product types come from `shared/domain.ts`. The screen reads JSON through `shared/codec.ts`.

### Tokens and rem

Use the variables in `tokens.css`. Do not add a hex color or a one-off length in a component.

Space, type, radius, and layout sizes are `rem`, so they follow the reader's font size. Do not set a `px` font-size on `html`. Letter-spacing stays `em`. A hairline border is `1px` (`--border-width`).

Breakpoints are written in the `@media` query. A custom property does not work there.

- `40rem` — paired fields, the amount column, cards sharing a row, the dialog centered.
- `56rem` — wider page gutter, the top bar in a row, the proposal editor in three columns with the total stuck beside the form.

### Mobile first

The base rule is the phone. A wider layout uses `min-width`. Do not add a `max-width` breakpoint to restyle the phone.

Under `40rem`, stack paired fields (from / to, dates), the line amount under the description, the dialog actions, and the footer of a flight or a stay. From `40rem` those pairs sit side by side. From `56rem` the editor is three columns.

### Vue

- Type `defineProps` and `defineEmits`. A prop that every screen passes is required. `withDefaults` only when a screen may omit the prop.
- A missing trip, proposal, flight, stay, or error is `null`.
- `undefined` only where a platform type has a hole: a missing array element, or the previous value of a watch. Do not add `| undefined` to a domain value, and do not default a prop to `undefined`.
- No `any`. No `as` to silence a check. `as const` on a real tuple is fine.
- Do not `v-model` into a line that came from the API. `LineFields` keeps the description and the amount, then saves them.
- A wrapper input sets `inheritAttrs: false` and puts `$attrs` on the native control, so `min`, `placeholder`, and `aria-label` land on the field.
- A `type="number"` model is `number | string`. Vue turns a parsed field into a number and leaves a blank field as `""`. Read it with `readNumber` in `fe/src/readNumber.ts`.

## Scripts

```bash
docker compose up -d        # Postgres at 127.0.0.1:5433

cd be && npm run dev        # API at http://127.0.0.1:3001
cd be && npm start          # API without watch
cd be && npm test
cd be && npm run typecheck
cd be && npm run db:generate
cd be && npm run db:migrate

cd fe && npm run dev        # UI at http://127.0.0.1:5173
cd fe && npm run typecheck
cd fe && npm run build
cd fe && npm run preview
```

## How to explain the work

Start from what a person sees: which card, which proposal, which total, which cost per person. Name the section (flights, stay, food) when the change is there. Mention the file only when it helps someone find the change.

Do not add new documents unless asked. This file describes the product. Code style lives in `.cursor/rules/code-style.mdc`.
