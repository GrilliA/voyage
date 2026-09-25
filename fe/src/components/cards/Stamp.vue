<template>
  <p class="stamp"><slot /></p>
</template>

<style scoped>
.stamp {
  align-self: flex-start;
  margin: 0 0 var(--space-3);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}
</style>
