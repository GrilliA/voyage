<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";
import { formatMoney } from "../format";
import type { ProposalSummary } from "../api/types";
import AppCard from "./cards/AppCard.vue";
import Stamp from "./cards/Stamp.vue";

defineProps<{
  proposal: ProposalSummary;
  accent: string;
  to: RouteLocationRaw;
}>();
</script>

<template>
  <AppCard :to="to" :highlighted="proposal.cheapest" accent-top :style="{ '--color-accent': accent }">
    <Stamp v-if="proposal.cheapest">Più bassa</Stamp>
    <h2>{{ proposal.title }}</h2>
    <div class="price-block">
      <template v-if="proposal.priced">
        <p class="price">{{ formatMoney(proposal.totals.total) }}</p>
        <p class="per-person">{{ formatMoney(proposal.totals.perPerson) }} a persona</p>
      </template>
      <p v-else class="per-person">Da compilare</p>
    </div>
  </AppCard>
</template>
