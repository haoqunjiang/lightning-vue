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
  align-content: start;
  gap: 0.65rem;
  min-width: 0;
  padding: 0.95rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(196, 205, 227, 0.75);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
}

.pane.error {
  border-color: rgba(220, 38, 38, 0.22);
  background: rgba(255, 248, 248, 0.95);
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.pane-header h3 {
  margin: 0;
  font-size: 0.95rem;
  color: #17243f;
}

.error-tag {
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
  font-size: 0.74rem;
  font-weight: 700;
}

pre {
  overflow: auto;
  margin: 0;
  padding: 0.9rem;
  border-radius: 12px;
  background: #fbfcfe;
  border: 1px solid rgba(216, 222, 238, 0.85);
  font-size: 0.84rem;
  line-height: 1.55;
}

:deep(code) {
  font-family: "SFMono-Regular", ui-monospace, monospace;
}
</style>
