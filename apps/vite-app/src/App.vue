<script setup lang="ts">
import CommonPatterns from "./components/CommonPatterns.vue";
import DeepSlottedGlobal from "./components/DeepSlottedGlobal.vue";
import ScopeEdgeCase from "./components/ScopeEdgeCase.vue";
import commonPatternsSource from "./components/CommonPatterns.vue?raw";
import deepSlottedGlobalSource from "./components/DeepSlottedGlobal.vue?raw";
import scopeEdgeCaseSource from "./components/ScopeEdgeCase.vue?raw";
</script>

<template>
  <main class="page">
    <header class="hero">
      <p class="eyebrow">Example app</p>
      <h1>Vite + plugin-vue using <code>@lightning-vue/compiler</code></h1>
      <p class="lede">
        This example app highlights common <code>&lt;style scoped&gt;</code> patterns and keeps one
        current limitation visible so developers can judge the tradeoffs in a real page.
      </p>
    </header>

    <CommonPatterns :source="commonPatternsSource" />

    <DeepSlottedGlobal :source="deepSlottedGlobalSource">
      <span class="slotted-pill">Slot target</span>
    </DeepSlottedGlobal>

    <ScopeEdgeCase :source="scopeEdgeCaseSource" />
  </main>
</template>

<style>
:root {
  color-scheme: light;
  font-family: "Avenir Next", "Segoe UI", system-ui, sans-serif;
  background: linear-gradient(180deg, #f7f8fb, #eef2f7 40%, #edf4f5);
}

body {
  margin: 0;
}

#app {
  min-height: 100vh;
}

.page {
  width: min(1100px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0 3rem;
}

.hero {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 1rem;
  padding: 0.1rem 0 0.55rem;
}

.eyebrow {
  margin: 0;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: #99582a;
}

.hero h1 {
  margin: 0;
  max-width: 20ch;
  font-size: clamp(1.55rem, 2.4vw, 2.15rem);
  line-height: 1;
  color: #16233d;
}

.lede {
  max-width: 64ch;
  margin: 0;
  color: #55617d;
}

.card {
  margin-top: 1rem;
  padding: 1.2rem;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.42), transparent 36%),
    rgba(255, 255, 255, 0.62);
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
}

.card h2 {
  margin: 0.1rem 0 0.5rem;
  color: #16233d;
}

.card code {
  font-family: "SFMono-Regular", ui-monospace, monospace;
}
</style>
