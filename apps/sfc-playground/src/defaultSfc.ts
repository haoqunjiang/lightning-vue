export const defaultSfc = `<script setup>
import { computed, ref } from 'vue'

const toneName = ref('sunrise')
const count = ref(2)
const badge = computed(() => \`\${count.value} styles compiled\`)
const tone = computed(() => {
  switch (toneName.value) {
    case 'mint':
      return 'linear-gradient(135deg, #0b8f77, #7de8c7)'
    case 'nightfall':
      return 'linear-gradient(135deg, #243b6b, #7f5af0)'
    default:
      return 'linear-gradient(135deg, #ff7a59, #ffd267)'
  }
})
</script>

<template>
  <section class="demo-shell">
    <header class="hero">
      <p class="eyebrow">Scoped style playground</p>
      <h1>Lightning CSS is compiling this panel live.</h1>
      <button class="cta" @click="count++">Increment: {{ count }}</button>
      <span class="badge">{{ badge }}</span>
    </header>

    <div class="grid">
      <article class="card">
        <strong>Nested scoped rules</strong>
        <p>The glow, spacing, and hover treatment come from nested rules.</p>
      </article>

      <article class="card accent">
        <strong>Local keyframes</strong>
        <p>The pulse animation is defined in this same &lt;style scoped&gt; block.</p>
      </article>
    </div>

    <div class="toolbar">
      <label>
        Theme tone
        <select v-model="toneName">
          <option value="sunrise">Sunrise</option>
          <option value="mint">Mint</option>
          <option value="nightfall">Nightfall</option>
        </select>
      </label>
    </div>
  </section>
</template>

<style scoped>
.demo-shell {
  --surface: color-mix(in srgb, white 84%, transparent);

  padding: 1.5rem;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, white 26%, transparent), transparent 40%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.76));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 26px 60px rgba(15, 23, 42, 0.12);

  .hero {
    display: grid;
    gap: 0.65rem;
    margin-bottom: 1.5rem;
  }

  .eyebrow {
    margin: 0;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-size: 0.75rem;
    color: #5f6c8d;
  }

  h1 {
    margin: 0;
    max-width: 12ch;
    font-size: clamp(2rem, 4vw, 3.2rem);
    line-height: 0.96;
    color: #16213e;
  }

  .cta {
    width: fit-content;
    padding: 0.8rem 1.1rem;
    border: 0;
    border-radius: 999px;
    font-weight: 700;
    color: white;
    background-image: v-bind(tone);
    box-shadow: 0 14px 30px rgba(36, 59, 107, 0.25);
    cursor: pointer;
  }

  .badge {
    width: fit-content;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.72);
    color: #32405f;
    font-weight: 600;
  }

  .grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .card {
    display: grid;
    gap: 0.35rem;
    padding: 1rem;
    border-radius: 22px;
    background: var(--surface);
    border: 1px solid rgba(96, 106, 156, 0.12);
    transition:
      transform 160ms ease,
      box-shadow 160ms ease;

    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 18px 32px rgba(36, 59, 107, 0.1);
    }

    &.accent {
      animation: spotlight 2.4s ease-in-out infinite;
    }

    strong {
      color: #152142;
    }

    p {
      margin: 0;
      color: #45506f;
    }
  }

  .toolbar {
    margin-top: 1.4rem;

    select {
      margin-left: 0.65rem;
      padding: 0.35rem 0.55rem;
      border-radius: 10px;
      border: 1px solid rgba(96, 106, 156, 0.26);
    }
  }
}

@keyframes spotlight {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(76, 110, 245, 0);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(76, 110, 245, 0.12);
  }
}
</style>
`;
