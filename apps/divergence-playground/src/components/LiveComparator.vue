<script setup lang="ts">
import { ref, watch } from "vue";
import type { CompileComparison } from "../compiler";
import { compareScopedStyle } from "../compiler";
import CodePane from "./CodePane.vue";
import MonacoCssEditor from "./MonacoCssEditor.vue";

const props = defineProps<{
  initialSource: string;
}>();

const source = ref(props.initialSource);
const comparison = ref<CompileComparison | null>(null);
const loading = ref(false);

let sequence = 0;

async function refresh(nextSource: string) {
  const current = ++sequence;
  loading.value = true;

  const result = await compareScopedStyle(nextSource);
  if (current !== sequence) {
    return;
  }

  comparison.value = result;
  loading.value = false;
}

watch(
  source,
  (nextSource) => {
    void refresh(nextSource);
  },
  { immediate: true },
);
</script>

<template>
  <section class="live card" :class="comparison && (comparison.different ? 'different' : 'same')">
    <header class="header">
      <div>
        <p class="kind">Playground</p>
        <h2>Try your own scoped-style snippet</h2>
      </div>
      <span v-if="comparison" class="status" :class="{ same: !comparison.different }">
        {{ comparison.different ? "Different output" : "Same output" }}
      </span>
      <span v-else class="status pending">{{ loading ? "Compiling…" : "Idle" }}</span>
    </header>

    <p class="note">
      Enter a scoped style rule such as
      <code>:is(:deep(.foo)) { color: red; }</code>
      or a short nested block. The page compiles it with both style compilers and shows the output
      side by side.
    </p>

    <label class="editor">
      <span>Scoped style source</span>
      <MonacoCssEditor v-model="source" />
    </label>

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

.kind {
  margin: 0;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: #ad5f19;
}

.header h2 {
  margin: 0.25rem 0 0;
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
  color: #55617d;
  max-width: 74ch;
}

.editor {
  display: grid;
  gap: 0.55rem;
}

.editor span {
  font-weight: 700;
  color: #20304f;
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
