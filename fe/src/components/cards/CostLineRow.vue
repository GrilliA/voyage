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
  gap: var(--space-3);
  margin: 0;
}

.kicker { flex: 0 0 4.6rem; }
</style>
