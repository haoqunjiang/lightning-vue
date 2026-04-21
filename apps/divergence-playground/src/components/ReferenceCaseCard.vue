<script setup lang="ts">
import { computed } from "vue";
import { highlightCss } from "../highlight";

type CaseKind =
  | "likely-lightning-bug"
  | "likely-postcss-bug"
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
      return "Likely Lightning issue";
    case "likely-postcss-bug":
      return "Likely Vue compiler issue";
    case "needs-review":
      return "Needs review";
    case "lightning-limit":
      return "Known Lightning limit";
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
  border-radius: 20px;
  border: 1px solid rgba(200, 208, 223, 0.92);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 14px 32px rgba(30, 41, 59, 0.035);
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
  box-shadow: 0 18px 36px rgba(30, 41, 59, 0.055);
}

.case-card:focus-visible {
  outline: none;
  border-color: rgba(69, 111, 186, 0.64);
  box-shadow:
    0 0 0 3px rgba(74, 112, 171, 0.18),
    0 18px 36px rgba(30, 41, 59, 0.055);
}

.case-card.likely-lightning-bug {
  border-color: rgba(193, 102, 64, 0.36);
  background: linear-gradient(180deg, rgba(255, 247, 243, 0.98), rgba(255, 251, 249, 0.94));
}

.case-card.likely-postcss-bug {
  border-color: rgba(75, 113, 181, 0.34);
  background: linear-gradient(180deg, rgba(244, 248, 255, 0.98), rgba(249, 251, 255, 0.94));
}

.case-card.needs-review {
  border-color: rgba(184, 132, 42, 0.34);
  background: linear-gradient(180deg, rgba(255, 249, 239, 0.98), rgba(255, 252, 247, 0.95));
}

.case-card.lightning-limit,
.case-card.shared-limit {
  border-color: rgba(112, 97, 157, 0.32);
  background: linear-gradient(180deg, rgba(247, 244, 255, 0.98), rgba(251, 249, 255, 0.95));
}

.case-card.agreement {
  border-color: rgba(68, 140, 129, 0.32);
  background: linear-gradient(180deg, rgba(242, 251, 248, 0.98), rgba(248, 252, 251, 0.95));
}

.case-card.active {
  border-color: rgba(69, 111, 186, 0.56);
  box-shadow:
    0 0 0 2px rgba(74, 112, 171, 0.12),
    0 18px 36px rgba(30, 41, 59, 0.055);
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
  background: rgba(68, 82, 109, 0.07);
  color: #5a6780;
  font-size: 0.76rem;
  font-weight: 500;
}

.likely-lightning-bug .case-kind {
  background: rgba(193, 102, 64, 0.1);
  color: #9c4f2a;
}

.likely-postcss-bug .case-kind {
  background: rgba(75, 113, 181, 0.1);
  color: #355d99;
}

.needs-review .case-kind {
  background: rgba(184, 132, 42, 0.12);
  color: #8b6116;
}

.lightning-limit .case-kind,
.shared-limit .case-kind {
  background: rgba(112, 97, 157, 0.1);
  color: #5f4f8b;
}

.agreement .case-kind {
  background: rgba(68, 140, 129, 0.11);
  color: #2d6f64;
}

.case-action {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  color: #2d568f;
  font-size: 0.82rem;
  font-weight: 500;
}

.case-action.active {
  color: #1e4f92;
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
  color: #17233a;
  line-height: 1.18;
  font-weight: 600;
}

.case-copy p {
  margin: 0;
  color: #5d6a80;
  line-height: 1.48;
}

pre {
  overflow: auto;
  margin: 0;
  padding: 0.9rem;
  border-radius: 14px;
  border: 1px solid rgba(218, 223, 234, 0.92);
  background: #fbfcfe;
  font-size: 0.84rem;
  line-height: 1.55;
  max-height: 210px;
}

:deep(code) {
  font-family: var(--font-mono);
}
</style>
