<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <button class="icon-button" type="button" :aria-label="label"><slot /></button>
</template>

<style scoped>
.icon-button {
  flex: 0 0 auto;
  width: var(--size-control);
  height: var(--size-control);
  border: var(--border-width) solid var(--color-line);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-muted);
  font-size: var(--text-lg);
  line-height: var(--leading-none);
}
</style>
