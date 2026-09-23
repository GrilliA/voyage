import { createRouter, createWebHistory } from "vue-router";
import TripsView from "./views/TripsView.vue";
import TripView from "./views/TripView.vue";
import ProposalView from "./views/ProposalView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "trips", component: TripsView },
    { path: "/trips/:tripId", name: "trip", component: TripView },
    {
      path: "/trips/:tripId/proposals/:proposalId",
      name: "proposal",
      component: ProposalView,
    },
  ],
});
