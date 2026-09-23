<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";
import { formatMoney } from "../format";
import type { ProposalSummary } from "../api/types";

defineProps<{
  proposal: ProposalSummary;
  accent: string;
  to: RouteLocationRaw;
}>();
</script>

<template>
  <RouterLink
    class="card proposal-card"
    :class="{ cheapest: proposal.cheapest }"
    :style="{ '--accent': accent }"
    :to="to"
  >
    <p v-if="proposal.cheapest" class="stamp">Più bassa</p>
    <h2>{{ proposal.title }}</h2>
    <div class="price-block">
      <template v-if="proposal.priced">
        <p class="price">{{ formatMoney(proposal.totals.total) }}</p>
        <p class="per-person">{{ formatMoney(proposal.totals.perPerson) }} a persona</p>
      </template>
      <p v-else class="per-person">Da compilare</p>
    </div>
  </RouterLink>
</template>
