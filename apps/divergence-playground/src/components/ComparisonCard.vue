<script setup lang="ts">
import { computed } from "vue";
import type { CompileComparison } from "../compiler";
import CodePane from "./CodePane.vue";

const props = defineProps<{
  title: string;
  note: string;
  kind:
    | "likely-lightning-bug"
    | "likely-postcss-bug"
    | "needs-review"
    | "lightning-limit"
    | "shared-limit"
    | "agreement";
  comparison: CompileComparison | null;
  loading?: boolean;
}>();

const kindLabel = computed(() => {
  switch (props.kind) {
    case "likely-lightning-bug":
      return "Likely Lightning issue";
    case "likely-postcss-bug":
      return "Likely PostCSS issue";
    case "needs-review":
      return "Needs review";
    case "lightning-limit":
      return "Lightning limitation";
    case "shared-limit":
      return "Shared limitation";
    default:
      return "Compilers agree";
  }
});
</script>

<template>
  <section class="card" :class="comparison && (comparison.different ? 'different' : 'same')">
    <header class="header">
      <div class="title-group">
        <p class="kind">{{ kindLabel }}</p>
        <h2>{{ title }}</h2>
      </div>
      <span v-if="comparison" class="status" :class="{ same: !comparison.different }">
        {{ comparison.different ? "Different output" : "Same output" }}
      </span>
      <span v-else class="status pending">Compiling…</span>
    </header>

    <p class="note">{{ note }}</p>

    <div v-if="comparison" class="grid">
      <CodePane title="Source style" :code="comparison.source.code" />
      <CodePane
        title="PostCSS output"
        :code="comparison.postcss.code"
        :error="comparison.postcss.hasError"
      />
      <CodePane
        title="Lightning output"
        :code="comparison.lightning.code"
        :error="comparison.lightning.hasError"
      />
    </div>
  </section>
</template>

<style scoped>
.card {
  display: grid;
  gap: 1rem;
  padding: 1.2rem;
  border-radius: 18px;
  border: 1px solid rgba(210, 216, 231, 0.95);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.08);
}

.card.same {
  border-color: rgba(16, 185, 129, 0.28);
  background:
    linear-gradient(180deg, rgba(240, 253, 248, 0.95), rgba(255, 255, 255, 0.92) 28%),
    rgba(255, 255, 255, 0.84);
}

.card.different {
  border-color: rgba(245, 158, 11, 0.34);
  background:
    linear-gradient(180deg, rgba(255, 251, 235, 0.96), rgba(255, 255, 255, 0.92) 28%),
    rgba(255, 255, 255, 0.84);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 1rem;
}

.title-group {
  display: grid;
  gap: 0.3rem;
}

.kind {
  margin: 0;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: #ad5f19;
}

.title-group h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #16223e;
}

.status {
  flex: none;
  padding: 0.36rem 0.7rem;
  border-radius: 999px;
  background: rgba(185, 28, 28, 0.1);
  color: #b91c1c;
  font-size: 0.8rem;
  font-weight: 700;
}

.status.same {
  background: rgba(5, 150, 105, 0.12);
  color: #047857;
}

.status.pending {
  background: rgba(148, 163, 184, 0.18);
  color: #475569;
}

.note {
  margin: 0;
  max-width: 72ch;
  color: #55617d;
}

.grid {
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 980px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
