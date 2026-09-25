<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const amount = defineModel<number | string>({ required: true });
</script>

<template>
  <input v-bind="$attrs" v-model="amount" class="number-input" type="number" inputmode="decimal" />
</template>

<style scoped>
.number-input {
  width: 100%;
  min-height: var(--size-control);
  border: var(--border-width) solid var(--color-field-border);
  border-radius: var(--radius-sm);
  background: var(--color-field);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-md);
  -moz-appearance: textfield;
  appearance: textfield;
}

.number-input::-webkit-outer-spin-button,
.number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
