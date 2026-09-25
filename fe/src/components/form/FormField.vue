<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <label class="field">
    {{ label }}
    <slot />
  </label>
</template>

<style scoped>
.field {
  display: grid;
  gap: var(--space-2);
  font-size: var(--text-sm);
}
</style>
