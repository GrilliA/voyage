import type { CostLine } from "../../../shared/domain.ts";
import { BadInput } from "./errors.ts";

export type Proposal = {
  id: string;
  title: string;
  createdAt: string;
  lines: CostLine[];
};

export type Trip = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  people: number;
  createdAt: string;
  proposals: Proposal[];
};

export function assertDateOrder(startDate: string, endDate: string): void {
  if (startDate && endDate && endDate < startDate) {
    throw new BadInput("La data di fine è prima della partenza.");
  }
}
