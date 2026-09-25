<script setup lang="ts">
import type { PriceBasis } from "../../../../shared/domain";

const basis = defineModel<PriceBasis>({ required: true });
</script>

<template>
  <div class="basis" role="radiogroup" aria-label="Il prezzo è">
    <button
      type="button"
      role="radio"
      :aria-checked="basis === 'totale'"
      :class="{ active: basis === 'totale' }"
      @click="basis = 'totale'"
    >
      Totale
    </button>
    <button
      type="button"
      role="radio"
      :aria-checked="basis === 'persona'"
      :class="{ active: basis === 'persona' }"
      @click="basis = 'persona'"
    >
      A persona
    </button>
  </div>
</template>

<style scoped>
.basis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: var(--space-1);
  border-radius: var(--radius-md);
  background: var(--color-sunken);
}

.basis button {
  border: 0;
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  background: transparent;
  font-weight: 600;
}

.basis button.active {
  background: var(--color-field);
  color: var(--color-accent);
  box-shadow: var(--shadow-soft);
}
</style>
