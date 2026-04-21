<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { CompileComparison } from "./compiler";
import { compareScopedStyle } from "./compiler";
import { curatedCases, defaultPlaygroundSource } from "./cases";
import CodePane from "./components/CodePane.vue";
import MonacoCssEditor from "./components/MonacoCssEditor.vue";
import ReferenceCaseCard from "./components/ReferenceCaseCard.vue";

type CaseKind =
  | "likely-lightning-bug"
  | "correctness-win"
  | "needs-review"
  | "lightning-limit"
  | "shared-limit"
  | "agreement";

const CASE_GROUPS: Array<{
  kind: CaseKind;
  label: string;
  summary: string;
}> = [
  {
    kind: "likely-lightning-bug",
    label: "Likely compiler bugs",
    summary: "Selectors that still look wrong on the lightning-vue compiler path.",
  },
  {
    kind: "correctness-win",
    label: "Correctness wins",
    summary:
      "Cases where the lightning-vue compiler spends extra work to keep scoped semantics intact.",
  },
  {
    kind: "needs-review",
    label: "Needs review",
    summary: "Cases that still need a stronger semantic call.",
  },
  {
    kind: "lightning-limit",
    label: "Known compiler limits",
    summary: "Deliberate tradeoffs and edges we still carry for now.",
  },
  {
    kind: "shared-limit",
    label: "Shared limits",
    summary: "Selectors both compilers still stop short on.",
  },
  {
    kind: "agreement",
    label: "Agreement checks",
    summary: "Reference cases where the two compilers already line up.",
  },
];

const comparison = ref<CompileComparison | null>(null);
const loading = ref(false);
const playgroundSource = ref(defaultPlaygroundSource);
const playgroundOrigin = ref<string | null>(null);
const playgroundRoot = ref<HTMLElement | null>(null);

let sequence = 0;

const groupedCases = computed(() =>
  CASE_GROUPS.map((group) => ({
    ...group,
    items: curatedCases.filter((item) => item.kind === group.kind),
  })).filter((group) => group.items.length),
);

const loadedCase = computed(() =>
  playgroundOrigin.value
    ? (curatedCases.find((item) => item.title === playgroundOrigin.value) ?? null)
    : null,
);

const playgroundHeading = computed(() =>
  loadedCase.value ? loadedCase.value.title : "Scratch draft",
);

const playgroundContext = computed(() => {
  if (loadedCase.value) {
    return "Opened from the gallery. Edits stay local to the playground.";
  }

  return "Type your own source or open a case from the gallery above.";
});

const resultTone = computed(() => {
  if (!comparison.value) {
    return "pending";
  }

  return comparison.value.different ? "different" : "same";
});

const resultHeadline = computed(() => {
  if (!comparison.value) {
    return loading.value ? "Compiling…" : "Waiting for input";
  }

  return comparison.value.different ? "Outputs diverge" : "Outputs line up";
});

const resultContext = computed(() => {
  if (!comparison.value) {
    return "Both compilers rerun on each edit.";
  }

  if (comparison.value.postcss.hasError || comparison.value.lightning.hasError) {
    return "At least one compiler failed on this source.";
  }

  return comparison.value.different
    ? "The two compilers serialize this source differently."
    : "Both compilers land on the same normalized CSS.";
});

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

