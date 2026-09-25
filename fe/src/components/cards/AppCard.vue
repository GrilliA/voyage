<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

withDefaults(
  defineProps<{
    to?: RouteLocationRaw;
    as?: "div" | "button";
    variant?: "default" | "add";
    highlighted?: boolean;
    accentTop?: boolean;
  }>(),
  { to: undefined, as: "div", variant: "default", highlighted: false, accentTop: false },
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
  <button v-else-if="as === 'button'" class="card" :class="[variant, { 'accent-top': accentTop }]" type="button">
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
  min-height: 250px;
  padding: var(--space-6);
  border-radius: var(--radius-xl);
  background: var(--color-card);
  border: 1px solid var(--color-card-border);
  box-shadow: var(--shadow-card);
  text-decoration: none;
  color: inherit;
  text-align: left;
}

.link { transition: transform 160ms ease, box-shadow 160ms ease; }
.link:hover { transform: translateY(-4px); }

.highlighted { box-shadow: 0 0 0 2px var(--color-accent), var(--shadow-cheapest); }

.accent-top { border-top: 4px solid var(--color-accent); }

.add {
  width: 100%;
  gap: var(--space-4);
  border: 1.5px dashed var(--color-dashed);
  background: transparent;
  box-shadow: none;
}

button.add { justify-content: center; }
</style>
