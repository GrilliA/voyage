import { Router, type NextFunction, type Request, type Response } from "express";
import { addLine, deleteLine, updateLine } from "../../business/lines.ts";
import { createProposal, deleteProposal, getProposal, updateProposal } from "../../business/proposals.ts";
import type { TripRepository } from "../../business/repository.ts";
import { createTrip, deleteTrip, getTrip, listTrips, updateTrip } from "../../business/trips.ts";
import { NotFound } from "../../core/errors.ts";
import { presentProposal, presentTripDetail, presentTripSummary } from "../../core/present.ts";
import {
  decodeLineCreate,
  decodeLineUpdate,
  decodeProposalCreate,
  decodeProposalPatch,
  decodeTripCreate,
  decodeTripPatch,
} from "../../../../shared/codec.ts";
import { accept } from "../accept.ts";
import { routeId, sendHttpError } from "../http.ts";

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch((error: unknown) => {
      if (sendHttpError(res, error)) return;
      next(error);
    });
  };
}

export function createTripsRouter(trips: TripRepository) {
  const router = Router();

  router.get(
    "/",
    asyncRoute(async (_req, res) => {
      const tripList = await listTrips(trips);
      res.json(tripList.map(presentTripSummary));
    }),
  );

  router.post(
    "/",
    asyncRoute(async (req, res) => {
      const trip = await createTrip(trips, accept(() => decodeTripCreate(req.body)));
      res.status(201).json(presentTripDetail(trip));
    }),
  );

  router.get(
    "/:tripId",
    asyncRoute(async (req, res) => {
      const trip = await getTrip(trips, routeId(req.params.tripId));
      res.json(presentTripDetail(trip));
    }),
  );

  router.patch(
    "/:tripId",
    asyncRoute(async (req, res) => {
      const trip = await updateTrip(trips, routeId(req.params.tripId), accept(() => decodeTripPatch(req.body)));
      res.json(presentTripDetail(trip));
    }),
  );

  router.delete(
    "/:tripId",
    asyncRoute(async (req, res) => {
      await deleteTrip(trips, routeId(req.params.tripId));
      res.status(204).end();
    }),
  );

  router.post(
    "/:tripId/proposals",
    asyncRoute(async (req, res) => {
      const { trip, proposal } = await createProposal(
        trips,
        routeId(req.params.tripId),
        accept(() => decodeProposalCreate(req.body)),
      );
      res.status(201).json(presentProposal(trip, proposal));
    }),
  );

  router.get(
    "/:tripId/proposals/:proposalId",
    asyncRoute(async (req, res) => {
      const { trip, proposal } = await getProposal(
        trips,
        routeId(req.params.tripId),
        routeId(req.params.proposalId),
      );
      res.json(presentProposal(trip, proposal));
    }),
  );

  router.patch(
    "/:tripId/proposals/:proposalId",
    asyncRoute(async (req, res) => {
      const { trip, proposal } = await updateProposal(
        trips,
        routeId(req.params.tripId),
        routeId(req.params.proposalId),
        accept(() => decodeProposalPatch(req.body)),
      );
      res.json(presentProposal(trip, proposal));
    }),
  );

  router.delete(
    "/:tripId/proposals/:proposalId",
    asyncRoute(async (req, res) => {
      await deleteProposal(trips, routeId(req.params.tripId), routeId(req.params.proposalId));
      res.status(204).end();
    }),
  );

  router.post(
    "/:tripId/proposals/:proposalId/lines",
    asyncRoute(async (req, res) => {
      const { trip, proposal } = await addLine(
        trips,
        routeId(req.params.tripId),
        routeId(req.params.proposalId),
        accept(() => decodeLineCreate(req.body)),
      );
      res.status(201).json(presentProposal(trip, proposal));
    }),
  );

  router.patch(
    "/:tripId/proposals/:proposalId/lines/:lineId",
    asyncRoute(async (req, res) => {
      const tripId = routeId(req.params.tripId);
      const proposalId = routeId(req.params.proposalId);
      const lineId = routeId(req.params.lineId);
      const current = await getProposal(trips, tripId, proposalId);
      const line = current.proposal.lines.find((candidate) => candidate.id === lineId);
      if (!line) throw new NotFound("Voce non trovata.");
      const { trip, proposal } = await updateLine(
        trips,
        tripId,
        proposalId,
        lineId,
        accept(() => decodeLineUpdate(req.body, line.category)),
      );
      res.json(presentProposal(trip, proposal));
    }),
  );

  router.delete(
    "/:tripId/proposals/:proposalId/lines/:lineId",
    asyncRoute(async (req, res) => {
      const { trip, proposal } = await deleteLine(
        trips,
        routeId(req.params.tripId),
        routeId(req.params.proposalId),
        routeId(req.params.lineId),
      );
      res.json(presentProposal(trip, proposal));
    }),
  );

  return router;
}
