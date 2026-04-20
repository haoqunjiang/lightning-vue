<template>
  <div class="deep-child">
    <span class="deep-chip">Deep target</span>
    <button class="deep-button">Nested button</button>
  </div>
</template>

<style scoped>
.deep-child {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.deep-chip,
.deep-button {
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: #eef2ff;
  border: 1px solid rgba(79, 70, 229, 0.12);
  color: #2d3b61;
}

.deep-button {
  border: 0;
  font: inherit;
}
</style>
