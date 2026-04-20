<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { CompileComparison } from "./compiler";
import { compareScopedStyle } from "./compiler";
import { curatedCases, defaultPlaygroundSource } from "./cases";
import ComparisonCard from "./components/ComparisonCard.vue";
import LiveComparator from "./components/LiveComparator.vue";

const comparisons = ref<Array<CompileComparison | null>>(curatedCases.map(() => null));

onMounted(async () => {
  comparisons.value = await Promise.all(
    curatedCases.map((item) => compareScopedStyle(item.source)),
  );
});
</script>

<template>
  <main class="page">
    <header class="hero">
      <p class="eyebrow">Scoped style comparison</p>
      <h1>Compare scoped style output side by side</h1>
      <p class="lede">
        This page compares how the current Vue PostCSS compiler and
        <code>@lightning-vue/compiler</code> compile the same scoped style snippets. Each section
        shows the authored style and both compiled outputs.
      </p>
    </header>

    <section class="summary card">
      <p>
        The gallery starts with a small set of cases that are useful to inspect directly, including
        a few agreement cases where both compilers produce the same result. At the bottom of the
        page, you can try your own snippet and compare both outputs live.
      </p>
    </section>

    <section class="stack">
      <ComparisonCard
        v-for="(item, index) in curatedCases"
        :key="item.title"
        :title="item.title"
        :note="item.note"
        :kind="item.kind"
        :comparison="comparisons[index]"
      />
    </section>

    <LiveComparator :initial-source="defaultPlaygroundSource" />
  </main>
</template>

<style>
:root {
  color-scheme: light;
  font-family:
    system-ui,
    -apple-system,
    "Segoe UI",
    sans-serif;
  background: #f6f8fb;
}

body {
  margin: 0;
  color: #14213d;
}

#app {
  min-height: 100vh;
}

code {
  font-family: "SFMono-Regular", ui-monospace, monospace;
}

.page {
  width: min(1260px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.75rem 0 3rem;
}

.hero {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.eyebrow {
  margin: 0;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: #ad5f19;
}

.hero h1 {
  margin: 0;
  font-size: clamp(1.7rem, 2.3vw, 2.25rem);
  line-height: 1.03;
  color: #16233d;
}

.lede {
  max-width: 86ch;
  margin: 0;
  color: #55617d;
}

.card {
  padding: 1rem 1.2rem;
  border-radius: 18px;
  border: 1px solid rgba(216, 223, 236, 0.95);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.04);
}

.summary {
  margin-bottom: 1rem;
  color: #475569;
}

.summary p {
  margin: 0;
}

.stack {
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
}
</style>
