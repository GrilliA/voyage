export const CATEGORIES = [
  {
    id: "voli",
    label: "Voli",
    hint: "Ogni volo della proposta, andata e ritorno compresi.",
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

export type CostLine = {
  id: string;
  category: CategoryId;
  label: string;
  amount: number;
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
