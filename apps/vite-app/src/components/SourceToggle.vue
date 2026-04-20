<script setup lang="ts">
defineProps<{
  source: string;
  title?: string;
}>();
</script>

<template>
  <details class="source-toggle">
    <summary>{{ title || "Show source" }}</summary>
    <pre><code>{{ source }}</code></pre>
  </details>
</template>

<style scoped>
.source-toggle {
  margin-top: 1rem;
  border-top: 1px solid rgba(91, 104, 166, 0.14);
  padding-top: 0.85rem;

  summary {
    cursor: pointer;
    width: fit-content;
    font-weight: 700;
    color: #28416b;
  }

  pre {
    overflow-x: auto;
    margin: 0.85rem 0 0;
    padding: 1rem;
    border-radius: 16px;
    background: #10182b;
    color: #e6ecff;
    font-size: 0.86rem;
    line-height: 1.5;
  }

  code {
    font-family: "SFMono-Regular", ui-monospace, monospace;
  }
}
</style>
