<script setup lang="ts">
withDefaults(defineProps<{ type?: "text" | "url" }>(), { type: "text" });
const text = defineModel<string>({ required: true });
</script>

<template>
  <input v-model="text" class="text-input" :type="type" />
</template>

<style scoped>
.text-input {
  width: 100%;
  border: 1px solid var(--color-field-border);
  border-radius: var(--radius-sm);
  background: var(--color-field);
  padding: var(--space-3) var(--space-4);
}
</style>
