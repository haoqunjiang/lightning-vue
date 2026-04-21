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
  | "likely-postcss-bug"
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
    label: "Likely Lightning issues",
    summary: "Selectors that still look wrong on the Lightning path.",
  },
  {
    kind: "likely-postcss-bug",
    label: "Likely Vue compiler issues",
    summary: "Cases where the older PostCSS path seems to be the odd one out.",
  },
  {
    kind: "needs-review",
    label: "Needs review",
    summary: "Cases that still need a stronger semantic call.",
  },
  {
    kind: "lightning-limit",
    label: "Known Lightning limits",
    summary: "Gaps we are intentionally carrying for now.",
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
      <p class="lede">Read the documented cases, then open one in the playground below.</p>
    </header>

    <section class="gallery-shell">
      <header class="section-head">
        <div class="section-copy">
          <h2>Gallery</h2>
          <p>Documented cases. Click a card to load that source into the playground.</p>
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
            title="Lightning compiler"
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
  font-family: var(--font-sans);
  background: #edf2f8;
}

body {
  margin: 0;
  color: #162238;
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
  width: min(1480px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.75rem 0 3.2rem;
}

.hero {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 2.2rem;
  padding: 0.2rem 0 0.25rem;
}

.hero h1,
.section-copy h2,
.group-head h3,
.panel-head h3 {
  margin: 0;
  font-family: var(--font-sans);
  letter-spacing: -0.028em;
  color: #13213a;
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
  color: #50607a;
  font-size: 1.04rem;
  line-height: 1.58;
}

.section-copy p,
.group-head p,
.panel-head p {
  margin: 0;
  color: #5b6983;
  line-height: 1.5;
}

.gallery-shell,
.playground-shell {
  display: grid;
  gap: 1.1rem;
}

.gallery-shell {
  margin-bottom: 2.4rem;
  padding: 1.25rem;
  border-radius: 28px;
  border: 1px solid rgba(211, 218, 231, 0.9);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 42px rgba(31, 48, 79, 0.045);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 1rem;
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
  gap: 1.2rem;
}

.group {
  display: grid;
  gap: 0.85rem;
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
  padding: 1.25rem;
  border-radius: 28px;
  border: 1px solid rgba(192, 205, 228, 0.95);
  background: linear-gradient(180deg, rgba(245, 249, 255, 0.98), rgba(239, 245, 252, 0.96));
  box-shadow: 0 24px 54px rgba(37, 59, 97, 0.07);
}

.playground-card,
.results-card {
  display: grid;
  gap: 0.95rem;
  padding: 1.05rem;
  border-radius: 22px;
  border: 1px solid rgba(197, 207, 226, 0.92);
  background: rgba(255, 255, 255, 0.96);
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
  background: rgba(101, 118, 149, 0.1);
  color: #53627b;
  font-size: 0.78rem;
  font-weight: 500;
}

.source-chip.accent {
  background: rgba(56, 105, 181, 0.12);
  color: #24539a;
}

.subtle-button {
  flex: none;
  padding: 0.62rem 0.86rem;
  border-radius: 999px;
  border: 1px solid rgba(185, 197, 220, 0.98);
  background: rgba(250, 252, 255, 0.96);
  color: #1f3152;
  cursor: pointer;
  font-weight: 500;
}

.subtle-button:hover {
  background: white;
}

.results-card.same {
  border-color: rgba(18, 150, 136, 0.28);
  background: rgba(244, 252, 250, 0.98);
}

.results-card.different {
  border-color: rgba(186, 103, 41, 0.32);
  background: rgba(255, 249, 242, 0.98);
}

.result-pill {
  flex: none;
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.68rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #56657d;
  background: rgba(183, 194, 211, 0.26);
}

.result-pill.same {
  color: #0f766e;
  background: rgba(13, 148, 136, 0.16);
}

.result-pill.different {
  color: #b45309;
  background: rgba(245, 158, 11, 0.18);
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
    width: min(100%, calc(100% - 1rem));
  }

  .section-head,
  .panel-head {
    display: grid;
    gap: 0.9rem;
  }
}
</style>
