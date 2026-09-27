import {
  decodeProposalDetail,
  decodeTripDetail,
  decodeTripSummaries,
  encodeLineCreate,
  encodeLineUpdate,
  encodeProposalCreate,
  encodeProposalPatch,
  encodeTripCreate,
  encodeTripPatch,
} from "../../../shared/codec.ts";
import type {
  CategoryId,
  FlightDetails,
  ProposalDetail,
  StayDetails,
  TripDetail,
  TripInput,
  TripPatch,
  TripSummary,
} from "./types.ts";

type RequestOptions =
  | { method: "GET" | "DELETE" }
  | { method: "POST" | "PATCH"; body: unknown };

export function errorMessage(caught: unknown): string {
  if (caught instanceof Error && caught.message) return caught.message;
  return "Qualcosa non ha funzionato.";
}

function errorText(value: unknown): string {
  if (typeof value === "object" && value !== null && "error" in value && typeof value.error === "string") {
    return value.error;
  }
  return "Qualcosa non ha funzionato.";
}

function requestInit(options: RequestOptions): RequestInit {
  if (options.method === "POST" || options.method === "PATCH") {
    return {
      method: options.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options.body),
    };
  }
  return { method: options.method };
}

async function request(path: string, options: RequestOptions = { method: "GET" }): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, requestInit(options));
  } catch {
    throw new Error("Il server non risponde.");
  }

  if (response.status === 204) return null;
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(errorText(payload));
  return payload;
}

export type LineInput = {
  category: CategoryId;
  label: string;
  amount: number;
};

export type FlightInput = FlightDetails & {
  category: "voli";
};

export type StayInput = StayDetails & {
  category: "alloggio";
};

export type LinePatch = {
  label: string;
  amount: number;
};

export const api = {
  listTrips: async (): Promise<TripSummary[]> => decodeTripSummaries(await request("/api/trips")),
  createTrip: async (body: TripInput): Promise<TripDetail> =>
    decodeTripDetail(await request("/api/trips", { method: "POST", body: encodeTripCreate(body) })),
  getTrip: async (id: string): Promise<TripDetail> => decodeTripDetail(await request(`/api/trips/${id}`)),
  updateTrip: async (id: string, body: TripPatch): Promise<TripDetail> =>
    decodeTripDetail(await request(`/api/trips/${id}`, { method: "PATCH", body: encodeTripPatch(body) })),
  deleteTrip: async (id: string): Promise<void> => {
    await request(`/api/trips/${id}`, { method: "DELETE" });
  },
  createProposal: async (tripId: string, body: { title: string }): Promise<ProposalDetail> =>
    decodeProposalDetail(
      await request(`/api/trips/${tripId}/proposals`, { method: "POST", body: encodeProposalCreate(body) }),
    ),
  getProposal: async (tripId: string, proposalId: string): Promise<ProposalDetail> =>
    decodeProposalDetail(await request(`/api/trips/${tripId}/proposals/${proposalId}`)),
  updateProposal: async (tripId: string, proposalId: string, body: { title: string }): Promise<ProposalDetail> =>
    decodeProposalDetail(
      await request(`/api/trips/${tripId}/proposals/${proposalId}`, {
        method: "PATCH",
        body: encodeProposalPatch(body),
      }),
    ),
  deleteProposal: async (tripId: string, proposalId: string): Promise<void> => {
    await request(`/api/trips/${tripId}/proposals/${proposalId}`, { method: "DELETE" });
  },
  addLine: async (
    tripId: string,
    proposalId: string,
    body: LineInput | FlightInput | StayInput,
  ): Promise<ProposalDetail> =>
    decodeProposalDetail(
      await request(`/api/trips/${tripId}/proposals/${proposalId}/lines`, {
        method: "POST",
        body: encodeLineCreate(body),
      }),
    ),
  updateLine: async (
    tripId: string,
    proposalId: string,
    lineId: string,
    body: LinePatch | FlightDetails | StayDetails,
  ): Promise<ProposalDetail> =>
    decodeProposalDetail(
      await request(`/api/trips/${tripId}/proposals/${proposalId}/lines/${lineId}`, {
        method: "PATCH",
        body: encodeLineUpdate(body),
      }),
    ),
  deleteLine: async (tripId: string, proposalId: string, lineId: string): Promise<ProposalDetail> =>
    decodeProposalDetail(
      await request(`/api/trips/${tripId}/proposals/${proposalId}/lines/${lineId}`, { method: "DELETE" }),
    ),
};
