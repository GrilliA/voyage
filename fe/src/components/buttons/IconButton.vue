<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <button class="icon-button" type="button" :aria-label="label"><slot /></button>
</template>

<style scoped>
.icon-button {
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-muted);
  font-size: 1.3rem;
  line-height: 1;
}
</style>
