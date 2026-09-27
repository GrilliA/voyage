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
  padding: var(--space-4);
  border: var(--border-width) solid var(--color-line);
  border-radius: var(--radius-lg);
}

.panel-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-3);
}

@media (min-width: 40rem) {
  .form-panel { padding: var(--space-5); }

  .panel-actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>
