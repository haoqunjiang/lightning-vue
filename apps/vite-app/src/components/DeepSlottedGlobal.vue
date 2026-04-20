<script setup lang="ts">
import DeepChild from "./DeepChild.vue";
import SourceToggle from "./SourceToggle.vue";

defineProps<{
  source: string;
}>();
</script>

<template>
  <section class="demo card">
    <header>
      <p class="eyebrow">Carrier selectors</p>
      <h2>Deep, slotted, and global escapes</h2>
    </header>

    <div class="grid">
      <article class="panel">
        <strong>:deep()</strong>
        <p>The chip and button below should both inherit this coral treatment.</p>
        <DeepChild />
      </article>

      <article class="panel slot-host">
        <strong>:slotted()</strong>
        <p>The slotted pill should turn green with extra tracking.</p>
        <slot />
      </article>
    </div>

    <p class="global-note global-signal">
      :global() styles this note without adding the component scope attribute.
    </p>

    <SourceToggle :source="source" />
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.9rem;
}

.panel {
  padding: 1rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);

  p {
    color: #4e5976;
  }
}

.panel :deep(.deep-chip),
.panel :deep(.deep-button) {
  background: linear-gradient(135deg, #ff8a50, #ffc47f);
  color: white;
  border-color: transparent;
}

.slot-host :slotted(.slotted-pill) {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: #d1fae5;
  color: #065f46;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

:global(.global-signal) {
  margin: 1rem 0 0;
  padding: 0.8rem 1rem;
  border-radius: 16px;
  border: 1px dashed rgba(59, 130, 246, 0.35);
  color: #23406f;
  background: rgba(219, 234, 254, 0.72);
}
</style>
