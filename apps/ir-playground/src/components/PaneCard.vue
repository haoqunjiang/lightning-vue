<script setup lang="ts">
import { computed } from "vue";
import { highlightCss, highlightText } from "../highlight";

const props = withDefaults(
  defineProps<{
    code: string;
    language?: "css" | "text";
    maxHeight?: number;
    minHeight?: number;
    title: string;
  }>(),
  {
    language: "text",
    maxHeight: 360,
    minHeight: 220,
  },
);

const highlighted = computed(() =>
  props.language === "css" ? highlightCss(props.code) : highlightText(props.code),
);
</script>

<template>
  <article class="pane">
    <header class="pane-header">
      <h3>{{ title }}</h3>
    </header>
    <pre
      :class="`language-${language === 'css' ? 'css' : 'text'}`"
      :style="{
        '--pane-max-height': `${maxHeight}px`,
        '--pane-min-height': `${minHeight}px`,
      }"
    ><code v-html="highlighted" /></pre>
  </article>
</template>

<style scoped>
.pane {
  display: grid;
  align-content: start;
  gap: 0.55rem;
  min-width: 0;
  padding: 1rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(34, 42, 57, 0.08);
  box-shadow: none;
}

.pane-header h3 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #202838;
}

pre {
  overflow: auto;
  margin: 0;
  padding: 0.9rem 0.95rem;
  border-radius: 9px;
  background: rgba(250, 250, 248, 0.94);
  border: 1px solid rgba(34, 42, 57, 0.08);
  font-size: 0.84rem;
  line-height: 1.55;
  min-height: var(--pane-min-height);
  max-height: var(--pane-max-height);
  box-sizing: border-box;
}

:deep(code) {
  font-family: "SFMono-Regular", ui-monospace, monospace;
}
</style>
