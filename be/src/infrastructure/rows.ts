import {
  isCategoryId,
  toCents,
  type CategoryId,
  type CostLine,
  type FlightDetails,
  type PriceBasis,
  type StayDetails,
} from "../../../shared/domain.ts";
import type { LineContent } from "../core/lines.ts";

export type LineColumns = {
  label: string;
  amountCents: number;
  priceBasis: string | null;
  priceCents: number | null;
  outboundFrom: string | null;
  outboundTo: string | null;
  returnFrom: string | null;
  returnTo: string | null;
  checkIn: string | null;
  checkOut: string | null;
  link: string | null;
};

export type CostLineRow = LineColumns & {
  id: string;
  proposalId: string;
  category: string;
  createdAt: Date;
};

const blankColumns = {
  priceBasis: null,
  priceCents: null,
  outboundFrom: null,
  outboundTo: null,
  returnFrom: null,
  returnTo: null,
  checkIn: null,
  checkOut: null,
  link: null,
};

export function eurosFromCents(amountCents: number): number {
  return amountCents / 100;
}

export function centsFromEuros(amountInEuros: number): number {
  const amountCents = toCents(amountInEuros);
  if (amountCents == null) throw new Error("Invalid amount.");
  return amountCents;
}

function storedCategory(value: string): CategoryId {
  if (!isCategoryId(value)) throw new Error(`Unknown category in database: ${value}`);
  return value;
}

function storedBasis(value: string): PriceBasis {
  if (value !== "totale" && value !== "persona") throw new Error(`Unknown price basis: ${value}`);
  return value;
}

function flightFromRow(lineRow: CostLineRow): FlightDetails | null {
  if (
    lineRow.priceBasis == null ||
    lineRow.priceCents == null ||
    lineRow.outboundFrom == null ||
    lineRow.outboundTo == null ||
    lineRow.returnFrom == null ||
    lineRow.returnTo == null
  ) {
    return null;
  }

  return {
    basis: storedBasis(lineRow.priceBasis),
    price: eurosFromCents(lineRow.priceCents),
    outboundFrom: lineRow.outboundFrom,
    outboundTo: lineRow.outboundTo,
    returnFrom: lineRow.returnFrom,
    returnTo: lineRow.returnTo,
  };
}

function stayFromRow(lineRow: CostLineRow): StayDetails | null {
  if (lineRow.category !== "alloggio") return null;
  if (
    lineRow.priceBasis == null ||
    lineRow.priceCents == null ||
    lineRow.checkIn == null ||
    lineRow.checkOut == null
  ) {
    return null;
  }

  return {
    basis: storedBasis(lineRow.priceBasis),
    price: eurosFromCents(lineRow.priceCents),
    place: lineRow.label,
    checkIn: lineRow.checkIn,
    checkOut: lineRow.checkOut,
    link: lineRow.link ?? "",
  };
}

export function lineFromRow(lineRow: CostLineRow): CostLine {
  return {
    id: lineRow.id,
    category: storedCategory(lineRow.category),
    label: lineRow.label,
    amount: eurosFromCents(lineRow.amountCents),
    flight: flightFromRow(lineRow),
    stay: stayFromRow(lineRow),
  };
}

export function lineToColumns(line: LineContent): LineColumns {
  if (line.flight) {
    return {
      label: line.label,
      amountCents: centsFromEuros(line.amount),
      priceBasis: line.flight.basis,
      priceCents: centsFromEuros(line.flight.price),
      outboundFrom: line.flight.outboundFrom,
      outboundTo: line.flight.outboundTo,
      returnFrom: line.flight.returnFrom,
      returnTo: line.flight.returnTo,
      checkIn: null,
      checkOut: null,
      link: null,
    };
  }

  if (line.stay) {
    return {
      label: line.label,
      amountCents: centsFromEuros(line.amount),
      priceBasis: line.stay.basis,
      priceCents: centsFromEuros(line.stay.price),
      outboundFrom: null,
      outboundTo: null,
      returnFrom: null,
      returnTo: null,
      checkIn: line.stay.checkIn,
      checkOut: line.stay.checkOut,
      link: line.stay.link || null,
    };
  }

  return {
    label: line.label,
    amountCents: centsFromEuros(line.amount),
    ...blankColumns,
  };
}
