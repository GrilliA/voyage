import type {
  CategoryId,
  FlightDetails,
  ProposalDetail,
  TripDetail,
  TripInput,
  TripSummary,
} from "./types.ts";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export function errorMessage(caught: unknown): string {
  if (caught instanceof Error && caught.message) return caught.message;
  return "Qualcosa non ha funzionato.";
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("Il server non risponde.");
  }

  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : "Qualcosa non ha funzionato.";
    throw new Error(message);
  }
  return data as T;
}

export type LineInput = {
  category: CategoryId;
  label: string;
  amount: number;
};

export type FlightInput = FlightDetails & {
  category: "voli";
};

export type LinePatch = {
  label: string;
  amount: number;
};

export const api = {
  listTrips: () => request<TripSummary[]>("/api/trips"),
  createTrip: (body: TripInput) => request<TripDetail>("/api/trips", { method: "POST", body }),
  getTrip: (id: string) => request<TripDetail>(`/api/trips/${id}`),
  updateTrip: (id: string, body: Partial<TripInput>) =>
    request<TripDetail>(`/api/trips/${id}`, { method: "PATCH", body }),
  deleteTrip: (id: string) => request<void>(`/api/trips/${id}`, { method: "DELETE" }),
  createProposal: (tripId: string, body: { title: string }) =>
    request<ProposalDetail>(`/api/trips/${tripId}/proposals`, { method: "POST", body }),
  getProposal: (tripId: string, proposalId: string) =>
    request<ProposalDetail>(`/api/trips/${tripId}/proposals/${proposalId}`),
  updateProposal: (tripId: string, proposalId: string, body: { title: string }) =>
    request<ProposalDetail>(`/api/trips/${tripId}/proposals/${proposalId}`, {
      method: "PATCH",
      body,
    }),
  deleteProposal: (tripId: string, proposalId: string) =>
    request<void>(`/api/trips/${tripId}/proposals/${proposalId}`, { method: "DELETE" }),
  addLine: (tripId: string, proposalId: string, body: LineInput | FlightInput) =>
    request<ProposalDetail>(`/api/trips/${tripId}/proposals/${proposalId}/lines`, {
      method: "POST",
      body,
    }),
  updateLine: (tripId: string, proposalId: string, lineId: string, body: LinePatch | FlightDetails) =>
    request<ProposalDetail>(`/api/trips/${tripId}/proposals/${proposalId}/lines/${lineId}`, {
      method: "PATCH",
      body,
    }),
  deleteLine: (tripId: string, proposalId: string, lineId: string) =>
    request<ProposalDetail>(`/api/trips/${tripId}/proposals/${proposalId}/lines/${lineId}`, {
      method: "DELETE",
    }),
};