function openCaseInPlayground(title: string) {
  const item = curatedCases.find((entry) => entry.title === title);
  if (!item) {
    return;
  }

  playgroundSource.value = item.source;
  playgroundOrigin.value = item.title;
  void nextTick(() => {
    playgroundRoot.value?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

function resetPlayground() {
  playgroundSource.value = defaultPlaygroundSource;
  playgroundOrigin.value = null;
}

watch(
  playgroundSource,
  (nextSource) => {
    void refresh(nextSource);
  },
  { immediate: true },
);
</script>

<template>
  <main class="page">
    <header class="hero">
      <h1>Scoped CSS divergence</h1>
      <p class="lede">A visual index of the main drifts, limits, and correctness wins.</p>
    </header>

    <section class="gallery-shell">
      <header class="section-head">
        <div class="section-copy">
          <h2>Gallery</h2>
          <p>Representative cases from the README and regression suite. Open any card below.</p>
        </div>
      </header>

      <div class="gallery-groups">
        <section v-for="group in groupedCases" :key="group.kind" class="group">
          <header class="group-head">
            <h3>{{ group.label }}</h3>
            <p>{{ group.summary }}</p>
          </header>

          <div class="gallery-grid">
            <ReferenceCaseCard
              v-for="item in group.items"
              :key="item.title"
              :title="item.title"
              :note="item.note"
              :source="item.source"
              :kind="item.kind"
              :active="playgroundOrigin === item.title"
              @open="openCaseInPlayground(item.title)"
            />
          </div>
        </section>
      </div>
    </section>

    <section ref="playgroundRoot" class="playground-shell">
      <header class="section-head">
        <div class="section-copy">
          <h2>Playground</h2>
          <p>One editable source, two compiled outputs.</p>
        </div>
      </header>

      <section class="playground-card">
        <header class="panel-head">
          <div class="panel-copy">
            <div class="source-state">
              <span class="source-chip" :class="{ accent: !!loadedCase }">
                {{ loadedCase ? "From gallery" : "Draft" }}
              </span>
            </div>
            <h3>{{ playgroundHeading }}</h3>
            <p>{{ playgroundContext }}</p>
          </div>
          <button v-if="loadedCase" class="subtle-button" type="button" @click="resetPlayground">
            Start blank
          </button>
        </header>

        <MonacoCssEditor v-model="playgroundSource" :min-height="124" />
      </section>

      <section class="results-card" :class="resultTone">
        <header class="panel-head">
          <div>
            <h3>{{ resultHeadline }}</h3>
            <p>{{ resultContext }}</p>
          </div>
          <span class="result-pill" :class="resultTone">
            {{
              comparison
                ? comparison.different
                  ? "Diverges"
                  : "Matches"
                : loading
                  ? "Working"
                  : "Idle"
            }}
          </span>
        </header>

        <div v-if="comparison" class="output-grid">
          <CodePane
            title="Vue compiler (PostCSS)"
            :code="comparison.postcss.code"
            :error="comparison.postcss.hasError"
          />
          <CodePane
            title="@lightning-vue/compiler"
            :code="comparison.lightning.code"
            :error="comparison.lightning.hasError"
          />
        </div>
      </section>
    </section>
  </main>
</template>

<style>
:root {
  color-scheme: light;
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono:
    ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  --lv-bg-canvas: oklch(0.982 0.005 210);
  --lv-surface-base: oklch(0.994 0.003 180);
  --lv-surface-raised: oklch(0.99 0.004 190);
  --lv-surface-playground: oklch(0.992 0.007 198);
  --lv-surface-code: oklch(0.982 0.005 230);
  --lv-border-soft: oklch(0.89 0.012 245 / 0.88);
  --lv-border-strong: oklch(0.83 0.02 242 / 0.96);
  --lv-text-strong: oklch(0.28 0.03 252);
  --lv-text-body: oklch(0.44 0.022 249);
  --lv-text-soft: oklch(0.56 0.018 246);
  --lv-interactive: oklch(0.58 0.14 240);
  --lv-interactive-soft: oklch(0.95 0.03 238);
  --lv-win-border: oklch(0.78 0.12 161 / 0.95);
  --lv-win-surface-top: oklch(0.985 0.03 160);
  --lv-win-surface-bottom: oklch(0.977 0.02 164);
  --lv-win-chip-bg: oklch(0.93 0.05 160);
  --lv-win-chip-text: oklch(0.46 0.11 162);
  --lv-bug-border: oklch(0.73 0.13 42 / 0.92);
  --lv-bug-surface-top: oklch(0.98 0.026 42);
  --lv-bug-surface-bottom: oklch(0.974 0.018 40);
  --lv-bug-chip-bg: oklch(0.935 0.04 42);
  --lv-bug-chip-text: oklch(0.53 0.13 40);
  --lv-review-border: oklch(0.82 0.11 86 / 0.92);
  --lv-review-surface-top: oklch(0.986 0.025 90);
  --lv-review-surface-bottom: oklch(0.98 0.018 92);
  --lv-review-chip-bg: oklch(0.95 0.038 90);
  --lv-review-chip-text: oklch(0.54 0.11 86);
  --lv-limit-border: oklch(0.84 0.04 78 / 0.92);
  --lv-limit-surface-top: oklch(0.987 0.015 80);
  --lv-limit-surface-bottom: oklch(0.981 0.012 82);
  --lv-limit-chip-bg: oklch(0.95 0.02 80);
  --lv-limit-chip-text: oklch(0.47 0.06 72);
  --lv-agreement-border: var(--lv-border-soft);
  --lv-agreement-surface-top: var(--lv-surface-base);
  --lv-agreement-surface-bottom: oklch(0.992 0.004 200);
  --lv-agreement-chip-bg: oklch(0.95 0.008 240);
  --lv-agreement-chip-text: oklch(0.52 0.016 244);
  --lv-shadow-soft: 0 1px 1px oklch(0.27 0.02 252 / 0.04), 0 10px 22px oklch(0.27 0.02 252 / 0.03);
  --lv-shadow-strong:
    0 1px 1px oklch(0.27 0.02 252 / 0.05), 0 14px 28px oklch(0.27 0.02 252 / 0.05);
  font-family: var(--font-sans);
  background: linear-gradient(
    180deg,
    oklch(0.987 0.01 165),
    oklch(0.984 0.007 188) 14rem,
    var(--lv-bg-canvas) 28rem
  );
}

body {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--lv-text-strong);
  background: transparent;
}

#app {
  min-height: 100vh;
}

code {
  font-family: var(--font-mono);
}

button,
select {
  font: inherit;
}

.page {
  width: min(1440px, calc(100% - clamp(3rem, 4vw, 5rem)));
  margin: 0 auto;
  padding: 1.5rem 0 3.2rem;
}

.hero {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1.85rem;
  padding: 0.15rem 0 0.1rem;
}

.hero h1,
.section-copy h2,
.group-head h3,
.panel-head h3 {
  margin: 0;
  font-family: var(--font-sans);
  letter-spacing: -0.028em;
  color: var(--lv-text-strong);
  font-weight: 600;
}

.hero h1 {
  font-size: clamp(2.45rem, 3.5vw, 3.65rem);
  line-height: 0.95;
  max-width: none;
}

.lede {
  max-width: 62ch;
  margin: 0;
  color: var(--lv-text-body);
  font-size: 1rem;
  line-height: 1.55;
}

.section-copy p,
.group-head p,
.panel-head p {
  margin: 0;
  color: var(--lv-text-body);
  font-size: 0.93rem;
  line-height: 1.48;
}

.gallery-shell,
.playground-shell {
  display: grid;
  gap: 0.95rem;
}

.gallery-shell {
  margin-bottom: 2.6rem;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 1rem;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid var(--lv-border-soft);
}

.section-copy {
  display: grid;
  gap: 0.26rem;
}

.section-copy h2 {
  font-size: 1.72rem;
}

.gallery-groups {
  display: grid;
  gap: 1.5rem;
}

.group {
  display: grid;
  gap: 0.9rem;
}

.group-head {
  display: grid;
  gap: 0.16rem;
}

.group-head h3 {
  font-size: 1.24rem;
}

.gallery-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.playground-shell {
  gap: 1rem;
}

.playground-card,
.results-card {
  display: grid;
  gap: 0.95rem;
  padding: 1.05rem;
  border-radius: 16px;
  border: 1px solid var(--lv-border-soft);
  background: var(--lv-surface-playground);
  box-shadow: var(--lv-shadow-soft);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 1rem;
}

.panel-copy {
  display: grid;
  gap: 0.35rem;
}

.panel-head h3 {
  font-size: 1.18rem;
}

.source-state {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.source-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.32rem 0.62rem;
  border-radius: 999px;
  background: var(--lv-agreement-chip-bg);
  color: var(--lv-agreement-chip-text);
  font-size: 0.78rem;
  font-weight: 500;
}

.source-chip.accent {
  background: var(--lv-interactive-soft);
  color: var(--lv-interactive);
}

.subtle-button {
  flex: none;
  padding: 0.62rem 0.86rem;
  border-radius: 999px;
  border: 1px solid var(--lv-border-soft);
  background: var(--lv-surface-base);
  color: var(--lv-interactive);
  cursor: pointer;
  font-weight: 500;
}

.subtle-button:hover {
  background: oklch(0.997 0.003 190);
}

.results-card.same {
  border-color: var(--lv-win-border);
  background: oklch(0.99 0.013 164);
}

.results-card.different {
  border-color: var(--lv-bug-border);
  background: oklch(0.989 0.014 42);
}

.result-pill {
  flex: none;
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.68rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--lv-agreement-chip-text);
  background: var(--lv-agreement-chip-bg);
}

.result-pill.same {
  color: var(--lv-win-chip-text);
  background: var(--lv-win-chip-bg);
}

.result-pill.different {
  color: var(--lv-bug-chip-text);
  background: var(--lv-bug-chip-bg);
}

.output-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(320px, 1fr));
}

@media (max-width: 1080px) {
  .gallery-grid,
  .output-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .page {
    width: min(100%, calc(100% - 2rem));
  }

  .section-head,
  .panel-head {
    display: grid;
    gap: 0.9rem;
  }
}
</style>
