<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <p class="cost-line-row">
    <span class="kicker">{{ label }}</span>
    <slot />
  </p>
</template>

<style scoped>
.cost-line-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
}

@media (min-width: 40rem) {
  .cost-line-row {
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-3);
  }

  .kicker { flex: 0 0 var(--size-label); }
}
</style>
