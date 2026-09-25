<template>
  <article class="cost-line-card">
    <div class="rows">
      <slot />
    </div>
    <div class="foot">
      <p class="price"><slot name="price" /></p>
      <span class="actions"><slot name="actions" /></span>
    </div>
  </article>
</template>

<style scoped>
.cost-line-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: var(--border-width) solid var(--color-line);
  border-radius: var(--radius-lg);
}

.rows { display: grid; gap: var(--space-2); }

.foot {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
}

.price { margin: 0; }

.price :slotted(small) {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

@media (min-width: 40rem) {
  .foot {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
