<script setup lang="ts">
import SourceToggle from "./SourceToggle.vue";

defineProps<{
  source: string;
}>();
</script>

<template>
  <section class="demo card">
    <header>
      <p class="eyebrow">Known edge case</p>
      <h2>@scope roots are still global</h2>
    </header>

    <p class="summary">
      Both boxes below should ideally behave the same. The second one becomes orange because the
      <code>@scope (.scope-host)</code> root selector is not yet scoped by the compiler.
    </p>

    <div class="grid">
      <div class="sample">
        <strong>Local host only</strong>
        <div class="scope-probe">Expected neutral</div>
      </div>

      <div class="sample scope-host">
        <strong>Wrapped by a global .scope-host</strong>
        <div class="scope-probe">Known leak</div>
      </div>
    </div>

    <SourceToggle :source="source" title="Show edge-case source" />
  </section>
</template>

<style scoped>
@scope (.scope-host) {
  .scope-probe {
    background: linear-gradient(135deg, #fb923c, #f97316);
    color: white;
    transform: translateY(-2px);
  }
}

.grid {
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.sample {
  padding: 1rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
}

.scope-probe {
  margin-top: 0.7rem;
  padding: 0.9rem;
  border-radius: 16px;
  background: rgba(148, 163, 184, 0.15);
  color: #334155;
  transition: 150ms ease;
}

.summary {
  color: #5b6784;
}
</style>
