<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  formatNestingNormalizationTrace,
  nestingNormalizationTraceCases,
  traceNestingNormalization,
  type TracedNestedBlockInstructions,
} from "@lightning-vue/compiler/debug/nesting";
import {
  formatScopedSelectorTrace,
  scopedSelectorTraceCases,
  traceScopedSelector,
} from "@lightning-vue/compiler/debug/scopedSelector";
import { compileScopedStyle } from "./compiler";
import MonacoTextEditor from "./components/MonacoTextEditor.vue";
import PaneCard from "./components/PaneCard.vue";

type ScopeInjectMode = "normal" | "none" | "slot";
type SelectorInputMode = "suggested" | "custom";
type SelectorStageView = "trace" | "final";
type NestingStageView = "prepared" | "instructions";

interface CompileCase {
  focusedSelector: string;
  source: string;
  title: string;
}

interface CompileResultState {
  code: string;
  error: string | null;
  hasError: boolean;
  pending: boolean;
}

interface LegendItem {
  detail: string;
  label: string;
}

const compileCases: CompileCase[] = [
  {
    title: "simple scoped selector flow",
    source: `.card .title { color: red; }`,
    focusedSelector: ".card .title",
  },
  {
    title: "nested declarations and child rules",
    source: `.card {
  color: red;
  .title { color: blue; }
}`,
    focusedSelector: ".card",
  },
  {
    title: "outer deep context",
    source: `:deep(.shell) {
  color: red;
  .title { color: blue; }
}`,
    focusedSelector: ".shell",
  },
  {
    title: "css vars and animation output",
    source: `.card {
  color: v-bind(themeColor);
  animation: fade 1s;
}
@keyframes fade {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
    focusedSelector: ".card",
  },
];

const initialCompileCase = compileCases[0];

const compileSource = ref(initialCompileCase?.source ?? ".card { color: red; }");
const compileSelectedSelector = ref(initialCompileCase?.focusedSelector ?? ".card");
const compileManualSelector = ref(initialCompileCase?.focusedSelector ?? ".card");
const compileSelectorInputMode = ref<SelectorInputMode>("suggested");
const compileNestingView = ref<NestingStageView>("prepared");
const compileSelectorView = ref<SelectorStageView>("trace");

const selectorSource = ref(scopedSelectorTraceCases[0]?.selector ?? ".card");
const selectorInjectMode = ref<ScopeInjectMode>("normal");
const nestingSource = ref(nestingNormalizationTraceCases[0]?.source ?? ".card { color: red; }");

const compileResult = ref<CompileResultState>({
  code: "",
  error: null,
  hasError: false,
  pending: true,
});

watch(
  compileSource,
  (source, _previousSource, onCleanup) => {
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });

    compileResult.value = {
      code: "",
      error: null,
      hasError: false,
      pending: true,
    };

    compileScopedStyle(source)
      .then((result) => {
        if (cancelled) {
          return;
        }

        compileResult.value = {
          code: result.code,
          error: null,
          hasError: result.hasError,
          pending: false,
        };
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        compileResult.value = {
          code: "",
          error: error instanceof Error ? error.message : String(error),
          hasError: true,
          pending: false,
        };
      });
  },
  { immediate: true },
);

const compileNestingTraceResult = computed(() => {
  try {
    const trace = traceNestingNormalization(compileSource.value);
    return {
      error: null as string | null,
      trace,
      traceText: formatNestingNormalizationTrace(trace),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      trace: null,
      traceText: "",
    };
  }
});

const compileSelectorSuggestions = computed(() => {
  const trace = compileNestingTraceResult.value.trace;
  if (!trace) {
    return [];
  }

  const selectors: string[] = [];
  const seen = new Set<string>();

  const visit = (node: TracedNestedBlockInstructions) => {
    const selector = extractStyleSelector(node.block);
    if (selector && !seen.has(selector)) {
      seen.add(selector);
      selectors.push(selector);
    }

    for (const child of node.children) {
      visit(child);
    }
  };

  for (const node of trace.instructions) {
    visit(node);
  }

  return selectors;
});

watch(
  compileSelectorSuggestions,
  (selectors) => {
    if (compileSelectorInputMode.value === "custom") {
      return;
    }

    if (selectors.length === 0) {
      compileSelectedSelector.value = "";
      return;
    }

    if (!selectors.includes(compileSelectedSelector.value)) {
      compileSelectedSelector.value = selectors[0];
    }
  },
  { immediate: true },
);

const compileInspectedSelector = computed(() =>
  (compileSelectorInputMode.value === "custom"
    ? compileManualSelector.value
    : compileSelectedSelector.value
  ).trim(),
);

const compileScopedTraceResult = computed(() => {
  const selector = compileInspectedSelector.value;

  if (!selector) {
    return {
      error: null as string | null,
      trace: null,
      traceText: "",
    };
  }

  try {
    const trace = traceScopedSelector(selector, "normal");
    return {
      error: null as string | null,
      trace,
      traceText: formatScopedSelectorTrace(trace),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      trace: null,
      traceText: "",
    };
  }
});

const compileNestingLegend = computed(() =>
  createNestingLegend(compileNestingTraceResult.value.trace),
);

const compileSelectorSummary = computed(() => {
  if (!compileInspectedSelector.value) {
    return "No selector is available yet.";
  }

  if (compileSelectorInputMode.value === "custom") {
    return `Tracing ${compileInspectedSelector.value} as a custom selector sample.`;
  }

  return `Tracing ${compileInspectedSelector.value} from the current source. The selector trace runs in isolation, not as a whole rule replay.`;
});

const compileResultTitle = computed(() => {
  if (compileResult.value.pending) {
    return "Final compiled CSS";
  }

  if (compileResult.value.error) {
    return "Compile error";
  }

  return compileResult.value.hasError ? "Compile output (errors)" : "Final compiled CSS";
});

const compileResultCode = computed(() => {
  if (compileResult.value.pending) {
    return "Compiling...";
  }

  if (compileResult.value.error) {
    return compileResult.value.error;
  }

  return compileResult.value.code;
});

const compileResultLanguage = computed(() =>
  compileResult.value.pending || compileResult.value.error || compileResult.value.hasError
    ? "text"
    : "css",
);

const scopedTraceResult = computed(() => {
  try {
    const trace = traceScopedSelector(selectorSource.value, selectorInjectMode.value);
    return {
      error: null as string | null,
      trace,
      traceText: formatScopedSelectorTrace(trace),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      trace: null,
      traceText: "",
    };
  }
});

const nestingTraceResult = computed(() => {
  try {
    const trace = traceNestingNormalization(nestingSource.value);
    return {
      error: null as string | null,
      trace,
      traceText: formatNestingNormalizationTrace(trace),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      trace: null,
      traceText: "",
    };
  }
});

const nestingLegend = computed(() => createNestingLegend(nestingTraceResult.value.trace));

const activeScopedCaseTitle = computed(
  () =>
    scopedSelectorTraceCases.find(
      (item) =>
        item.selector === selectorSource.value &&
        (item.injectMode ?? "normal") === selectorInjectMode.value,
    )?.title ??
    scopedSelectorTraceCases[0]?.title ??
    "",
);

const activeNestingCaseTitle = computed(
  () =>
    nestingNormalizationTraceCases.find((item) => item.source === nestingSource.value)?.title ??
    nestingNormalizationTraceCases[0]?.title ??
    "",
);

function createNestingLegend(trace: { normalizedCode: string } | null): LegendItem[] {
  if (!trace) {
    return [];
  }

  const items: LegendItem[] = [
    {
      label: ":global(.x)",
      detail:
        "Acts as a temporary no-inject carrier here. It marks a nesting boundary, not final global behavior.",
    },
    {
      label: ":global(&)",
      detail:
        "Makes a declaration wrapper explicit while keeping scope injection off the wrapper rule itself.",
    },
    {
      label: "disableCurrentRuleInjection=true",
      detail:
        "The current rule becomes boundary-only. The wrapper or descendants receive the real scope attribute.",
    },
    {
      label: "childStyleContext / childAtRuleContext",
      detail:
        "Shows which context descendants inherit. Conditional wrappers usually preserve the current context.",
    },
  ];

  return items.filter((item) => {
    if (item.label === ":global(.x)") {
      return trace.normalizedCode.includes(":global(");
    }

    if (item.label === ":global(&)") {
      return trace.normalizedCode.includes(":global(&)");
    }

    return true;
  });
}

function extractStyleSelector(blockLabel: string): string | null {
  const match = /^style\s+"([\s\S]*)"$/.exec(blockLabel);
  return match?.[1] ?? null;
}

function applyCompileCase(title: string) {
  const match = compileCases.find((item) => item.title === title);
  if (!match) {
    return;
  }

  compileSource.value = match.source;
  compileSelectedSelector.value = match.focusedSelector;
  compileManualSelector.value = match.focusedSelector;
  compileSelectorInputMode.value = "suggested";
}

function chooseCompileSelector(selector: string) {
  compileSelectedSelector.value = selector;
  compileSelectorInputMode.value = "suggested";
}

function enableCompileCustomSelector() {
  if (!compileManualSelector.value) {
    compileManualSelector.value = compileSelectedSelector.value;
  }

  compileSelectorInputMode.value = "custom";
}

function useSuggestedCompileSelectors() {
  compileSelectorInputMode.value = "suggested";
}

function applyScopedCase(title: string) {
  const match = scopedSelectorTraceCases.find((item) => item.title === title);
  if (!match) {
    return;
  }

  selectorSource.value = match.selector;
  selectorInjectMode.value = match.injectMode ?? "normal";
}

function applyNestingCase(title: string) {
  const match = nestingNormalizationTraceCases.find((item) => item.title === title);
  if (!match) {
    return;
  }

  nestingSource.value = match.source;
}
</script>

<template>
  <main class="page">
    <header class="hero">
      <h1>Scoped style playground</h1>
      <p class="lede">
        Edit a style, then inspect what nesting normalization hands to scoping, how one selector is
        rewritten, and what CSS the compiler finally emits.
      </p>
    </header>

    <section class="card source-stage">
      <header class="section-header">
        <div>
          <p class="section-kind">Source</p>
          <h2>Start with a style</h2>
          <p class="section-copy">Choose an example or edit the source directly.</p>
        </div>
      </header>

      <div class="pill-row">
        <button
          v-for="item in compileCases"
          :key="item.title"
          type="button"
          class="pill"
          :class="{ active: compileSource === item.source }"
          @click="applyCompileCase(item.title)"
        >
          {{ item.title }}
        </button>
      </div>

      <MonacoTextEditor v-model="compileSource" language="css" :min-height="220" />
    </section>

    <section class="walkthrough-grid">
      <article class="card stage">
        <header class="stage-header">
          <div>
            <p class="section-kind">Step 1</p>
            <h2>Normalization</h2>
            <p class="section-copy">How nesting is rewritten before selector scoping begins.</p>
          </div>
          <div class="segment">
            <button
              type="button"
              :class="{ active: compileNestingView === 'prepared' }"
              @click="compileNestingView = 'prepared'"
            >
              CSS
            </button>
            <button
              type="button"
              :class="{ active: compileNestingView === 'instructions' }"
              @click="compileNestingView = 'instructions'"
            >
              Trace
            </button>
          </div>
        </header>

        <PaneCard
          v-if="compileNestingTraceResult.trace && compileNestingView === 'prepared'"
          title="Normalized CSS"
          :code="compileNestingTraceResult.trace.normalizedCode"
          language="css"
          :min-height="220"
          :max-height="340"
        />
        <PaneCard
          v-else-if="compileNestingTraceResult.trace"
          title="Normalization trace"
          :code="compileNestingTraceResult.traceText"
          :min-height="220"
          :max-height="340"
        />
        <PaneCard
          v-if="compileNestingTraceResult.error"
          title="Nested normalization error"
          :code="compileNestingTraceResult.error"
        />

        <details v-if="compileNestingLegend.length > 0" class="inline-help">
          <summary>What these markers mean</summary>
          <ul>
            <li v-for="item in compileNestingLegend" :key="item.label">
              <span class="note-term">{{ item.label }}</span>
              {{ item.detail }}
            </li>
          </ul>
        </details>
      </article>

      <article class="card stage">
        <header class="stage-header">
          <div>
            <p class="section-kind">Step 2</p>
            <h2>Selector inspector</h2>
            <p class="section-copy">Inspect one selector from the current style on its own.</p>
          </div>
          <div class="segment">
            <button
              type="button"
              :class="{ active: compileSelectorView === 'trace' }"
              @click="compileSelectorView = 'trace'"
            >
              IR
            </button>
            <button
              type="button"
              :class="{ active: compileSelectorView === 'final' }"
              @click="compileSelectorView = 'final'"
            >
              Final selectors
            </button>
          </div>
        </header>

        <div class="selector-tools">
          <template v-if="compileSelectorInputMode === 'suggested'">
            <p class="mini-label">Selectors in this style</p>
            <div v-if="compileSelectorSuggestions.length > 0" class="pill-row">
              <button
                v-for="selector in compileSelectorSuggestions"
                :key="selector"
                type="button"
                class="pill selector-pill"
                :class="{ active: selector === compileSelectedSelector }"
                @click="chooseCompileSelector(selector)"
              >
                {{ selector }}
              </button>
            </div>
            <p v-else class="context-line">No selectors found in the current source yet.</p>
          </template>

          <label v-else class="editor-label compact">
            <span>Type a selector</span>
            <input v-model="compileManualSelector" class="text-input" type="text" />
          </label>

          <div class="selector-actions">
            <button
              v-if="compileSelectorInputMode === 'suggested'"
              type="button"
              class="ghost-button"
              @click="enableCompileCustomSelector()"
            >
              Type your own
            </button>
            <button
              v-else
              type="button"
              class="ghost-button"
              @click="useSuggestedCompileSelectors()"
            >
              Back to detected selectors
            </button>
          </div>
        </div>

        <p class="context-line">{{ compileSelectorSummary }}</p>

        <PaneCard
          v-if="compileScopedTraceResult.trace && compileSelectorView === 'trace'"
          :title="`Selector IR${compileInspectedSelector ? `: ${compileInspectedSelector}` : ''}`"
          :code="compileScopedTraceResult.traceText"
          :min-height="220"
          :max-height="340"
        />
        <PaneCard
          v-else-if="compileScopedTraceResult.trace"
          :title="`Selector output${compileInspectedSelector ? `: ${compileInspectedSelector}` : ''}`"
          :code="compileScopedTraceResult.trace.final.join(',\n')"
          language="css"
          :min-height="220"
          :max-height="340"
        />
        <PaneCard
          v-if="compileScopedTraceResult.error"
          title="Selector trace error"
          :code="compileScopedTraceResult.error"
        />
      </article>

      <article class="card stage stage-wide">
        <header class="stage-header">
          <div>
            <p class="section-kind">Step 3</p>
            <h2>Compiled output</h2>
            <p class="section-copy">The final CSS for the full source.</p>
          </div>
        </header>

        <PaneCard
          :title="compileResultTitle"
          :code="compileResultCode"
          :language="compileResultLanguage"
          :min-height="220"
          :max-height="300"
        />
      </article>
    </section>

    <section class="labs">
      <header class="section-header">
        <div>
          <p class="section-kind">Labs</p>
          <h2>Need a closer look?</h2>
          <p class="section-copy">
            Open one stage on its own when the walkthrough stops being enough.
          </p>
        </div>
      </header>

      <div class="labs-grid">
        <details class="card lab" open>
          <summary class="lab-summary">
            <div>
              <h3>Selector lab</h3>
              <p>
                Change inject mode and inspect a selector without the rest of the pipeline around
                it.
              </p>
            </div>
          </summary>

          <div class="lab-body">
            <label class="editor-label compact">
              <span>Example</span>
              <select
                class="text-input"
                :value="activeScopedCaseTitle"
                @change="applyScopedCase(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="item in scopedSelectorTraceCases" :key="item.title">
                  {{ item.title }}
                </option>
              </select>
            </label>

            <div class="segment">
              <button
                type="button"
                :class="{ active: selectorInjectMode === 'normal' }"
                @click="selectorInjectMode = 'normal'"
              >
                normal
              </button>
              <button
                type="button"
                :class="{ active: selectorInjectMode === 'slot' }"
                @click="selectorInjectMode = 'slot'"
              >
                slot
              </button>
              <button
                type="button"
                :class="{ active: selectorInjectMode === 'none' }"
                @click="selectorInjectMode = 'none'"
              >
                none
              </button>
            </div>

            <MonacoTextEditor v-model="selectorSource" language="css" :min-height="190" />

            <div class="lab-results">
              <PaneCard
                v-if="scopedTraceResult.trace"
                title="Trace"
                :code="scopedTraceResult.traceText"
                :min-height="240"
                :max-height="360"
              />
              <PaneCard
                v-if="scopedTraceResult.trace"
                title="Result"
                :code="scopedTraceResult.trace.final.join(',\n')"
                language="css"
                :min-height="180"
                :max-height="260"
              />
              <PaneCard
                v-if="scopedTraceResult.error"
                title="Trace error"
                :code="scopedTraceResult.error"
              />
            </div>
          </div>
        </details>

        <details class="card lab" open>
          <summary class="lab-summary">
            <div>
              <h3>Normalization lab</h3>
              <p>Inspect the nesting pass without the selector stage around it.</p>
            </div>
          </summary>

          <div class="lab-body">
            <label class="editor-label compact">
              <span>Example</span>
              <select
                class="text-input"
                :value="activeNestingCaseTitle"
                @change="applyNestingCase(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="item in nestingNormalizationTraceCases" :key="item.title">
                  {{ item.title }}
                </option>
              </select>
            </label>

            <MonacoTextEditor v-model="nestingSource" language="css" :min-height="210" />

            <details v-if="nestingLegend.length > 0" class="inline-help">
              <summary>What these markers mean</summary>
              <ul>
                <li v-for="item in nestingLegend" :key="item.label">
                  <span class="note-term">{{ item.label }}</span>
                  {{ item.detail }}
                </li>
              </ul>
            </details>

            <div class="lab-results">
              <PaneCard
                v-if="nestingTraceResult.trace"
                title="Normalized CSS"
                :code="nestingTraceResult.trace.normalizedCode"
                language="css"
                :min-height="180"
                :max-height="260"
              />
              <PaneCard
                v-if="nestingTraceResult.trace"
                title="Trace"
                :code="nestingTraceResult.traceText"
                :min-height="240"
                :max-height="360"
              />
              <PaneCard
                v-if="nestingTraceResult.error"
                title="Trace error"
                :code="nestingTraceResult.error"
              />
            </div>
          </div>
        </details>
      </div>
    </section>
  </main>
</template>

<style>
:root {
  color-scheme: light;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    "Segoe UI",
    sans-serif;
  background: #f4f4f1;
}

body {
  margin: 0;
  color: #1d2433;
}

#app {
  min-height: 100vh;
}

.page {
  width: min(1420px, calc(100% - 2.5rem));
  margin: 0 auto;
  padding: 2rem 0 3.25rem;
}

.hero {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.hero h1 {
  margin: 0;
  font-size: clamp(1.85rem, 2.5vw, 2.6rem);
  line-height: 1.02;
  font-weight: 650;
  letter-spacing: -0.03em;
  color: #141a27;
}

.lede {
  max-width: 72ch;
  margin: 0;
  color: #5e6572;
  line-height: 1.6;
  font-size: 1.02rem;
}

.card {
  display: grid;
  gap: 1rem;
  min-width: 0;
  padding: 1.2rem 1.25rem;
  border-radius: 12px;
  border: 1px solid rgba(34, 42, 57, 0.08);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: none;
}

.source-stage,
.labs {
  margin-bottom: 1.25rem;
}

.labs {
  margin-top: 2rem;
}

.section-header,
.stage-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 1rem;
}

.section-kind {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: #7b8190;
}

.section-header h2,
.stage-header h2 {
  margin: 0.3rem 0 0;
  font-size: 1.18rem;
  font-weight: 620;
  letter-spacing: -0.015em;
  color: #141a27;
}

.section-copy {
  margin: 0.35rem 0 0;
  color: #666d79;
  line-height: 1.55;
}

.walkthrough-grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
}

.stage-wide {
  grid-column: 1 / -1;
}

.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pill {
  border: 1px solid rgba(34, 42, 57, 0.1);
  border-radius: 999px;
  padding: 0.42rem 0.78rem;
  background: rgba(255, 255, 255, 0.7);
  color: #3f4756;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    color 140ms ease;
}

.pill.active {
  border-color: rgba(20, 26, 39, 0.18);
  background: #eceae2;
  color: #141a27;
}

.selector-pill {
  font-family: "SFMono-Regular", ui-monospace, monospace;
  font-size: 0.88rem;
}

.segment {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem;
  border-radius: 999px;
  background: rgba(31, 41, 55, 0.05);
}

.segment button {
  border: 0;
  border-radius: 999px;
  padding: 0.42rem 0.78rem;
  background: transparent;
  color: #5b6472;
  font: inherit;
  font-weight: 550;
  cursor: pointer;
}

.segment button.active {
  background: rgba(255, 255, 255, 0.92);
  color: #141a27;
}

.selector-tools {
  display: grid;
  gap: 0.75rem;
}

.mini-label {
  margin: 0;
  font-weight: 600;
  color: #4e5665;
}

.selector-actions {
  display: flex;
  justify-content: flex-start;
}

.ghost-button {
  border: 0;
  padding: 0;
  background: transparent;
  color: #515b6c;
  font: inherit;
  font-weight: 550;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(81, 91, 108, 0.25);
  text-underline-offset: 0.16em;
}

.editor-label {
  display: grid;
  gap: 0.45rem;
}

.editor-label span {
  font-weight: 600;
  color: #2c3444;
}

.editor-label.compact {
  max-width: 100%;
}

.text-input {
  min-width: 0;
  padding: 0.65rem 0.75rem;
  border-radius: 9px;
  border: 1px solid rgba(34, 42, 57, 0.1);
  background: rgba(255, 255, 255, 0.9);
  color: #1f2737;
  font: inherit;
}

.context-line {
  margin: 0;
  color: #666d79;
  line-height: 1.55;
}

.inline-help {
  display: grid;
  gap: 0.75rem;
  padding: 0.85rem 0.95rem;
  border-radius: 10px;
  border: 1px solid rgba(34, 42, 57, 0.08);
  background: rgba(250, 250, 248, 0.9);
}

.inline-help summary {
  cursor: pointer;
  font-weight: 600;
  color: #353d4c;
}

.inline-help ul {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding-left: 1.1rem;
  color: #5f6672;
}

.note-term {
  display: inline-block;
  margin-right: 0.35rem;
  font-family: "SFMono-Regular", ui-monospace, monospace;
  font-size: 0.87rem;
  color: #353d4c;
}

.labs-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  align-items: start;
}

.lab {
  align-content: start;
}

.lab-summary {
  cursor: pointer;
  list-style: none;
}

.lab-summary::-webkit-details-marker {
  display: none;
}

.lab-summary h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 620;
  color: #141a27;
}

.lab-summary p {
  margin: 0.3rem 0 0;
  color: #666d79;
  line-height: 1.55;
}

.lab-body {
  display: grid;
  gap: 1rem;
  padding-top: 0.15rem;
}

.lab-results {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (max-width: 1120px) {
  .walkthrough-grid,
  .lab-results {
    grid-template-columns: 1fr;
  }

  .section-header,
  .stage-header {
    flex-direction: column;
  }
}
</style>
