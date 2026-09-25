<script setup lang="ts">
const emit = defineEmits<{ submit: [] }>();
</script>

<template>
  <form class="form-panel" @submit.prevent="emit('submit')">
    <slot />
    <div class="panel-actions">
      <slot name="actions" />
    </div>
  </form>
</template>

<style scoped>
.form-panel {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
