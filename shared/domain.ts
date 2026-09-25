export const CATEGORIES = [
  {
    id: "voli",
    label: "Voli",
    hint: "Andata e ritorno. Il prezzo può essere il totale o a persona.",
  },
  {
    id: "alloggio",
    label: "Hotel / BnB",
    hint: "Dove dormi, dal giorno di arrivo a quello di uscita. Il prezzo può essere il totale o a persona.",
  },
  {
    id: "cibo",
    label: "Cibo",
    hint: "Pasti e spesa da includere nel confronto.",
  },
  {
    id: "trasporti",
    label: "Trasporti",
    hint: "Treni, taxi, noleggio e trasferimenti.",
  },
  {
    id: "attivita",
    label: "Attività",
    hint: "Ingressi, escursioni e tour.",
  },
  {
    id: "altro",
    label: "Altro",
    hint: "Quello che non sta nelle altre voci.",
  },
] as const;

export type CategorySection = (typeof CATEGORIES)[number];
export type CategoryId = CategorySection["id"];

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORIES.some((category) => category.id === value);
}

export type MoneyTotals = {
  byCategory: Record<CategoryId, number>;
  total: number;
  perPerson: number | null;
};

export type TripSummary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  people: number;
  proposalCount: number;
  lowestTotal: number | null;
  lowestPerPerson: number | null;
};

export type ProposalSummary = {
  id: string;
  title: string;
  totals: MoneyTotals;
  priced: boolean;
  cheapest: boolean;
};

export type TripDetail = TripSummary & {
  proposals: ProposalSummary[];
};

export type PriceBasis = "totale" | "persona";

export type FlightDetails = {
  basis: PriceBasis;
  price: number;
  outboundFrom: string;
  outboundTo: string;
  returnFrom: string;
  returnTo: string;
};

function signedCents(price: number): number {
  const cents = Number(price.toFixed(2).replace("-", "").replace(".", ""));
  return price < 0 ? -cents : cents;
}

export function toCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return signedCents(value);
}

export function totalForBasis(price: number, basis: PriceBasis, peopleCount: number): number {
  const cents = signedCents(price);
  const totalCents = basis === "persona" ? cents * peopleCount : cents;
  return totalCents / 100;
}

export function splitMoney(total: number, parts: number): number | null {
  if (!Number.isInteger(parts) || parts < 1) return null;
  return Math.round(signedCents(total) / parts) / 100;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year == null || month == null || day == null) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function utcDay(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function nextIsoDate(iso: string): string {
  const date = new Date(utcDay(iso) + 86_400_000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function countNights(checkIn: string, checkOut: string): number | null {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return null;
  const nights = Math.round((utcDay(checkOut) - utcDay(checkIn)) / 86_400_000);
  if (nights < 1) return null;
  return nights;
}

export type StayDetails = {
  basis: PriceBasis;
  price: number;
  place: string;
  checkIn: string;
  checkOut: string;
  link: string;
};

function nightsBetween(checkIn: string, checkOut: string): string[] {
  const count = countNights(checkIn, checkOut);
  if (count == null) return [];
  const nights: string[] = [];
  let cursor = checkIn;
  for (let index = 0; index < count; index += 1) {
    nights.push(cursor);
    cursor = nextIsoDate(cursor);
  }
  return nights;
}

export function averagePerNight(
  stays: readonly { amount: number; checkIn: string; checkOut: string }[],
): { nights: number; perNight: number } | null {
  const covered = new Set<string>();
  let totalCents = 0;
  for (const stay of stays) {
    const nights = nightsBetween(stay.checkIn, stay.checkOut);
    if (nights.length === 0) continue;
    for (const night of nights) covered.add(night);
    totalCents += signedCents(stay.amount);
  }
  if (covered.size < 1) return null;
  return { nights: covered.size, perNight: Math.round(totalCents / covered.size) / 100 };
}

export type StayIssue =
  | { kind: "overlap"; first: string; second: string }
  | { kind: "gap"; checkIn: string; checkOut: string }
  | { kind: "outside"; place: string };

export function findStayIssues(
  stays: readonly Pick<StayDetails, "place" | "checkIn" | "checkOut">[],
  tripStart: string,
  tripEnd: string,
): StayIssue[] {
  const spans = stays.filter((stay) => countNights(stay.checkIn, stay.checkOut) != null);
  if (spans.length === 0) return [];

  const issues: StayIssue[] = [];
  for (let leftIndex = 0; leftIndex < spans.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < spans.length; rightIndex += 1) {
      const left = spans[leftIndex];
      const right = spans[rightIndex];
      if (!left || !right) continue;
      const overlaps = left.checkIn < right.checkOut && right.checkIn < left.checkOut;
      if (overlaps) issues.push({ kind: "overlap", first: left.place, second: right.place });
    }
  }

  const tripReady = isIsoDate(tripStart) && isIsoDate(tripEnd) && tripEnd > tripStart;
  if (!tripReady) return issues;

  const covered = new Set<string>();
  for (const stay of spans) {
    for (const night of nightsBetween(stay.checkIn, stay.checkOut)) covered.add(night);
    if (stay.checkIn < tripStart || stay.checkOut > tripEnd) {
      issues.push({ kind: "outside", place: stay.place });
    }
  }

  const uncovered = nightsBetween(tripStart, tripEnd).filter((night) => !covered.has(night));
  let rangeStart: string | null = null;
  let previous: string | null = null;
  const pushGap = () => {
    if (rangeStart == null || previous == null) return;
    issues.push({ kind: "gap", checkIn: rangeStart, checkOut: nextIsoDate(previous) });
  };
  for (const night of uncovered) {
    if (rangeStart == null || previous == null || nextIsoDate(previous) !== night) {
      pushGap();
      rangeStart = night;
    }
    previous = night;
  }
  pushGap();

  return issues;
}

export type CostLine = {
  id: string;
  category: CategoryId;
  label: string;
  amount: number;
  flight: FlightDetails | null;
  stay: StayDetails | null;
};

export type ProposalDetail = {
  id: string;
  title: string;
  totals: MoneyTotals;
  priced: boolean;
  trip: Pick<TripSummary, "id" | "title" | "startDate" | "endDate" | "people">;
  lines: CostLine[];
  sections: readonly CategorySection[];
};

export type TripInput = {
  title: string;
  startDate: string;
  endDate: string;
  people: number;
};

export type TripPatch = {
  title?: string;
  startDate?: string;
  endDate?: string;
  people?: number;
};

export type LineCreate =
  | { kind: "flight"; flight: FlightDetails }
  | { kind: "stay"; stay: StayDetails }
  | { kind: "plain"; category: CategoryId; label: string; amount: number };

export type LineUpdate =
  | { kind: "flight"; flight: FlightDetails }
  | { kind: "stay"; stay: StayDetails }
  | { kind: "plain"; label: string; amount: number };

export type StepId = "persone" | CategoryId;
