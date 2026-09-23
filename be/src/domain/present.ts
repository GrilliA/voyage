import {
  CATEGORIES,
  type ProposalDetail,
  type ProposalSummary,
  type TripDetail,
  type TripSummary,
} from "../../../shared/domain.ts";
import { proposalTotals } from "./calc.ts";
import type { Proposal, Trip } from "../data/store.ts";

function presentCard(proposal: Proposal, peopleCount: number): Omit<ProposalSummary, "cheapest"> {
  return {
    id: proposal.id,
    title: proposal.title,
    totals: proposalTotals(proposal.lines, peopleCount),
    priced: proposal.lines.length > 0,
  };
}

export function presentProposal(trip: Trip, proposal: Proposal): ProposalDetail {
  const card = presentCard(proposal, trip.people);
  return {
    ...card,
    trip: {
      id: trip.id,
      title: trip.title,
      startDate: trip.startDate,
      endDate: trip.endDate,
      people: trip.people,
    },
    lines: proposal.lines.map((line) => ({
      id: line.id,
      category: line.category,
      label: line.label,
      amount: line.amount,
    })),
    sections: CATEGORIES,
  };
}

export function presentTripDetail(trip: Trip): TripDetail {
  const proposals: ProposalSummary[] = trip.proposals
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((proposal) => ({ ...presentCard(proposal, trip.people), cheapest: false }));

  const priced = proposals.filter((proposal) => proposal.priced);
  const lowestTotal = priced.length
    ? Math.min(...priced.map((proposal) => proposal.totals.total))
    : null;

  if (priced.length >= 2 && lowestTotal != null) {
    for (const proposal of proposals) {
      proposal.cheapest = proposal.priced && proposal.totals.total === lowestTotal;
    }
  }

  const lowest = priced.find((proposal) => proposal.totals.total === lowestTotal) ?? null;

  return {
    id: trip.id,
    title: trip.title,
    startDate: trip.startDate,
    endDate: trip.endDate,
    people: trip.people,
    proposalCount: proposals.length,
    lowestTotal,
    lowestPerPerson: lowest ? lowest.totals.perPerson : null,
    proposals,
  };
}

export function presentTripSummary(trip: Trip): TripSummary {
  const detail = presentTripDetail(trip);
  return {
    id: detail.id,
    title: detail.title,
    startDate: detail.startDate,
    endDate: detail.endDate,
    people: detail.people,
    proposalCount: detail.proposalCount,
    lowestTotal: detail.lowestTotal,
    lowestPerPerson: detail.lowestPerPerson,
  };
}
