<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost" | "danger" | "ghost-danger";
    type?: "button" | "submit";
    to?: RouteLocationRaw;
  }>(),
  { variant: "primary", type: "button" },
);
</script>

<template>
  <RouterLink v-if="to" class="button" :class="variant" :to="to"><slot /></RouterLink>
  <button v-else class="button" :class="variant" :type="type"><slot /></button>
</template>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--size-control);
  border: var(--border-width) solid transparent;
  border-radius: var(--radius-pill);
  padding: var(--space-3) var(--space-5);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: var(--text-md);
  font-weight: 600;
  text-decoration: none;
}

.button:disabled { opacity: 0.55; cursor: wait; }

.secondary, .ghost {
  background: transparent;
  color: var(--color-ink);
  border-color: var(--color-field-border);
}

.danger {
  background: var(--color-danger);
  color: var(--color-on-accent);
}

.ghost-danger {
  background: transparent;
  color: var(--color-danger);
  border-color: var(--color-danger-line);
}
</style>
