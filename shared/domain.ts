export const CATEGORIES = [
  {
    id: "voli",
    label: "Voli",
    hint: "Andata e ritorno. Il prezzo può essere il totale o a persona.",
  },
  {
    id: "alloggio",
    label: "Hotel / BnB",
    hint: "Hotel, BnB o altre notti.",
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

export function flightTotal(price: number, basis: PriceBasis, peopleCount: number): number {
  const cents = Number(price.toFixed(2).replace("-", "").replace(".", ""));
  const signed = price < 0 ? -cents : cents;
  const totalCents = basis === "persona" ? signed * peopleCount : signed;
  return totalCents / 100;
}

export type CostLine = {
  id: string;
  category: CategoryId;
  label: string;
  amount: number;
  flight: FlightDetails | null;
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

export type StepId = "persone" | CategoryId;
