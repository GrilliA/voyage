import { Router, type NextFunction, type Request, type Response } from "express";
import { BadInput, NotFound } from "../errors.ts";
import { jsonObject } from "../domain/validate.ts";
import { presentProposal, presentTripDetail, presentTripSummary } from "../domain/present.ts";
import type { Store } from "../data/store.ts";

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch((error: unknown) => {
      if (error instanceof NotFound) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof BadInput) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    });
  };
}

function routeId(value: string | string[] | undefined): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new NotFound("Percorso non trovato.");
  }
  return value;
}

export function createTripsRouter(store: Store) {
  const router = Router();

  router.get(
    "/",
    asyncRoute(async (_req, res) => {
      res.json(store.listTrips().map(presentTripSummary));
    }),
  );

  router.post(
    "/",
    asyncRoute(async (req, res) => {
      const trip = await store.createTrip(jsonObject(req.body));
      res.status(201).json(presentTripDetail(trip));
    }),
  );

  router.get(
    "/:tripId",
    asyncRoute(async (req, res) => {
      res.json(presentTripDetail(store.getTrip(routeId(req.params.tripId))));
    }),
  );

  router.patch(
    "/:tripId",
    asyncRoute(async (req, res) => {
      const trip = await store.updateTrip(routeId(req.params.tripId), jsonObject(req.body));
      res.json(presentTripDetail(trip));
    }),
  );

  router.delete(
    "/:tripId",
    asyncRoute(async (req, res) => {
      await store.deleteTrip(routeId(req.params.tripId));
      res.status(204).end();
    }),
  );

  router.post(
    "/:tripId/proposals",
    asyncRoute(async (req, res) => {
      const { trip, proposal } = await store.createProposal(
        routeId(req.params.tripId),
        jsonObject(req.body),
      );
      res.status(201).json(presentProposal(trip, proposal));
    }),
  );

  router.get(
    "/:tripId/proposals/:proposalId",
    asyncRoute(async (req, res) => {
      const { trip, proposal } = store.getProposal(
        routeId(req.params.tripId),
        routeId(req.params.proposalId),
      );
      res.json(presentProposal(trip, proposal));
    }),
  );

  router.patch(
    "/:tripId/proposals/:proposalId",
    asyncRoute(async (req, res) => {
      const { trip, proposal } = await store.updateProposal(
        routeId(req.params.tripId),
        routeId(req.params.proposalId),
        jsonObject(req.body),
      );
      res.json(presentProposal(trip, proposal));
    }),
  );

  router.delete(
    "/:tripId/proposals/:proposalId",
    asyncRoute(async (req, res) => {
      await store.deleteProposal(routeId(req.params.tripId), routeId(req.params.proposalId));
      res.status(204).end();
    }),
  );

  router.post(
    "/:tripId/proposals/:proposalId/lines",
    asyncRoute(async (req, res) => {
      const { trip, proposal } = await store.addLine(
        routeId(req.params.tripId),
        routeId(req.params.proposalId),
        jsonObject(req.body),
      );
      res.status(201).json(presentProposal(trip, proposal));
    }),
  );

  router.patch(
    "/:tripId/proposals/:proposalId/lines/:lineId",
    asyncRoute(async (req, res) => {
      const { trip, proposal } = await store.updateLine(
        routeId(req.params.tripId),
        routeId(req.params.proposalId),
        routeId(req.params.lineId),
        jsonObject(req.body),
      );
      res.json(presentProposal(trip, proposal));
    }),
  );

  router.delete(
    "/:tripId/proposals/:proposalId/lines/:lineId",
    asyncRoute(async (req, res) => {
      const { trip, proposal } = await store.deleteLine(
        routeId(req.params.tripId),
        routeId(req.params.proposalId),
        routeId(req.params.lineId),
      );
      res.json(presentProposal(trip, proposal));
    }),
  );

  return router;
}
