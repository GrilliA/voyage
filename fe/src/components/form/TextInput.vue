<script setup lang="ts">
defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{ type?: "text" | "url" }>(), { type: "text" });

const text = defineModel<string>({ required: true });
</script>

<template>
  <input v-bind="$attrs" v-model="text" class="text-input" :type="type" />
</template>

<style scoped>
.text-input {
  width: 100%;
  min-height: var(--size-control);
  border: var(--border-width) solid var(--color-field-border);
  border-radius: var(--radius-sm);
  background: var(--color-field);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-md);
}
</style>
