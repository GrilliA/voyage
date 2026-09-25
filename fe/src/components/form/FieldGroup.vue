<script setup lang="ts">
defineProps<{ legend: string }>();
</script>

<template>
  <fieldset class="field-group">
    <legend class="kicker">{{ legend }}</legend>
    <div class="columns">
      <slot />
    </div>
  </fieldset>
</template>

<style scoped>
.field-group {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  border: 0;
}

.field-group legend { padding: 0; }

.columns {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

@media (min-width: 40rem) {
  .columns { grid-template-columns: 1fr 1fr; }
}
</style>
