<script setup lang="ts">
import { computed } from "vue";
import { highlightCss } from "../highlight";

type CaseKind =
  | "likely-lightning-bug"
  | "correctness-win"
  | "needs-review"
  | "lightning-limit"
  | "shared-limit"
  | "agreement";

const props = defineProps<{
  title: string;
  note: string;
  source: string;
  kind: CaseKind;
  active?: boolean;
}>();

const emit = defineEmits<{
  open: [];
}>();

const kindLabel = computed(() => {
  switch (props.kind) {
    case "likely-lightning-bug":
      return "Likely compiler bug";
    case "correctness-win":
      return "Correctness win";
    case "needs-review":
      return "Needs review";
    case "lightning-limit":
      return "Known compiler limit";
    case "shared-limit":
      return "Shared limit";
    default:
      return "Agreement";
  }
});

const highlighted = computed(() => highlightCss(props.source));
</script>

<template>
  <button class="case-card" :class="[kind, { active }]" type="button" @click="emit('open')">
    <header class="case-head">
      <span class="case-kind">{{ kindLabel }}</span>
      <span class="case-action" :class="{ active }">
        {{ active ? "Loaded below" : "Open below" }}
        <span aria-hidden="true">↘</span>
      </span>
    </header>

    <div class="case-copy">
      <h4>{{ title }}</h4>
      <p>{{ note }}</p>
    </div>

    <pre class="language-css"><code v-html="highlighted" /></pre>
  </button>
</template>

<style scoped>
.case-card {
  appearance: none;
  display: grid;
  gap: 0.85rem;
  width: 100%;
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid var(--lv-agreement-border);
  background: var(--lv-agreement-surface-top);
  box-shadow: var(--lv-shadow-soft);
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    border-color 120ms ease;
}

.case-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--lv-shadow-strong);
}

.case-card:focus-visible {
  outline: none;
  border-color: var(--lv-interactive);
  box-shadow:
    0 0 0 3px oklch(0.95 0.03 238 / 0.9),
    var(--lv-shadow-strong);
}

.case-card.likely-lightning-bug {
  border-color: var(--lv-bug-border);
  background: var(--lv-bug-surface-top);
}

.case-card.correctness-win {
  border-color: var(--lv-win-border);
  background: var(--lv-win-surface-top);
}

.case-card.needs-review {
  border-color: var(--lv-review-border);
  background: var(--lv-review-surface-top);
}

.case-card.lightning-limit,
.case-card.shared-limit {
  border-color: var(--lv-limit-border);
  background: var(--lv-limit-surface-top);
}

.case-card.agreement {
  border-color: var(--lv-agreement-border);
  background: var(--lv-agreement-surface-top);
}

.case-card.active {
  border-color: var(--lv-interactive);
  box-shadow:
    0 0 0 2px oklch(0.95 0.03 238 / 0.7),
    var(--lv-shadow-strong);
}

.case-head {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 0.8rem;
}

.case-kind {
  display: inline-flex;
  align-items: center;
  padding: 0.32rem 0.6rem;
  border-radius: 999px;
  background: var(--lv-agreement-chip-bg);
  color: var(--lv-agreement-chip-text);
  font-size: 0.76rem;
  font-weight: 500;
}

.likely-lightning-bug .case-kind {
  background: var(--lv-bug-chip-bg);
  color: var(--lv-bug-chip-text);
}

.correctness-win .case-kind {
  background: var(--lv-win-chip-bg);
  color: var(--lv-win-chip-text);
}

.needs-review .case-kind {
  background: var(--lv-review-chip-bg);
  color: var(--lv-review-chip-text);
}

.lightning-limit .case-kind,
.shared-limit .case-kind {
  background: var(--lv-limit-chip-bg);
  color: var(--lv-limit-chip-text);
}

.agreement .case-kind {
  background: var(--lv-agreement-chip-bg);
  color: var(--lv-agreement-chip-text);
}

.case-action {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  color: var(--lv-interactive);
  font-size: 0.82rem;
  font-weight: 500;
}

.case-action.active {
  color: var(--lv-interactive);
}

.case-copy {
  display: grid;
  gap: 0.3rem;
}

.case-copy h4 {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 1.06rem;
  letter-spacing: -0.02em;
  color: var(--lv-text-strong);
  line-height: 1.18;
  font-weight: 600;
}

.case-copy p {
  margin: 0;
  color: var(--lv-text-body);
  font-size: 0.93rem;
  line-height: 1.46;
}

pre {
  overflow: auto;
  margin: 0;
  padding: 0.9rem;
  border-radius: 10px;
  border: 1px solid var(--lv-border-soft);
  background: var(--lv-surface-code);
  font-size: 0.84rem;
  line-height: 1.55;
  max-height: 210px;
}

:deep(code) {
  font-family: var(--font-mono);
}
</style>
