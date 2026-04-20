<script setup lang="ts">
import { ref } from "vue";
import SourceToggle from "./SourceToggle.vue";

const accent = ref("#ff8a50");

defineProps<{
  source: string;
}>();
</script>

<template>
  <section class="demo card">
    <header>
      <p class="eyebrow">Common scoped patterns</p>
      <h2>These should all look intentional and local.</h2>
    </header>

    <div class="controls">
      <label>
        Accent
        <input v-model="accent" type="color" />
      </label>
      <span class="badge">v-bind() drives the underline color</span>
    </div>

    <div class="grid">
      <article class="tile">
        <strong>Local scoping</strong>
        <p>No other card in the page should pick up this specific underline.</p>
      </article>
      <article class="tile pulse">
        <strong>Local keyframes</strong>
        <p>This tile pulses using a keyframe defined in the same scoped block.</p>
      </article>
    </div>

    <SourceToggle :source="source" />
  </section>
</template>

<style scoped>
.demo {
  --accent: v-bind(accent);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;

  label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  input {
    width: 2.2rem;
    height: 2.2rem;
    border: 0;
    padding: 0;
    background: transparent;
  }
}

.badge {
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: #3d4a6b;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.9rem;
}

.tile {
  padding: 1rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(91, 104, 166, 0.14);

  strong {
    display: block;
    margin-bottom: 0.35rem;
    color: #182443;
    text-decoration: underline;
    text-decoration-thickness: 3px;
    text-decoration-color: var(--accent);
    text-underline-offset: 0.3em;
  }

  p {
    margin: 0;
    color: #4c5878;
  }

  &.pulse {
    animation: var(--demoPulse, tile-pulse) 2s ease-in-out infinite;
  }
}

@keyframes tile-pulse {
  0%,
  100% {
    transform: translateY(0);
    box-shadow: 0 0 0 rgba(255, 138, 80, 0);
  }
  50% {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(255, 138, 80, 0.18);
  }
}
</style>
