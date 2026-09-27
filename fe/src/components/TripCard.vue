<script setup lang="ts">
import { formatMoney, formatPeople, formatProposals, formatRange, stripColor } from "../format";
import type { TripSummary } from "../api/types";
import AppCard from "./cards/AppCard.vue";

defineProps<{
  trip: TripSummary;
}>();
</script>

<template>
  <AppCard :to="{ name: 'trip', params: { tripId: trip.id } }">
    <span class="card-strip" :style="{ background: stripColor(trip.title) }"></span>
    <h2>{{ trip.title }}</h2>
    <p class="meta">{{ formatRange(trip.startDate, trip.endDate) }}</p>
    <p class="meta">{{ formatPeople(trip.people) }} · {{ formatProposals(trip.proposalCount) }}</p>
    <div class="price-block">
      <template v-if="trip.lowestTotal !== null">
        <p class="price-kicker">da</p>
        <p class="price">{{ formatMoney(trip.lowestTotal) }}</p>
        <p class="per-person">{{ formatMoney(trip.lowestPerPerson) }} a persona</p>
      </template>
      <p v-else class="per-person">
        {{ trip.proposalCount === 0 ? "Nessuna proposta" : "Da compilare" }}
      </p>
    </div>
  </AppCard>
</template>

<style scoped>
.card-strip {
  width: var(--size-strip);
  height: var(--size-strip-bar);
  margin-bottom: var(--space-5);
  border-radius: var(--radius-pill);
}
</style>
