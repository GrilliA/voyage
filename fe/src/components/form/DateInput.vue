<script setup lang="ts">
defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    min?: string;
  }>(),
  { min: "" },
);

const date = defineModel<string>({ required: true });
</script>

<template>
  <input v-bind="$attrs" v-model="date" class="date-input" type="date" :min="min" />
</template>

<style scoped>
.date-input {
  width: 100%;
  min-height: var(--size-control);
  border: var(--border-width) solid var(--color-field-border);
  border-radius: var(--radius-sm);
  background: var(--color-field);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-md);
}
</style>
