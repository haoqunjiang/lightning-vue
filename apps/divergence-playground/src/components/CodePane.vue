<script setup lang="ts">
import { computed } from "vue";
import { highlightCss, highlightText } from "../highlight";

const props = defineProps<{
  title: string;
  code: string;
  error?: boolean;
}>();

const highlighted = computed(() =>
  props.error ? highlightText(props.code || "No output") : highlightCss(props.code || "No output"),
);
</script>

<template>
  <article class="pane" :class="{ error }">
    <header class="pane-header">
      <h3>{{ title }}</h3>
      <span v-if="error" class="error-tag">Error</span>
    </header>
    <pre class="language-css"><code v-html="highlighted" /></pre>
  </article>
</template>

<style scoped>
.pane {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0.65rem;
  min-width: 0;
  min-height: 300px;
  padding: 0.95rem;
  border-radius: 12px;
  background: oklch(0.996 0.003 190 / 0.96);
  border: 1px solid var(--lv-border-soft);
  box-shadow: 0 1px 1px oklch(0.27 0.02 252 / 0.03);
}

.pane.error {
  border-color: var(--lv-bug-border);
  background: var(--lv-bug-surface-top);
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.pane-header h3 {
  margin: 0;
  font-size: 0.96rem;
  color: var(--lv-text-strong);
  font-weight: 500;
}

.error-tag {
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: var(--lv-bug-chip-bg);
  color: var(--lv-bug-chip-text);
  font-size: 0.74rem;
  font-weight: 600;
}

pre {
  overflow: auto;
  margin: 0;
  padding: 0.95rem;
  border-radius: 10px;
  background: var(--lv-surface-code);
  border: 1px solid var(--lv-border-soft);
  font-size: 0.84rem;
  line-height: 1.55;
  min-height: 0;
  max-height: 360px;
}

:deep(code) {
  font-family: "SFMono-Regular", ui-monospace, monospace;
}
</style>
