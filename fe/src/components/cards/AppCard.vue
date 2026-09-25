<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

withDefaults(
  defineProps<{
    to?: RouteLocationRaw;
    tag?: "div" | "button";
    variant?: "default" | "add";
    highlighted?: boolean;
    accentTop?: boolean;
  }>(),
  { tag: "div", variant: "default", highlighted: false, accentTop: false },
);
</script>

<template>
  <RouterLink
    v-if="to"
    class="card link"
    :class="[variant, { highlighted, 'accent-top': accentTop }]"
    :to="to"
  >
    <slot />
  </RouterLink>
  <button v-else-if="tag === 'button'" class="card" :class="[variant, { 'accent-top': accentTop }]" type="button">
    <slot />
  </button>
  <div v-else class="card" :class="[variant, { 'accent-top': accentTop }]">
    <slot />
  </div>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  background: var(--color-card);
  border: var(--border-width) solid var(--color-card-border);
  box-shadow: var(--shadow-card);
  text-decoration: none;
  color: inherit;
  text-align: left;
}

.link { transition: transform 160ms ease, box-shadow 160ms ease; }

.highlighted { box-shadow: 0 0 0 var(--focus-ring) var(--color-accent), var(--shadow-cheapest); }

.accent-top { border-top: var(--border-mark) solid var(--color-accent); }

.add {
  width: 100%;
  gap: var(--space-4);
  border: var(--border-width) dashed var(--color-dashed);
  background: transparent;
  box-shadow: none;
}

button.add { justify-content: center; }

@media (min-width: 40rem) {
  .card {
    min-height: var(--size-card-block);
    padding: var(--space-6);
  }
}

@media (hover: hover) and (pointer: fine) {
  .link:hover { transform: translateY(calc(-1 * var(--space-1))); }
}

@media (prefers-reduced-motion: reduce) {
  .link { transition: none; }
}
</style>
