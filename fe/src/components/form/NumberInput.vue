<script setup lang="ts">
const amount = defineModel<number | string>({ required: true });
</script>

<template>
  <input v-model="amount" class="number-input" type="number" />
</template>

<style scoped>
.number-input {
  width: 100%;
  border: 1px solid var(--color-field-border);
  border-radius: var(--radius-sm);
  background: var(--color-field);
  padding: var(--space-3) var(--space-4);
  -moz-appearance: textfield;
  appearance: textfield;
}

.number-input::-webkit-outer-spin-button,
.number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
