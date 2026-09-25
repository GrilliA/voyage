<script setup lang="ts">
const date = defineModel<string>({ required: true });
</script>

<template>
  <input v-model="date" class="date-input" type="date" />
</template>

<style scoped>
.date-input {
  width: 100%;
  border: 1px solid var(--color-field-border);
  border-radius: var(--radius-sm);
  background: var(--color-field);
  padding: var(--space-3) var(--space-4);
}
</style>
