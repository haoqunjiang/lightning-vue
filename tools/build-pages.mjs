import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.resolve(repoRoot, "dist/pages");

const playgrounds = [
  {
    filter: "sfc-playground",
    slug: "sfc",
    title: "SFC Playground",
    summary: "Interactive Vue SFC REPL powered by @lightning-vue/compiler.",
  },
  {
    filter: "divergence-playground",
    slug: "divergence",
    title: "Divergence Playground",
    summary: "Reference gallery and live comparison against the Vue compiler path.",
  },
  {
    filter: "ir-playground",
    slug: "ir",
    title: "IR Playground",
    summary: "Trace nested normalization and scoped selector phases end to end.",
  },
];

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });

for (const playground of playgrounds) {
  execFileSync("pnpm", ["--filter", playground.filter, "build"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      LV_APP_BASE: `/${playground.slug}/`,
      LV_APP_OUT_DIR: path.join(outputRoot, playground.slug),
    },
    stdio: "inherit",
  });
}

fs.writeFileSync(path.join(outputRoot, "index.html"), renderIndex(playgrounds));
fs.writeFileSync(
  path.join(outputRoot, "_redirects"),
  playgrounds.map((playground) => `/${playground.slug} /${playground.slug}/ 308`).join("\n") + "\n",
);

function renderIndex(entries) {
  const cards = entries
    .map(
      (entry) => `
        <a class="card" href="/${entry.slug}/">
          <span class="eyebrow">/${entry.slug}</span>
          <h2>${entry.title}</h2>
          <p>${entry.summary}</p>
        </a>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lightning Vue Playgrounds</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: oklch(0.985 0.003 220);
        color: oklch(0.28 0.03 250);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      main {
        width: min(1100px, calc(100% - clamp(2rem, 6vw, 6rem)));
        margin: 0 auto;
        padding: clamp(3rem, 7vw, 6rem) 0;
      }

      header {
        display: grid;
        gap: 0.75rem;
        margin-bottom: 2rem;
      }

      .eyebrow {
        font-size: 0.75rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: oklch(0.56 0.08 210);
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 5vw, 3.4rem);
        line-height: 0.96;
      }

      .lede {
        margin: 0;
        max-width: 62ch;
        font-size: 1rem;
        line-height: 1.6;
        color: oklch(0.44 0.03 240);
      }

      .grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }

      .card {
        display: grid;
        gap: 0.5rem;
        padding: 1.25rem 1.3rem;
        text-decoration: none;
        color: inherit;
        background: oklch(0.995 0.002 220);
        border: 1px solid oklch(0.9 0.01 240);
        border-radius: 16px;
        box-shadow: 0 18px 40px oklch(0.55 0.02 240 / 0.07);
        transition:
          transform 120ms ease,
          border-color 120ms ease,
          box-shadow 120ms ease;
      }

      .card:hover {
        transform: translateY(-1px);
        border-color: oklch(0.76 0.05 210);
        box-shadow: 0 22px 44px oklch(0.55 0.03 240 / 0.11);
      }

      .card .eyebrow {
        color: oklch(0.5 0.09 205);
      }

      h2 {
        margin: 0;
        font-size: 1.1rem;
      }

      .card p {
        margin: 0;
        line-height: 1.55;
        color: oklch(0.43 0.025 240);
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <span class="eyebrow">lightning-vue</span>
        <h1>Playgrounds</h1>
        <p class="lede">Three focused tools for trying the compiler, comparing behavior, and inspecting the style rewrite pipeline.</p>
      </header>
      <section class="grid">
        ${cards}
      </section>
    </main>
  </body>
</html>`;
}
